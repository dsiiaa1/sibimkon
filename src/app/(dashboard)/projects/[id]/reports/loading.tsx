export default function ReportsPageLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80 space-y-3">
        <div className="h-3 w-20 bg-slate-800 rounded" />
        <div className="h-7 w-72 bg-slate-800 rounded" />
        <div className="h-3 w-60 bg-slate-800 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <div className="h-5 w-48 bg-slate-800 rounded" />
            <div className="h-3 w-72 bg-slate-900 rounded" />
            <div className="grid grid-cols-3 gap-2 bg-slate-950 border border-slate-850 p-4 rounded-2xl">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2 text-center">
                  <div className="h-2 w-16 bg-slate-800 rounded mx-auto" />
                  <div className="h-6 w-12 bg-slate-800 rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="h-12 w-full bg-slate-800 rounded-xl" />
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <div className="h-5 w-48 bg-slate-800 rounded" />
            <div className="h-40 bg-slate-900 border border-amber-500/10 rounded-2xl" />
            <div className="h-12 w-full bg-slate-800 rounded-xl" />
          </div>
        </div>
        {/* Right column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <div className="h-5 w-40 bg-slate-800 rounded" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-900 border border-slate-850 rounded-xl" />
            ))}
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <div className="h-5 w-48 bg-slate-800 rounded" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-950/40 border border-slate-850 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
