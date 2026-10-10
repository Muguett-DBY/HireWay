import { Component, type ReactNode } from 'react'
import { useI18n } from '../../lib/useI18n'

class WorkspaceErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// An older open tab may request a chunk removed by a newer deployment.
// Reloading fetches the current entry point; the saved recovery code restores
// the profile, so a failed page load never leaves the workspace blank.
export function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  return (
    <WorkspaceErrorBoundary
      fallback={
        <section
          className="app-hero"
          role="alert"
          aria-labelledby="workspace-error-title"
        >
          <h1 id="workspace-error-title">{t('workspace.loadError.title')}</h1>
          <p className="app-hero-sub">{t('workspace.loadError.message')}</p>
          <button
            type="button"
            className="btn"
            onClick={() => window.location.reload()}
          >
            {t('workspace.loadError.reload')}
          </button>
        </section>
      }
    >
      {children}
    </WorkspaceErrorBoundary>
  )
}
