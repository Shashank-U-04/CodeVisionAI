package com.codevisionai.tracer;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

/**
 * Bootstrap entry point used by JdiTracer to launch the user's main class
 * with {@link CvaiInputStream} installed as System.in. Running the user's
 * Main directly would skip this hook, so JdiTracer hands MainLauncher to
 * JDI's LaunchingConnector and passes the real user class name as the
 * first argument.
 *
 * Exit codes mirror what a plain `java Main` would do: 0 if main returns
 * normally, 1 if Main isn't found or doesn't expose a main method, 2 if
 * Main.main threw.
 */
public final class MainLauncher {

    public static void main(String[] rawArgs) {
        if (rawArgs.length < 1) {
            System.err.println("MainLauncher: missing user main class");
            System.exit(1);
        }
        String userMainClass = rawArgs[0];

        System.setIn(new CvaiInputStream(System.in, System.err));

        Class<?> klass;
        Method mainMethod;
        try {
            klass = Class.forName(userMainClass);
            mainMethod = klass.getMethod("main", String[].class);
        } catch (ClassNotFoundException e) {
            System.err.println("Error: Could not find or load main class " + userMainClass);
            System.exit(1);
            return;
        } catch (NoSuchMethodException e) {
            System.err.println("Error: class " + userMainClass + " has no main(String[]) method");
            System.exit(1);
            return;
        }

        try {
            mainMethod.invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause();
            if (cause != null) {
                cause.printStackTrace(System.err);
            } else {
                e.printStackTrace(System.err);
            }
            System.exit(2);
        } catch (IllegalAccessException e) {
            System.err.println("Error: main method is not accessible: " + e.getMessage());
            System.exit(1);
        }
    }
}
