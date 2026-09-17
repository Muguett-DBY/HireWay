import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export type PillNavItem<T extends string> = {
  id: T
  label: string
}

type PillNavProps<T extends string> = {
  items: PillNavItem<T>[]
  activeId: T
  onSelect: (id: T) => void
  ariaLabel: string
}

// Shared pill navigation: the selected page stays visible while hover and
// keyboard focus reveal the animated green fill used across HireWay.
export function PillNav<T extends string>({
  items,
  activeId,
  onSelect,
  ariaLabel,
}: PillNavProps<T>) {
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

      items.forEach((_, index) => {
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
  }, [items])

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
    <nav className="app-tabs" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <button
          type="button"
          key={item.id}
          className={item.id === activeId ? 'tab-link active' : 'tab-link'}
          aria-current={item.id === activeId ? 'page' : undefined}
          onClick={() => onSelect(item.id)}
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
              {item.label}
            </span>
            <span
              className="tab-label-hover"
              aria-hidden="true"
              ref={(element) => {
                hoverLabelRefs.current[index] = element
              }}
            >
              {item.label}
            </span>
          </span>
        </button>
      ))}
    </nav>
  )
}
