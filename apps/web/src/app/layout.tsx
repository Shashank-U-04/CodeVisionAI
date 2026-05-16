import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const geistSans = localFont({
  src: '../../public/fonts/geist-latin.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: '../../public/fonts/geist-mono-latin.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CodeVision AI — Interactive Python Visualizer',
  description:
    'Step through Python execution with live stack frame visualization and heap objects. Powered by Pyodide.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${spaceGrotesk.variable} ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
