export default function AnalyzePageLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80 space-y-3">
        <div className="h-3 w-20 bg-slate-800 rounded" />
        <div className="h-7 w-72 bg-slate-800 rounded" />
        <div className="h-3 w-52 bg-slate-800 rounded" />
      </div>
      <div className="h-14 bg-slate-950/40 rounded-2xl border border-slate-800" />
      <div className="flex gap-2 border-b border-slate-800 pb-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`h-10 w-36 rounded-t-xl ${i === 0 ? 'bg-slate-700' : 'bg-slate-900'}`} />
        ))}
      </div>
      {/* Fishbone category cards */}
      <div className="bg-slate-950/20 rounded-3xl border border-slate-800 p-6 space-y-6">
        <div className="h-5 w-52 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-900/60 border border-slate-850 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
