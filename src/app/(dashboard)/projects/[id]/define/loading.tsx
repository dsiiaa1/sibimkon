export default function DefinePageLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80 space-y-3">
        <div className="h-3 w-20 bg-slate-800 rounded" />
        <div className="h-7 w-72 bg-slate-800 rounded" />
        <div className="h-3 w-52 bg-slate-800 rounded" />
      </div>
      <div className="h-14 bg-slate-950/40 rounded-2xl border border-slate-800" />
      <div className="flex gap-2 border-b border-slate-800 pb-1">
        <div className="h-10 w-40 bg-slate-800 rounded-t-xl" />
        <div className="h-10 w-40 bg-slate-900 rounded-t-xl" />
      </div>
      <div className="bg-slate-950/20 rounded-3xl border border-slate-800 p-6 md:p-8 space-y-6">
        <div className="h-5 w-48 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-32 bg-slate-800 rounded" />
              <div className="h-10 bg-slate-900 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
