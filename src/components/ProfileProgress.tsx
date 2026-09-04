// A controlled, non-interactive adaptation of the React Bits Line Sidebar.
// The form owns the current stage; this component only explains progress.
export type ProfileStage =
  'background' | 'skills' | 'goal' | 'target-role' | 'review'

type ProfileProgressProps = {
  currentStage: ProfileStage
}

const stages: Array<{
  id: ProfileStage
  label: string
  description: string
}> = [
  {
    id: 'background',
    label: 'Background details',
    description: 'Tell us what you study and your current role.',
  },
  {
    id: 'skills',
    label: 'Current skills',
    description: 'Add the skills and tools you already use.',
  },
  {
    id: 'goal',
    label: 'Career goal',
    description: 'Describe the direction you want to take.',
  },
  {
    id: 'target-role',
    label: 'Target role',
    description: 'Choose an Australian occupation to explore.',
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Check your choices before viewing the dashboard.',
  },
]

export function ProfileProgress({ currentStage }: ProfileProgressProps) {
  const currentIndex = stages.findIndex((stage) => stage.id === currentStage)
  const current = stages[currentIndex]

  return (
    <nav className="profile-progress" aria-label="Profile setup progress">
      <p className="profile-progress-eyebrow">Your profile</p>
      <p className="profile-progress-summary">
        Step {currentIndex + 1} of {stages.length}:{' '}
        <strong>{current.label}</strong>
      </p>

      <ol className="profile-progress-list">
        {stages.map((stage, index) => {
          const state =
            index < currentIndex
              ? 'completed'
              : index === currentIndex
                ? 'current'
                : 'upcoming'

          return (
            <li
              key={stage.id}
              className={`profile-progress-item ${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="profile-progress-marker" aria-hidden="true" />
              <span className="profile-progress-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="profile-progress-copy">
                <span className="profile-progress-label">
                  {stage.label}
                  {state === 'completed' && (
                    <span className="profile-progress-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </span>
                {state === 'current' && (
                  <span className="profile-progress-description">
                    {stage.description}
                  </span>
                )}
                <span className="profile-progress-state">
                  {state === 'completed'
                    ? 'Completed'
                    : state === 'current'
                      ? 'Current step'
                      : 'Upcoming'}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
