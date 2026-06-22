export default function ImprovePageLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div className="space-y-3">
          <div className="h-3 w-20 bg-slate-800 rounded" />
          <div className="h-7 w-72 bg-slate-800 rounded" />
          <div className="h-3 w-52 bg-slate-800 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-slate-800 rounded-xl" />
          <div className="h-10 w-44 bg-slate-800 rounded-xl" />
        </div>
      </div>
      {/* Action plan cards */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-slate-950/30 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-3 w-48 bg-slate-800 rounded" />
              <div className="h-5 w-64 bg-slate-800 rounded" />
            </div>
            <div className="h-8 w-32 bg-slate-800 rounded-lg" />
          </div>
          <div className="h-3 w-full bg-slate-900 rounded" />
          <div className="grid grid-cols-4 gap-4 pt-2 border-t border-slate-850">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-1">
                <div className="h-2 w-16 bg-slate-800 rounded" />
                <div className="h-4 w-24 bg-slate-900 rounded" />
              </div>
            ))}
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full" />
        </div>
      ))}
    </div>
  )
}
