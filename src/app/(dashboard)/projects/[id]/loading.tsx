export default function DmaicLoading() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--gold-400, #d4a017)', borderTopColor: 'transparent' }}
        />
        <span className="text-sm text-slate-400">Memuat modul DMAIC...</span>
      </div>
    </div>
  )
}
