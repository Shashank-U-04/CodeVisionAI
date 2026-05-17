'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Language = 'python' | 'c' | 'cpp' | 'java';

export interface LanguageConfig {
  label: string;
  fileName: string;
  monacoLanguage: string;
  description: string;
  tagline: string;
  color: string;
  accentColor: string;
  bgGradient: string;
  isVisualizationSupported: boolean;
  engineNote: string;
  badge: string;
}

export const LANGUAGE_CONFIG: Record<Language, LanguageConfig> = {
  python: {
    label: 'Python',
    fileName: 'main.py',
    monacoLanguage: 'python',
    description: 'Interpreted, dynamic typing',
    tagline: 'Perfect for learning & scripting',
    color: '#3776AB',
    accentColor: '#FFD343',
    bgGradient: 'linear-gradient(135deg, rgba(55,118,171,0.12) 0%, rgba(255,211,67,0.06) 100%)',
    isVisualizationSupported: true,
    engineNote: '100% in-browser · Pyodide',
    badge: 'Full Support',
  },
  c: {
    label: 'C',
    fileName: 'main.c',
    monacoLanguage: 'c',
    description: 'Systems programming & performance',
    tagline: 'Low-level control & efficiency',
    color: '#5C6BC0',
    accentColor: '#7986CB',
    bgGradient: 'linear-gradient(135deg, rgba(92,107,192,0.12) 0%, rgba(121,134,203,0.06) 100%)',
    isVisualizationSupported: true,
    engineNote: 'Server backend · GCC + GDB',
    badge: 'Preview',
  },
  cpp: {
    label: 'C++',
    fileName: 'main.cpp',
    monacoLanguage: 'cpp',
    description: 'Object-oriented systems programming',
    tagline: 'Power meets abstraction',
    color: '#00599C',
    accentColor: '#004482',
    bgGradient: 'linear-gradient(135deg, rgba(0,89,156,0.12) 0%, rgba(0,68,130,0.06) 100%)',
    isVisualizationSupported: true,
    engineNote: 'Server backend · G++ + GDB',
    badge: 'Preview',
  },
  java: {
    label: 'Java',
    fileName: 'Main.java',
    monacoLanguage: 'java',
    description: 'Enterprise & cross-platform',
    tagline: 'Write once, run anywhere',
    color: '#F89820',
    accentColor: '#ED8B00',
    bgGradient: 'linear-gradient(135deg, rgba(248,152,32,0.12) 0%, rgba(237,139,0,0.06) 100%)',
    isVisualizationSupported: true,
    engineNote: 'Server backend · mock events (Phase 1)',
    badge: 'Preview',
  },
};

export const DEFAULT_CODE: Record<Language, string> = {
  python: `# CodeVision AI — Python Visualizer
# Step through your code and see the call stack + heap in real time.

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

def make_points(n):
    points = []
    for i in range(n):
        points.append(Point(i, i * 2))
    return points

pts = make_points(3)
print("first point:", pts[0].x, pts[0].y)
`,
  c: `// CodeVision AI — C Editor
// Write and explore C code with syntax highlighting.

#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

void fibonacci(int n) {
    int a = 0, b = 1;
    printf("Fibonacci: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", a);
        int temp = a + b;
        a = b;
        b = temp;
    }
    printf("\\n");
}

int main() {
    printf("5! = %d\\n", factorial(5));
    fibonacci(8);
    return 0;
}
`,
  cpp: `// CodeVision AI — C++ Editor
// Write and explore C++ code with syntax highlighting.

#include <iostream>
#include <vector>
#include <string>
using namespace std;

class Point {
public:
    double x, y;
    Point(double x, double y) : x(x), y(y) {}

    string toString() const {
        return "(" + to_string(x) + ", " + to_string(y) + ")";
    }
};

int main() {
    vector<Point> points;
    for (int i = 0; i < 4; i++) {
        points.emplace_back(i, i * 2.5);
    }

    cout << "Points:" << endl;
    for (const auto& p : points) {
        cout << "  " << p.toString() << endl;
    }
    return 0;
}
`,
  java: `// CodeVision AI — Java Editor
// Write and explore Java code with syntax highlighting.

import java.util.ArrayList;
import java.util.List;

public class Main {
    static class Point {
        double x, y;

        Point(double x, double y) {
            this.x = x;
            this.y = y;
        }

        @Override
        public String toString() {
            return String.format("(%.1f, %.1f)", x, y);
        }
    }

    public static void main(String[] args) {
        List<Point> points = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            points.add(new Point(i, i * 2.5));
        }

        System.out.println("Points:");
        for (Point p : points) {
            System.out.println("  " + p);
        }
    }
}
`,
};

interface LanguageStore {
  selectedLanguage: Language | null;
  setLanguage: (lang: Language) => void;
  clearLanguage: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      selectedLanguage: null,
      setLanguage: (selectedLanguage) => set({ selectedLanguage }),
      clearLanguage: () => set({ selectedLanguage: null }),
    }),
    {
      name: 'codevision-language',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
