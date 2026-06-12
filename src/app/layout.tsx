import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { fetchAgents, fetchRecentActivity } from '@/lib/data';
import PmChip from '@/components/PmChip';
import ActivityFeed from '@/components/ActivityFeed';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Board de Clawdia',
  description: 'Orquestación multi-agente para el SDLC',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [agents, logs] = await Promise.all([
    fetchAgents().catch(() => []),
    fetchRecentActivity(30).catch(() => []),
  ]);

  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-200 font-sans">
        <header className="border-b border-gray-800/70 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-full px-6 py-3 flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">🤖</span>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-gray-100 tracking-tight">
                Board de Clawdia
              </h1>
              <p className="text-[11px] text-gray-500 -mt-0.5">
                Orquestación multi-agente · Tablero del PM
              </p>
            </div>
            <nav className="ml-6 flex items-center gap-1">
              <Link
                href="/"
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800/50"
              >
                Tablero
              </Link>
              <Link
                href="/agents"
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800/50"
              >
                Agentes
              </Link>
            </nav>
            <div className="ml-auto">
              <PmChip agents={agents} />
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col p-4 md:p-6 min-h-0">
          {children}
        </main>

        <ActivityFeed
          initialLogs={logs}
          agents={agents}
        />
      </body>
    </html>
  );
}
