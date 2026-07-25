import type { Language } from '@/stores/languageStore';

export interface Example {
  id: string;
  label: string;
  description: string;
  code: string;
}

const PY_FACTORIAL = `# Factorial — classic recursion.
# Watch the stack grow as each call waits for the next to return.

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print("5! =", factorial(5))
`;

const PY_FIB = `# Fibonacci — recursion with TWO calls per frame.
# The stack grows as a tree, which is why naive fib is exponentially slow.

def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

for i in range(7):
    print(f"fib({i}) =", fib(i))
`;

const PY_BUBBLE = `# Bubble sort — every swap mutates the same list in place.
# Watch the heap object change while the variable arr keeps pointing to it.

def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

print(bubble_sort([5, 2, 4, 1, 3]))
`;

const PY_LINKED_LIST = `# A tiny linked list, by hand.
# See nodes appear on the heap and arrows form between them.

class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

def from_list(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def to_list(head):
    out = []
    while head is not None:
        out.append(head.value)
        head = head.next
    return out

head = from_list([10, 20, 30])
print(to_list(head))
`;

const C_HELLO = `// A minimal C program.
#include <stdio.h>

int main(void) {
    int a = 10;
    int b = a * 2;
    printf("a=%d b=%d\\n", a, b);
    return 0;
}
`;

const C_FACTORIAL = `// Factorial — watch the stack grow one frame per call,
// then unwind as each call returns.
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(void) {
    int f = factorial(5);
    printf("5! = %d\\n", f);
    return 0;
}
`;

const C_ARRAYS = `// Arrays and structs appear on the heap, with arrows
// from the variable that references them.
#include <stdio.h>

struct Point { int x; int y; };

int main(void) {
    int arr[4];
    struct Point p;

    for (int i = 0; i < 4; i++) {
        arr[i] = (i + 1) * (i + 1);
    }
    p.x = 3;
    p.y = 7;

    printf("arr[3]=%d p=(%d,%d)\\n", arr[3], p.x, p.y);
    return 0;
}
`;

const C_SCANF = `// Interactive input — the console blocks until you type.
#include <stdio.h>

int main(void) {
    int n;
    printf("How many? ");
    scanf("%d", &n);
    printf("You said %d\\n", n * 2);
    return 0;
}
`;

const CPP_HELLO = `// A minimal C++ program.
#include <iostream>

int main() {
    int a = 10;
    int b = a * 2;
    std::cout << "a=" << a << " b=" << b << std::endl;
    return 0;
}
`;

const CPP_CALLS = `// Helper calls — step into square() and watch the
// frame appear above main.
#include <iostream>

int square(int n) {
    int r = n * n;
    return r;
}

int main() {
    int total = 0;
    for (int i = 1; i <= 4; i++) {
        total += square(i);
    }
    std::cout << "total=" << total << std::endl;
    return 0;
}
`;

const CPP_STRUCTS = `// An array of structs — each element is its own heap box.
#include <iostream>

struct Point { double x; double y; };

int main() {
    Point pts[3];
    for (int i = 0; i < 3; i++) {
        pts[i].x = i;
        pts[i].y = i * 2.5;
    }
    std::cout << "last y=" << pts[2].y << std::endl;
    return 0;
}
`;

const JAVA_HELLO = `// A minimal Java program.
public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = a * 2;
        System.out.println("a=" + a + " b=" + b);
    }
}
`;

const JAVA_FACTORIAL = `// Factorial — one frame per recursive call.
public class Main {
    static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        System.out.println("5! = " + factorial(5));
    }
}
`;

const JAVA_OBJECTS = `// Objects and arrays live on the heap.
public class Main {
    static class Point {
        int x, y;
        Point(int x, int y) { this.x = x; this.y = y; }
    }

    public static void main(String[] args) {
        int[] nums = new int[4];
        for (int i = 0; i < 4; i++) {
            nums[i] = (i + 1) * (i + 1);
        }
        Point p = new Point(3, 7);
        System.out.println("nums[3]=" + nums[3] + " p=(" + p.x + "," + p.y + ")");
    }
}
`;

export const EXAMPLES: Record<Language, Example[]> = {
  python: [
    { id: 'factorial', label: 'Factorial (recursion)', description: 'Classic recursive factorial — see the stack grow and shrink.', code: PY_FACTORIAL },
    { id: 'fibonacci', label: 'Fibonacci (tree recursion)', description: 'Two recursive calls per frame — watch the call tree.', code: PY_FIB },
    { id: 'bubble', label: 'Bubble sort', description: 'In-place sort — heap mutates, variable keeps its reference.', code: PY_BUBBLE },
    { id: 'linked-list', label: 'Linked list', description: 'Build a linked list and walk it — see references on the heap.', code: PY_LINKED_LIST },
  ],
  c: [
    { id: 'hello', label: 'Hello world', description: 'A minimal C program.', code: C_HELLO },
    { id: 'factorial', label: 'Factorial (recursion)', description: 'One stack frame per call — watch it grow and unwind.', code: C_FACTORIAL },
    { id: 'arrays', label: 'Arrays & structs', description: 'Aggregates rendered as heap objects with reference arrows.', code: C_ARRAYS },
    { id: 'scanf', label: 'Interactive input', description: 'scanf blocks on the console until you type a value.', code: C_SCANF },
  ],
  cpp: [
    { id: 'hello', label: 'Hello world', description: 'A minimal C++ program.', code: CPP_HELLO },
    { id: 'calls', label: 'Helper calls', description: 'Step into a helper and see its frame stack up.', code: CPP_CALLS },
    { id: 'structs', label: 'Array of structs', description: 'Each element becomes its own heap box.', code: CPP_STRUCTS },
  ],
  java: [
    { id: 'hello', label: 'Hello world', description: 'A minimal Java program.', code: JAVA_HELLO },
    { id: 'factorial', label: 'Factorial (recursion)', description: 'One frame per recursive call.', code: JAVA_FACTORIAL },
    { id: 'objects', label: 'Objects & arrays', description: 'Instances and arrays on the heap.', code: JAVA_OBJECTS },
  ],
};
