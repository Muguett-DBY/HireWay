import { useI18n } from '../lib/useI18n'

type StepperItem = {
  id: number
  label: string
  unlocked: boolean
}

type StepperProps = {
  items: StepperItem[]
  currentId: number
  onSelect: (id: number) => void
}

// The stepper shows progress through the profile flow and lets the user
// revisit any step they have already unlocked. Locked steps stay visible so
// the path ahead is clear, but they cannot be clicked yet.
export function Stepper({ items, currentId, onSelect }: StepperProps) {
  const { t } = useI18n()
  return (
    <nav className="stepper" aria-label={t('wizard.s1.h1')}>
      <ol>
        {items.map((item) => {
          const state =
            item.id === currentId
              ? 'current'
              : item.unlocked
                ? 'unlocked'
                : 'locked'

          return (
            <li className={`stepper-item ${state}`} key={item.id}>
              <button
                type="button"
                disabled={!item.unlocked || item.id === currentId}
                onClick={() => onSelect(item.id)}
                aria-current={item.id === currentId ? 'step' : undefined}
              >
                <span className="stepper-dot" aria-hidden="true">
                  {item.unlocked && item.id < currentId ? '✓' : item.id}
                </span>
                <span className="stepper-label">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
