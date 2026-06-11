export default function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1 flex-1 min-h-0 flex-col md:flex-row">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-72 bg-gray-950/40 border border-gray-800/50 rounded-xl animate-pulse min-h-[400px]"
        >
          {/* header */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-800/40">
            <div className="w-3 h-3 rounded-full bg-gray-800" />
            <div className="h-4 w-20 bg-gray-800 rounded" />
            <div className="ml-auto h-5 w-6 bg-gray-800 rounded-full" />
          </div>
          {/* cards */}
          <div className="p-2 space-y-2">
            {[1, 2, 3].slice(0, i === 5 ? 1 : i).map((j) => (
              <div key={j} className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-10 bg-gray-800 rounded" />
                  <div className="h-4 w-4 bg-gray-800 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-gray-800 rounded" />
                <div className="flex justify-between">
                  <div className="h-3 w-12 bg-gray-800 rounded" />
                  <div className="h-6 w-6 rounded-full bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
