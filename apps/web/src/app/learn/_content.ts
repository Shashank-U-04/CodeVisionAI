/**
 * Learn content registry.
 * Each tutorial has a card-level summary and (optionally) a fully written body.
 *
 * Add new tutorials by appending to TUTORIALS. The first tutorial below is fully
 * written; the others are scaffolded with a short "coming soon" body so the index
 * page can link to them without 404ing.
 */

export interface TutorialSection {
  heading: string;
  body: string[]; // paragraphs (plain text — rendered as <p>)
}

export interface CodeBlock {
  language: 'python' | 'text';
  code: string;
}

export interface TutorialBlock {
  type: 'section' | 'code' | 'callout' | 'try';
  // for 'section'
  heading?: string;
  body?: string[];
  // for 'code'
  code?: CodeBlock;
  // for 'callout'
  tone?: 'info' | 'warning';
  text?: string;
  // for 'try' — links into /app with prefilled state via query string
  language?: 'python';
  prefillCode?: string;
  ctaLabel?: string;
}

export interface Tutorial {
  slug: string;
  title: string;
  summary: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string; // human readable e.g. "8 min read"
  topic: string;
  blocks: TutorialBlock[] | null; // null = placeholder
}

const FACTORIAL_CODE = `# Recursion in action — every call gets its own stack frame.
# Open the visualizer, click Run, then step forward to watch the
# stack grow on the way down and shrink as each call returns.

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(5)
print("5! =", result)
`;

const RECURSION_TUTORIAL: TutorialBlock[] = [
  {
    type: 'section',
    heading: 'Why recursion confuses beginners',
    body: [
      'Recursion looks like magic until you can see it. A function calls itself, results bubble back up out of nowhere, and the source code gives no hint about how many calls are in flight at any moment.',
      "Almost everyone who 'gets' recursion gets it the same way: they stop reading and start drawing. Each call gets a box, the boxes stack up, and then they pop one by one. The CodeVision visualizer draws those boxes for you in real time.",
    ],
  },
  {
    type: 'section',
    heading: 'The example: factorial',
    body: [
      "Factorial is the textbook recursion example because it has exactly one recursive call per frame, which makes the stack easy to follow. We'll trace factorial(5) all the way to factorial(1) and back.",
    ],
  },
  {
    type: 'code',
    code: { language: 'python', code: FACTORIAL_CODE },
  },
  {
    type: 'try',
    language: 'python',
    prefillCode: FACTORIAL_CODE,
    ctaLabel: 'Open this code in the visualizer',
  },
  {
    type: 'section',
    heading: 'What to look for while stepping',
    body: [
      "When you press Step, watch the Frames column on the left. The first call factorial(5) lands as a frame with n = 5. Because 5 > 1, Python evaluates n * factorial(n - 1), which means before the multiplication can finish, a new call factorial(4) is pushed on top.",
      "Keep stepping. You'll see four more frames pile up — factorial(4), factorial(3), factorial(2), factorial(1) — each with its own n. None of them have a return value yet. They are all paused mid-multiplication.",
      'Only the innermost call factorial(1) takes the if-branch and returns 1. As it returns, the frame is popped and its return value flows into the waiting multiplication of the frame below it. This is the moment recursion stops feeling like magic.',
    ],
  },
  {
    type: 'callout',
    tone: 'info',
    text: 'Each frame is independent. The variable n in factorial(3) is a totally different n than the one in factorial(2). Recursion works because every call gets its own local scope.',
  },
  {
    type: 'section',
    heading: 'A common pitfall: forgetting the base case',
    body: [
      "Remove the if n <= 1: return 1 line and you'll get infinite recursion — frames pile up until Python raises RecursionError. The visualizer will happily show you the first thousand or so frames stacking up, which is itself a useful demonstration of why base cases matter.",
      "Every recursive function needs (1) a base case that returns without recursing, and (2) a recursive case that moves toward the base case. If either is missing, the call stack grows forever.",
    ],
  },
  {
    type: 'section',
    heading: 'Where to go next',
    body: [
      "Once factorial clicks, try modifying it: change factorial(n) to fibonacci(n) and watch what happens. Fibonacci has two recursive calls per frame, so the stack grows in a tree shape instead of a straight line. That tree shape is the reason naive Fibonacci is exponentially slow — and seeing it makes memoization obvious.",
    ],
  },
];

export const TUTORIALS: Tutorial[] = [
  {
    slug: 'visualizing-recursion',
    title: 'Visualizing Recursion',
    summary:
      'Trace factorial(5) frame by frame and watch the call stack grow on the way down, then unwind as each call returns. The mental model that finally makes recursion click.',
    level: 'Beginner',
    duration: '7 min read',
    topic: 'Control flow',
    blocks: RECURSION_TUTORIAL,
  },
  {
    slug: 'understanding-the-call-stack',
    title: 'Understanding the Call Stack',
    summary:
      'Every function you call gets a frame. Every return pops one. Learn how local variables, parameters, and return addresses live (and die) in stack memory.',
    level: 'Beginner',
    duration: '6 min read',
    topic: 'Memory',
    blocks: null,
  },
  {
    slug: 'heap-vs-stack',
    title: 'Heap vs Stack: A Visual Tour',
    summary:
      'Why does a Python list live in a different place than the integer i? Where do object references actually point? See both memory regions side by side.',
    level: 'Intermediate',
    duration: '9 min read',
    topic: 'Memory',
    blocks: null,
  },
  {
    slug: 'mutable-vs-immutable',
    title: 'Mutable vs Immutable, Visually',
    summary:
      'Reassigning a string makes a new object. Appending to a list mutates the existing one. Watch the heap and you will never confuse the two again.',
    level: 'Intermediate',
    duration: '8 min read',
    topic: 'Data model',
    blocks: null,
  },
];

export function getTutorial(slug: string): Tutorial | undefined {
  return TUTORIALS.find((t) => t.slug === slug);
}
