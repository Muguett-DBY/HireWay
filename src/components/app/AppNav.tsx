export type AppPage = 'overview' | 'matches' | 'analysis' | 'role' | 'pathways'

const tabs: { id: AppPage; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'matches', label: 'Matches' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'role', label: 'Role Details' },
  { id: 'pathways', label: 'Pathways' },
]

// The workspace tabs swap whole pages instead of one long scrolling dashboard.
export function AppNav({
  page,
  onSelect,
}: {
  page: AppPage
  onSelect: (page: AppPage) => void
}) {
  return (
    <nav className="app-tabs" aria-label="Workspace pages">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          className={tab.id === page ? 'tab-link active' : 'tab-link'}
          aria-current={tab.id === page ? 'page' : undefined}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
