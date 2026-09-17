import { PillNav, type PillNavItem } from '../navigation/PillNav'

export type AppPage = 'overview' | 'matches' | 'analysis' | 'role' | 'pathways'

const tabs: PillNavItem<AppPage>[] = [
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
    <PillNav
      items={tabs}
      activeId={page}
      onSelect={onSelect}
      ariaLabel="Workspace pages"
    />
  )
}
