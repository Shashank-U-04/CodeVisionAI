package com.codevisionai.tracer;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;

/**
 * Wraps the JVM's stdin so the tracer can pause the program when user code
 * asks for input that hasn't arrived yet. Before any read() that would
 * block (the underlying stream reports 0 available bytes), it prints a
 * single-line sentinel to {@link PrintStream signal}. JdiTracer watches
 * stderr for that sentinel, emits an INPUT_REQUEST EngineEvent, and the
 * Python side drives the SSE handshake; once the value is delivered, the
 * underlying stream unblocks naturally and the read returns.
 *
 * The sentinel is suppressed if it would fire repeatedly without an
 * intervening successful read so that mid-stream Scanner reads (which call
 * read() many times per token) generate exactly one INPUT_REQUEST per
 * blocking gap.
 */
public final class CvaiInputStream extends FilterInputStream {

    /** Stable, unlikely-to-appear-in-user-output marker. Trailing newline
     *  matters: JdiTracer's stderr forwarder splits on full lines. */
    public static final String SENTINEL = "__CVAI_INPUT_REQUEST__";

    private final PrintStream signal;
    private boolean signaledSinceLastRead = false;

    public CvaiInputStream(InputStream in, PrintStream signal) {
        super(in);
        this.signal = signal;
    }

    @Override
    public int read() throws IOException {
        maybeSignal();
        int b = in.read();
        if (b >= 0) {
            signaledSinceLastRead = false;
        }
        return b;
    }

    @Override
    public int read(byte[] b, int off, int len) throws IOException {
        if (len <= 0) {
            return 0;
        }
        maybeSignal();
        int n = in.read(b, off, len);
        if (n > 0) {
            signaledSinceLastRead = false;
        }
        return n;
    }

    private void maybeSignal() throws IOException {
        if (signaledSinceLastRead) {
            return;
        }
        if (in.available() > 0) {
            return;
        }
        signal.print('\n');
        signal.print(SENTINEL);
        signal.print('\n');
        signal.flush();
        signaledSinceLastRead = true;
    }
}
