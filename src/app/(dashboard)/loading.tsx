export default function DashboardLoading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--gold-400)', borderTopColor: 'transparent' }}
        />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Memuat data...
        </span>
      </div>
    </div>
  )
}
