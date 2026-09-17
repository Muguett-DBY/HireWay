import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

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
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([])
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([])
  const hoverLabelRefs = useRef<(HTMLSpanElement | null)[]>([])
  const timelineRefs = useRef<(gsap.core.Timeline | null)[]>([])
  const tweenRefs = useRef<(gsap.core.Tween | null)[]>([])
  const reduceMotionRef = useRef(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const timelines = timelineRefs.current
    const tweens = tweenRefs.current

    const layout = () => {
      reduceMotionRef.current = motionQuery.matches

      tabs.forEach((_, index) => {
        const button = buttonRefs.current[index]
        const circle = circleRefs.current[index]
        const label = labelRefs.current[index]
        const hoverLabel = hoverLabelRefs.current[index]
        if (!button || !circle || !label || !hoverLabel) return

        timelineRefs.current[index]?.kill()
        tweenRefs.current[index]?.kill()

        const { width, height } = button.getBoundingClientRect()
        const radius = (width ** 2 / 4 + height ** 2) / (2 * height)
        const diameter = Math.ceil(radius * 2) + 2
        const delta =
          Math.ceil(
            radius - Math.sqrt(Math.max(0, radius ** 2 - width ** 2 / 4)),
          ) + 1

        Object.assign(circle.style, {
          width: `${diameter}px`,
          height: `${diameter}px`,
          bottom: `-${delta}px`,
        })

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${diameter - delta}px`,
        })
        gsap.set(label, { y: 0 })
        gsap.set(hoverLabel, { y: height + 12, opacity: 0 })

        if (motionQuery.matches) {
          timelineRefs.current[index] = null
          return
        }

        timelineRefs.current[index] = gsap
          .timeline({ paused: true })
          .to(
            circle,
            {
              scale: 1.2,
              duration: 1,
              ease: 'power3.out',
              overwrite: 'auto',
            },
            0,
          )
          .to(
            label,
            {
              y: -(height + 8),
              duration: 1,
              ease: 'power3.out',
              overwrite: 'auto',
            },
            0,
          )
          .to(
            hoverLabel,
            {
              y: 0,
              opacity: 1,
              duration: 1,
              ease: 'power3.out',
              overwrite: 'auto',
            },
            0,
          )
      })
    }

    layout()
    window.addEventListener('resize', layout)
    motionQuery.addEventListener('change', layout)
    document.fonts?.ready.then(layout).catch(() => undefined)

    return () => {
      window.removeEventListener('resize', layout)
      motionQuery.removeEventListener('change', layout)
      timelines.forEach((timeline) => timeline?.kill())
      tweens.forEach((tween) => tween?.kill())
    }
  }, [])

  const animateTo = (index: number, end: boolean) => {
    if (reduceMotionRef.current) return
    const timeline = timelineRefs.current[index]
    if (!timeline) return

    tweenRefs.current[index]?.kill()
    tweenRefs.current[index] = timeline.tweenTo(end ? timeline.duration() : 0, {
      duration: end ? 0.3 : 0.2,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }

  return (
    <nav className="app-tabs" aria-label="Workspace pages">
      {tabs.map((tab, index) => (
        <button
          type="button"
          key={tab.id}
          className={tab.id === page ? 'tab-link active' : 'tab-link'}
          aria-current={tab.id === page ? 'page' : undefined}
          onClick={() => onSelect(tab.id)}
          onPointerEnter={() => animateTo(index, true)}
          onPointerLeave={() => animateTo(index, false)}
          onFocus={() => animateTo(index, true)}
          onBlur={() => animateTo(index, false)}
          ref={(element) => {
            buttonRefs.current[index] = element
          }}
        >
          <span
            className="tab-hover-circle"
            aria-hidden="true"
            ref={(element) => {
              circleRefs.current[index] = element
            }}
          />
          <span className="tab-label-stack">
            <span
              className="tab-label"
              ref={(element) => {
                labelRefs.current[index] = element
              }}
            >
              {tab.label}
            </span>
            <span
              className="tab-label-hover"
              aria-hidden="true"
              ref={(element) => {
                hoverLabelRefs.current[index] = element
              }}
            >
              {tab.label}
            </span>
          </span>
        </button>
      ))}
    </nav>
  )
}
