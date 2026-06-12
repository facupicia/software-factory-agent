import { Suspense } from 'react';
import KanbanBoardAsync from '@/components/KanbanBoardAsync';
import ChatPanel from '@/components/ChatPanel';
import { fetchGlobalMessages } from '@/lib/data';

export default async function HomePage() {
  const initialMessages = await fetchGlobalMessages(50).catch(() => []);

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <Suspense fallback={null}>
          <KanbanBoardAsync />
        </Suspense>
      </div>
      <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col min-h-[400px] md:min-h-0">
        <ChatPanel scope="global" initialMessages={initialMessages} className="flex-1" />
      </aside>
    </div>
  );
}
