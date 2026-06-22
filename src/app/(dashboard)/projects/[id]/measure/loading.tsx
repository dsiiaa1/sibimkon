export default function MeasurePageLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80 space-y-3">
        <div className="h-3 w-20 bg-slate-800 rounded" />
        <div className="h-7 w-72 bg-slate-800 rounded" />
        <div className="h-3 w-52 bg-slate-800 rounded" />
      </div>
      <div className="h-14 bg-slate-950/40 rounded-2xl border border-slate-800" />
      {/* PQCDSM dimension cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-950/40 rounded-2xl border border-slate-800" />
        ))}
      </div>
      <div className="bg-slate-950/20 rounded-3xl border border-slate-800 p-6 space-y-4">
        <div className="h-5 w-48 bg-slate-800 rounded" />
        <div className="h-48 bg-slate-900 rounded-2xl" />
      </div>
    </div>
  )
}
