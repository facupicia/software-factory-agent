import { Suspense } from 'react';
import KanbanSkeleton from '@/components/KanbanSkeleton';
import KanbanBoardAsync from '@/components/KanbanBoardAsync';

export default function HomePage() {
  return (
    <Suspense fallback={<KanbanSkeleton />}>
      <KanbanBoardAsync />
    </Suspense>
  );
}
