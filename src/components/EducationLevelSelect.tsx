import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

const educationLevels = [
  { value: '', label: 'Select your education level' },
  { value: 'High School', label: 'High School' },
  { value: 'Diploma / Certificate', label: 'Diploma / Certificate' },
  { value: 'Bachelor', label: "Bachelor's degree" },
  { value: 'Master', label: "Master's degree" },
  { value: 'Doctorate', label: 'Doctorate (PhD)' },
  { value: 'Other', label: 'Other' },
]

type EducationLevelSelectProps = {
  value: string
  onChange: (value: string) => void
  invalid: boolean
  describedBy?: string
}

export function EducationLevelSelect({
  value,
  onChange,
  invalid,
  describedBy,
}: EducationLevelSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()
  const selectedIndex = Math.max(
    educationLevels.findIndex((option) => option.value === value),
    0,
  )
  const selectedOption = educationLevels[selectedIndex]

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [])

  function openMenu() {
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  function selectOption(index: number) {
    onChange(educationLevels[index].value)
    setActiveIndex(index)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function moveActive(delta: number) {
    if (!open) {
      setActiveIndex(selectedIndex)
      setOpen(true)
      return
    }

    setActiveIndex(
      (current) =>
        (current + delta + educationLevels.length) % educationLevels.length,
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveActive(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveActive(-1)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        setOpen(true)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(educationLevels.length - 1)
        setOpen(true)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) {
          selectOption(activeIndex)
        } else {
          openMenu()
        }
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className="education-select" ref={wrapperRef}>
      <button
        ref={triggerRef}
        id="education-level"
        type="button"
        className="education-select-trigger"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={
          open ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-required="true"
        onClick={() => {
          if (open) {
            setOpen(false)
          } else {
            openMenu()
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={value ? undefined : 'placeholder'}>
          {selectedOption.label}
        </span>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>

      {open && (
        <ul className="education-select-menu" id={listboxId} role="listbox">
          {educationLevels.map((option, index) => (
            <li key={option.value || 'placeholder'} role="presentation">
              <button
                id={`${listboxId}-option-${index}`}
                type="button"
                className={`education-select-option${
                  index === activeIndex ? ' active' : ''
                }${option.value === value ? ' selected' : ''}`}
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(index)}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="m4 10 4 4 8-9" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
