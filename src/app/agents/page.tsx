import { fetchAgents } from '@/lib/data';
import AgentsRoster from '@/components/AgentsRoster';
import { Suspense } from 'react';

export default async function AgentsPage() {
  const agents = await fetchAgents().catch(() => []);

  return (
    <Suspense fallback={null}>
      <AgentsRoster initialAgents={agents} />
    </Suspense>
  );
}
