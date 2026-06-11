import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Agent Kanban',
  description: 'AI Agent Team Kanban Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-200 font-sans">
        {/* Header */}
        <header className="border-b border-gray-800/70 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-full px-6 py-3 flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">🖥️</span>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-gray-100 tracking-tight">
                Agent Kanban
              </h1>
              <p className="text-[11px] text-gray-500 -mt-0.5">PM Dashboard</p>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col p-4 md:p-6 min-h-0">
          {children}
        </main>
      </body>
    </html>
  );
}
