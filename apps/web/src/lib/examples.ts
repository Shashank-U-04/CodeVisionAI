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

const C_HELLO = `// C example — editor only for now.
#include <stdio.h>

int main(void) {
    printf("Hello, CodeVision!\\n");
    return 0;
}
`;

const CPP_HELLO = `// C++ example — editor only for now.
#include <iostream>

int main() {
    std::cout << "Hello, CodeVision!" << std::endl;
    return 0;
}
`;

const JAVA_HELLO = `// Java example — editor only for now.
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeVision!");
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
  ],
  cpp: [
    { id: 'hello', label: 'Hello world', description: 'A minimal C++ program.', code: CPP_HELLO },
  ],
  java: [
    { id: 'hello', label: 'Hello world', description: 'A minimal Java program.', code: JAVA_HELLO },
  ],
};
