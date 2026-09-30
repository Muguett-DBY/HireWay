import { useI18n } from '../../lib/useI18n'
import { PillNav } from '../navigation/PillNav'

export type AppPage = 'overview' | 'matches' | 'analysis' | 'role' | 'pathways'

// The workspace tabs swap whole pages instead of one long scrolling dashboard.
export function AppNav({
  page,
  onSelect,
}: {
  page: AppPage
  onSelect: (page: AppPage) => void
}) {
  const { t } = useI18n()
  const tabs = [
    { id: 'overview' as const, label: t('nav.overview') },
    { id: 'matches' as const, label: t('nav.matches') },
    { id: 'analysis' as const, label: t('nav.analysis') },
    { id: 'role' as const, label: t('nav.roleDetails') },
    { id: 'pathways' as const, label: t('nav.pathways') },
  ]
  return (
    <PillNav
      items={tabs}
      activeId={page}
      onSelect={onSelect}
      ariaLabel="Workspace pages"
    />
  )
}
