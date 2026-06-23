export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--navy-950, #050a18)' }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--gold-400, #d4a017)', borderTopColor: 'transparent' }}
        />
        <span className="text-sm" style={{ color: 'var(--text-muted, #64748b)' }}>
          Memuat...
        </span>
      </div>
    </div>
  )
}
