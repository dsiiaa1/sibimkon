export default function ControlPageLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div className="space-y-3">
          <div className="h-3 w-20 bg-slate-800 rounded" />
          <div className="h-7 w-72 bg-slate-800 rounded" />
          <div className="h-3 w-52 bg-slate-800 rounded" />
        </div>
      </div>
      <div className="h-14 bg-slate-950/40 rounded-2xl border border-slate-800" />
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`h-10 w-48 rounded-t-xl ${i === 0 ? 'bg-slate-700' : 'bg-slate-900'}`} />
        ))}
      </div>
      {/* KPI chart placeholder */}
      <div className="bg-slate-950/20 rounded-3xl border border-slate-800 p-6 space-y-4">
        <div className="h-5 w-48 bg-slate-800 rounded" />
        <div className="h-80 bg-slate-900/40 border border-slate-850 rounded-3xl" />
      </div>
    </div>
  )
}
