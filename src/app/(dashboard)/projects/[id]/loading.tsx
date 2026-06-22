export default function ProjectPageLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80 space-y-3">
        <div className="h-3 w-24 bg-slate-800 rounded" />
        <div className="h-7 w-64 bg-slate-800 rounded" />
        <div className="h-3 w-48 bg-slate-800 rounded" />
      </div>
      {/* Phase banner skeleton */}
      <div className="h-14 bg-slate-950/40 rounded-2xl border border-slate-800" />
      {/* Content skeleton */}
      <div className="bg-slate-950/20 rounded-3xl border border-slate-800 p-6 md:p-8 space-y-4">
        <div className="h-5 w-40 bg-slate-800 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-900 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
