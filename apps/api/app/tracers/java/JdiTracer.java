package com.codevisionai.tracer;

import com.sun.jdi.AbsentInformationException;
import com.sun.jdi.ArrayReference;
import com.sun.jdi.BooleanValue;
import com.sun.jdi.Bootstrap;
import com.sun.jdi.ByteValue;
import com.sun.jdi.CharValue;
import com.sun.jdi.DoubleValue;
import com.sun.jdi.Field;
import com.sun.jdi.FloatValue;
import com.sun.jdi.IntegerValue;
import com.sun.jdi.LocalVariable;
import com.sun.jdi.Location;
import com.sun.jdi.LongValue;
import com.sun.jdi.ObjectReference;
import com.sun.jdi.ShortValue;
import com.sun.jdi.StackFrame;
import com.sun.jdi.StringReference;
import com.sun.jdi.ThreadReference;
import com.sun.jdi.VMDisconnectedException;
import com.sun.jdi.Value;
import com.sun.jdi.VirtualMachine;
import com.sun.jdi.connect.Connector;
import com.sun.jdi.connect.LaunchingConnector;
import com.sun.jdi.event.ClassPrepareEvent;
import com.sun.jdi.event.Event;
import com.sun.jdi.event.EventQueue;
import com.sun.jdi.event.EventSet;
import com.sun.jdi.event.StepEvent;
import com.sun.jdi.event.VMDeathEvent;
import com.sun.jdi.event.VMDisconnectEvent;
import com.sun.jdi.event.VMStartEvent;
import com.sun.jdi.request.ClassPrepareRequest;
import com.sun.jdi.request.EventRequest;
import com.sun.jdi.request.EventRequestManager;
import com.sun.jdi.request.StepRequest;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * JDI client that launches a user-supplied target class under a fresh JVM,
 * walks its execution one line at a time, and emits NDJSON EngineEvent lines
 * on stdout. The Python driver in java_tracer.py relays those lines verbatim
 * as Pydantic events so the wire format matches what the Pyodide worker
 * produces in-browser.
 *
 * Step events are filtered to the target's main class (single-file MVP),
 * matching how the Python tracer only reports user-frame lines.
 */
public final class JdiTracer {

    private static final PrintStream OUT = System.out;
    private static final int DEFAULT_STEP_BUDGET = 2000;
    private static final int MAX_HEAP_OBJECTS = 256;
    private static final int MAX_FIELDS_PER_OBJECT = 32;
    private static final int MAX_ARRAY_ELEMENTS = 50;
    private static final int MAX_OBJECT_DEPTH = 3;

    private static long stepCounter = 0;

    /**
     * Fully-qualified name of the class the user wrote. Frames outside it (the
     * MainLauncher bootstrap, reflective invoke plumbing, and the JVM's own
     * thread entry) are suppressed so the reported depth is the depth the
     * learner actually wrote — matching how the Python tracer keeps only
     * '<string>' frames and the native tracer keeps only user-file frames.
     */
    private static String userClass = "";

    public static void main(String[] rawArgs) {
        if (rawArgs.length < 2) {
            emitError("Usage: JdiTracer <target-main-class> <target-classpath> [<step-budget>]");
            emitDone();
            return;
        }
        final String targetMain = rawArgs[0];
        final String targetClasspath = rawArgs[1];
        userClass = targetMain;
        final int stepBudget = parseBudget(rawArgs.length >= 3 ? rawArgs[2] : null);

        VirtualMachine vm;
        try {
            vm = launchTargetVm(targetMain, targetClasspath);
        } catch (Throwable t) {
            emitError("Failed to launch target VM: " + t.getMessage());
            emitDone();
            return;
        }

        // Relay this JVM's stdin into the target JVM's stdin so the Python
        // driver can deliver pre-supplied AND interactive input through a
        // single pipe. The relay thread is daemon so it terminates with us.
        Thread inputRelay = startInputRelay(vm.process().getOutputStream());

        Thread outForwarder = startStreamForwarder(vm.process().getInputStream(), false);
        Thread errForwarder = startStreamForwarderFilter(vm.process().getErrorStream());

        EventRequestManager mgr = vm.eventRequestManager();
        ClassPrepareRequest cpr = mgr.createClassPrepareRequest();
        cpr.addClassFilter(targetMain);
        cpr.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
        cpr.enable();

        emitReady();
        vm.resume();

        boolean done = false;
        boolean budgetExceeded = false;
        EventQueue queue = vm.eventQueue();
        try {
            outer:
            while (!done) {
                EventSet set = queue.remove();
                for (Event ev : set) {
                    if (ev instanceof VMStartEvent) {
                        continue;
                    }
                    if (ev instanceof ClassPrepareEvent) {
                        ClassPrepareEvent cpe = (ClassPrepareEvent) ev;
                        installStepRequest(mgr, cpe.thread(), targetMain);
                        continue;
                    }
                    if (ev instanceof StepEvent) {
                        StepEvent se = (StepEvent) ev;
                        try {
                            emitStep(se);
                        } catch (Throwable t) {
                            emitError("step serialize failed: "
                                    + t.getClass().getSimpleName() + ": " + t.getMessage());
                        }
                        stepCounter++;
                        if (stepCounter >= stepBudget) {
                            budgetExceeded = true;
                            done = true;
                            break outer;
                        }
                        continue;
                    }
                    if (ev instanceof VMDeathEvent || ev instanceof VMDisconnectEvent) {
                        done = true;
                    }
                }
                if (!done) {
                    set.resume();
                }
            }
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        } catch (VMDisconnectedException ignored) {
            // Target VM died — happens normally at end of program.
        }

        if (budgetExceeded) {
            emitError("Step budget of " + stepBudget + " exceeded");
            try {
                vm.exit(0);
            } catch (Throwable ignored2) {
                // VM already disconnected — nothing to do.
            }
        }

        joinQuietly(outForwarder);
        joinQuietly(errForwarder);

        emitDone();
    }

    // ─── connector ────────────────────────────────────────────────────

    private static VirtualMachine launchTargetVm(String mainClass, String classpath) throws Exception {
        LaunchingConnector connector = Bootstrap.virtualMachineManager().defaultConnector();
        Map<String, Connector.Argument> args = connector.defaultArguments();
        if (args.containsKey("quote")) {
            args.get("quote").setValue("\"");
        }
        // Hand the target JVM to MainLauncher (our bootstrap that installs
        // CvaiInputStream) instead of running the user's class directly.
        // The bootstrap then reflects into the user's main with no args.
        args.get("main").setValue(MainLauncher.class.getName() + " " + mainClass);
        String tracerCp = System.getProperty("java.class.path", "");
        String combinedCp = classpath
                + (tracerCp.isEmpty() ? "" : (java.io.File.pathSeparator + tracerCp));
        args.get("options").setValue("-cp \"" + combinedCp + "\"");
        if (args.containsKey("suspend")) {
            args.get("suspend").setValue("true");
        }
        return connector.launch(args);
    }

    private static void installStepRequest(EventRequestManager mgr, ThreadReference thread, String classFilter) {
        StepRequest sr = mgr.createStepRequest(thread, StepRequest.STEP_LINE, StepRequest.STEP_INTO);
        sr.addClassFilter(classFilter);
        sr.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
        sr.enable();
    }

    /**
     * Relay this tracer JVM's stdin straight into the target JVM's stdin.
     * Python's java_tracer writes both pre-supplied input and interactive
     * INPUT_REQUEST responses to our stdin; we just forward bytes through.
     * Closing the target's stdin when our stdin closes signals EOF cleanly.
     */
    private static Thread startInputRelay(OutputStream targetStdin) {
        Thread t = new Thread(() -> {
            byte[] buf = new byte[4096];
            try {
                int n;
                while ((n = System.in.read(buf)) > 0) {
                    targetStdin.write(buf, 0, n);
                    targetStdin.flush();
                }
            } catch (IOException ignored) {
                // Target process closed stdin; nothing we can do.
            } finally {
                try {
                    targetStdin.close();
                } catch (IOException ignored) {
                    // already closed
                }
            }
        }, "stdin-relay");
        t.setDaemon(true);
        t.start();
        return t;
    }

    /**
     * Forward the target JVM's stderr, but watch for the
     * {@link CvaiInputStream#SENTINEL} marker. When the marker appears on
     * its own line, emit an INPUT_REQUEST EngineEvent instead of forwarding
     * those bytes as OUTPUT — so users never see the sentinel in the UI.
     */
    private static Thread startStreamForwarderFilter(InputStream in) {
        Thread t = new Thread(() -> {
            try (BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) {
                    if (CvaiInputStream.SENTINEL.equals(line)) {
                        emitInputRequest();
                        continue;
                    }
                    emitOutput(line + "\n");
                }
            } catch (IOException ignored) {
                // stream closed
            }
        }, "target-stderr");
        t.setDaemon(true);
        t.start();
        return t;
    }

    private static int parseBudget(String raw) {
        if (raw == null) {
            return DEFAULT_STEP_BUDGET;
        }
        try {
            int n = Integer.parseInt(raw);
            return n > 0 ? n : DEFAULT_STEP_BUDGET;
        } catch (NumberFormatException e) {
            return DEFAULT_STEP_BUDGET;
        }
    }

    // ─── step serialization ───────────────────────────────────────────

    private static void emitStep(StepEvent se) throws Exception {
        ThreadReference thread = se.thread();
        Location loc = se.location();
        int line = loc.lineNumber();

        // id -> serialized HeapObject JSON. Populated as we walk frames.
        Map<Long, String> heapObjects = new LinkedHashMap<>();

        StringBuilder json = new StringBuilder(512);
        json.append("{\"type\":\"STEP\",\"state\":{");
        json.append("\"step\":").append(stepCounter).append(',');
        json.append("\"line\":").append(line).append(',');
        json.append("\"event\":\"line\",");
        json.append("\"description\":")
                .append(jsonString("Line " + line + " (" + loc.method().name() + ")"))
                .append(',');

        json.append("\"frames\":[");
        // Keep only the user's own frames; the launcher/reflection/JVM entry
        // frames below them are noise that made every stack look 5 deeper
        // than the program really was.
        List<StackFrame> userFrames = new ArrayList<>();
        for (StackFrame f : thread.frames()) {
            if (isUserFrame(f)) {
                userFrames.add(f);
            }
        }
        // JDI returns innermost frame at index 0. The project's wire format
        // (matching the Python tracer) puts innermost last, so walk in reverse.
        boolean firstFrame = true;
        for (int i = userFrames.size() - 1; i >= 0; i--) {
            if (!firstFrame) {
                json.append(',');
            }
            firstFrame = false;
            // `main` is Java's module-level equivalent — flag it as the global
            // frame only when it is genuinely outermost.
            boolean isGlobal = (i == userFrames.size() - 1)
                    && "main".equals(userFrames.get(i).location().method().name());
            json.append(serializeFrame(userFrames.get(i), heapObjects, isGlobal));
        }
        json.append("],");

        json.append("\"heap\":{");
        boolean firstHeap = true;
        for (Map.Entry<Long, String> e : heapObjects.entrySet()) {
            if (!firstHeap) {
                json.append(',');
            }
            firstHeap = false;
            json.append('"').append(e.getKey()).append("\":").append(e.getValue());
        }
        json.append("},");

        json.append("\"stdout\":\"\",");
        json.append("\"changedVars\":[]");
        json.append("}}");

        emit(json.toString());
    }

    /** True when the frame belongs to the user's class or one of its nested classes. */
    private static boolean isUserFrame(StackFrame frame) {
        try {
            String declaring = frame.location().declaringType().name();
            return declaring.equals(userClass) || declaring.startsWith(userClass + "$");
        } catch (Throwable t) {
            return false;
        }
    }

    private static String serializeFrame(StackFrame frame, Map<Long, String> heapObjects,
                                         boolean isGlobal) {
        StringBuilder b = new StringBuilder(128);
        b.append('{');
        b.append("\"name\":").append(jsonString(frame.location().method().name())).append(',');
        b.append("\"line\":").append(frame.location().lineNumber()).append(',');
        b.append("\"isGlobal\":").append(isGlobal).append(',');
        b.append("\"locals\":{");
        boolean first = true;
        try {
            List<LocalVariable> vars = frame.visibleVariables();
            for (LocalVariable lv : vars) {
                Value v;
                try {
                    v = frame.getValue(lv);
                } catch (Throwable t) {
                    continue;
                }
                if (!first) {
                    b.append(',');
                }
                first = false;
                b.append(jsonString(lv.name())).append(':').append(serializeStackValue(v, heapObjects, 0));
            }
        } catch (AbsentInformationException ignored) {
            // class wasn't compiled with -g; we have no locals to expose.
        }
        b.append("}}");
        return b.toString();
    }

    private static String serializeStackValue(Value v, Map<Long, String> heapObjects, int depth) {
        if (v == null) {
            return "{\"kind\":\"primitive\",\"type\":\"None\",\"value\":null}";
        }
        if (v instanceof IntegerValue) {
            return "{\"kind\":\"primitive\",\"type\":\"int\",\"value\":" + ((IntegerValue) v).value() + "}";
        }
        if (v instanceof LongValue) {
            return "{\"kind\":\"primitive\",\"type\":\"int\",\"value\":" + ((LongValue) v).value() + "}";
        }
        if (v instanceof ShortValue) {
            return "{\"kind\":\"primitive\",\"type\":\"int\",\"value\":" + ((ShortValue) v).value() + "}";
        }
        if (v instanceof ByteValue) {
            return "{\"kind\":\"primitive\",\"type\":\"int\",\"value\":" + ((ByteValue) v).value() + "}";
        }
        if (v instanceof FloatValue) {
            float f = ((FloatValue) v).value();
            String s = (Float.isNaN(f) || Float.isInfinite(f)) ? "0" : Float.toString(f);
            return "{\"kind\":\"primitive\",\"type\":\"float\",\"value\":" + s + "}";
        }
        if (v instanceof DoubleValue) {
            double d = ((DoubleValue) v).value();
            String s = (Double.isNaN(d) || Double.isInfinite(d)) ? "0" : Double.toString(d);
            return "{\"kind\":\"primitive\",\"type\":\"float\",\"value\":" + s + "}";
        }
        if (v instanceof BooleanValue) {
            return "{\"kind\":\"primitive\",\"type\":\"bool\",\"value\":"
                    + ((BooleanValue) v).value() + "}";
        }
        if (v instanceof CharValue) {
            return "{\"kind\":\"primitive\",\"type\":\"str\",\"value\":"
                    + jsonString(String.valueOf(((CharValue) v).value())) + "}";
        }
        if (v instanceof StringReference) {
            return "{\"kind\":\"primitive\",\"type\":\"str\",\"value\":"
                    + jsonString(((StringReference) v).value()) + "}";
        }
        if (v instanceof ObjectReference) {
            ObjectReference oref = (ObjectReference) v;
            long id = oref.uniqueID();
            if (!heapObjects.containsKey(id) && depth < MAX_OBJECT_DEPTH
                    && heapObjects.size() < MAX_HEAP_OBJECTS) {
                // Insert placeholder first so cycles terminate at the back-edge.
                heapObjects.put(id, "null");
                String serialized;
                try {
                    serialized = serializeHeapObject(oref, id, heapObjects, depth);
                } catch (Throwable t) {
                    serialized = "{\"type\":\"instance\",\"id\":" + id
                            + ",\"className\":\"?\",\"attrs\":{}}";
                }
                heapObjects.put(id, serialized);
            }
            return "{\"kind\":\"ref\",\"id\":" + id + "}";
        }
        return "{\"kind\":\"primitive\",\"type\":\"None\",\"value\":null}";
    }

    private static String serializeHeapObject(ObjectReference oref, long id,
                                              Map<Long, String> heapObjects, int depth) {
        StringBuilder b = new StringBuilder(128);
        if (oref instanceof ArrayReference) {
            ArrayReference arr = (ArrayReference) oref;
            int total = arr.length();
            int len = Math.min(total, MAX_ARRAY_ELEMENTS);
            b.append("{\"type\":\"list\",\"id\":").append(id).append(",\"elements\":[");
            for (int i = 0; i < len; i++) {
                if (i > 0) {
                    b.append(',');
                }
                Value el;
                try {
                    el = arr.getValue(i);
                } catch (Throwable t) {
                    el = null;
                }
                b.append(serializeStackValue(el, heapObjects, depth + 1));
            }
            b.append("]}");
            return b.toString();
        }
        String typeName = oref.referenceType().name();
        b.append("{\"type\":\"instance\",\"id\":").append(id).append(',');
        b.append("\"className\":").append(jsonString(simpleName(typeName))).append(',');
        b.append("\"attrs\":{");
        try {
            List<Field> fields = oref.referenceType().fields();
            Map<Field, Value> values = oref.getValues(fields);
            int count = 0;
            boolean first = true;
            for (Map.Entry<Field, Value> e : values.entrySet()) {
                Field f = e.getKey();
                if (f.isStatic()) {
                    continue;
                }
                if (count >= MAX_FIELDS_PER_OBJECT) {
                    break;
                }
                if (!first) {
                    b.append(',');
                }
                first = false;
                b.append(jsonString(f.name())).append(':');
                b.append(serializeStackValue(e.getValue(), heapObjects, depth + 1));
                count++;
            }
        } catch (Throwable ignored) {
            // Some VM states reject getValues — surface an empty body rather
            // than crashing the whole step.
        }
        b.append("}}");
        return b.toString();
    }

    private static String simpleName(String fqn) {
        if (fqn == null) {
            return "?";
        }
        int idx = fqn.lastIndexOf('.');
        return idx >= 0 ? fqn.substring(idx + 1) : fqn;
    }

    // ─── target output forwarding ─────────────────────────────────────

    private static Thread startStreamForwarder(InputStream in, boolean isErr) {
        Thread t = new Thread(() -> {
            try (BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                char[] buf = new char[2048];
                int n;
                while ((n = r.read(buf)) >= 0) {
                    if (n == 0) {
                        continue;
                    }
                    emitOutput(new String(buf, 0, n));
                }
            } catch (IOException ignored) {
                // Target stream closed; nothing useful to report.
            }
        }, isErr ? "target-stderr" : "target-stdout");
        t.setDaemon(true);
        t.start();
        return t;
    }

    private static void joinQuietly(Thread t) {
        try {
            t.join(2000L);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    // ─── NDJSON emit ──────────────────────────────────────────────────

    private static synchronized void emit(String json) {
        OUT.println(json);
        OUT.flush();
    }

    private static void emitReady() {
        emit("{\"type\":\"READY\"}");
    }

    private static void emitDone() {
        emit("{\"type\":\"DONE\"}");
    }

    private static void emitError(String message) {
        emit("{\"type\":\"ERROR\",\"message\":" + jsonString(message) + "}");
    }

    private static void emitOutput(String value) {
        emit("{\"type\":\"OUTPUT\",\"value\":" + jsonString(value) + "}");
    }

    /** sessionId is filled in by the Python driver before re-emitting. */
    private static void emitInputRequest() {
        emit("{\"type\":\"INPUT_REQUEST\",\"prompt\":\"\",\"sessionId\":\"\"}");
    }

    private static String jsonString(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder b = new StringBuilder(s.length() + 8);
        b.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':
                    b.append("\\\"");
                    break;
                case '\\':
                    b.append("\\\\");
                    break;
                case '\n':
                    b.append("\\n");
                    break;
                case '\r':
                    b.append("\\r");
                    break;
                case '\t':
                    b.append("\\t");
                    break;
                case '\b':
                    b.append("\\b");
                    break;
                case '\f':
                    b.append("\\f");
                    break;
                default:
                    if (c < 0x20) {
                        b.append(String.format("\\u%04x", (int) c));
                    } else {
                        b.append(c);
                    }
            }
        }
        b.append('"');
        return b.toString();
    }
}
