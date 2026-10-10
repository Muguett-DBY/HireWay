import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Skill } from '../../lib/skillsApi'
import type { LearningVideo } from '../../lib/learningVideos'
import { videoEmbedUrl, videoThumbnail } from '../../lib/learningVideos'
import { useI18n } from '../../lib/useI18n'

type LearningTab = 'overview' | 'takeaways'

// Ids wire each tab to its panel for assistive tech; the keydown handler
// reuses the button ids to move focus with the arrow keys.
const TAB_BUTTON_IDS: Record<LearningTab, string> = {
  overview: 'learning-tab-overview',
  takeaways: 'learning-tab-takeaways',
}

const TAB_PANEL_IDS: Record<LearningTab, string> = {
  overview: 'learning-panel-overview',
  takeaways: 'learning-panel-takeaways',
}

type LearningPlayerProps = {
  skill: Skill | null
  videos: LearningVideo[]
  progressPct: number
  secondsTotal: number
  sessions: number
  busy: boolean
  onMarkCompleted: (skill: Skill) => void
  onSession: (skillCode: string, seconds: number, candidatePct: number) => void
  onClose: () => void
}

// Report partial sessions every three minutes so a crashed tab keeps
// most of the watched time.
const PARTIAL_REPORT_SECONDS = 180

// Format seconds as h:mm:ss for the focus timer.
function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// The video learning dialog: privacy-enhanced YouTube embed, session focus
// timer, and the controls that move a skill along its pathway.
export function LearningPlayer({
  skill,
  videos,
  progressPct,
  secondsTotal,
  sessions,
  busy,
  onMarkCompleted,
  onSession,
  onClose,
}: LearningPlayerProps) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [videoIndex, setVideoIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [tab, setTab] = useState<LearningTab>('overview')

  // Refs keep the reporting callback current without re-binding listeners.
  const elapsedRef = useRef(0)
  const reportedRef = useRef(0)
  const skillRef = useRef(skill)

  const video = videos[videoIndex]
  const open = Boolean(skill && video)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Closing the dialog - or switching skills while it is open - resets the
  // session: first video, no playback, no seconds. Keying this on `open`
  // stops the focus timer and session reporter from outliving the dialog
  // and makes reopening the same skill start fresh instead of resuming.
  useEffect(() => {
    // A status update replaces the skill object but keeps the same session.
    // Keep the latest status without discarding seconds awaiting a report.
    if (
      open &&
      skillRef.current?.id === skill?.id &&
      skillRef.current?.skillCode === skill?.skillCode
    ) {
      skillRef.current = skill
      return
    }

    skillRef.current = open ? skill : null
    setVideoIndex(0)
    setPlaying(false)
    setElapsed(0)
    setTab('overview')
    elapsedRef.current = 0
    reportedRef.current = 0
  }, [open, skill])

  // Send unreported seconds; the percent candidate is measured against the
  // whole course, not just the selected video, so a skill with several
  // videos only reaches 100% once every part has been watched.
  function reportSession() {
    const current = skillRef.current
    const courseSeconds = videos.reduce(
      (sum, item) => sum + item.durationSeconds,
      0,
    )
    const unreported = elapsedRef.current - reportedRef.current
    if (!current?.skillCode || courseSeconds <= 0 || unreported <= 0) return

    reportedRef.current = elapsedRef.current
    const candidatePct = Math.min(
      100,
      Math.round(((secondsTotal + elapsedRef.current) / courseSeconds) * 100),
    )
    onSession(current.skillCode, unreported, candidatePct)
  }

  // The focus timer runs while the embed is on screen.
  useEffect(() => {
    if (!playing) return

    const timer = window.setInterval(() => {
      setElapsed((current) => {
        elapsedRef.current = current + 1
        return current + 1
      })
    }, 1000)

    const reporter = window.setInterval(
      reportSession,
      PARTIAL_REPORT_SECONDS * 1000,
    )
    return () => {
      window.clearInterval(timer)
      window.clearInterval(reporter)
    }
    // reportSession closes over the current video and totals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, videoIndex, secondsTotal])

  function requestClose() {
    // Flush the final unreported seconds, then stop playback so the timer
    // and reporter die with the dialog; the open-effect wipes the rest.
    reportSession()
    setPlaying(false)
    dialogRef.current?.close()
    onClose()
  }

  // Keyboard support for the tab list: arrow keys move between tabs,
  // Home and End jump to the ends, and focus carries activation with it.
  function onTablistKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowLeft'
        ? tab === 'overview'
          ? 'takeaways'
          : 'overview'
        : event.key === 'Home'
          ? 'overview'
          : event.key === 'End'
            ? 'takeaways'
            : null
    if (!next) return

    event.preventDefault()
    setTab(next)
    document.getElementById(TAB_BUTTON_IDS[next])?.focus()
  }

  if (!skill || !video) return null

  const completed = skill.status === 'completed'

  return (
    <dialog
      ref={dialogRef}
      className="learning-dialog"
      aria-labelledby="learning-video-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) requestClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) requestClose()
      }}
    >
      <div className="learning-dialog-card">
        <header className="learning-head">
          <div>
            <p className="eyebrow">{skill.name}</p>
            <h2 id="learning-video-title">{video.title}</h2>
          </div>
          <button
            type="button"
            className="learning-close"
            aria-label={t('learning.close')}
            disabled={busy}
            onClick={requestClose}
          >
            ×
          </button>
        </header>

        {videos.length > 1 && (
          <div
            className="learning-video-picker"
            role="group"
            aria-label={t('learning.courseVideos')}
          >
            {videos.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === videoIndex ? 'active' : ''}
                disabled={busy}
                onClick={() => {
                  setVideoIndex(index)
                  setPlaying(false)
                }}
              >
                {item.duration}
              </button>
            ))}
          </div>
        )}

        {/* Thumbnail first; the embed loads only after the learner picks play. */}
        <div className="learning-stage">
          {playing ? (
            <iframe
              src={videoEmbedUrl(video.id)}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <button
              type="button"
              className="learning-thumb"
              aria-label={t('learning.play')}
              onClick={() => setPlaying(true)}
            >
              <img src={videoThumbnail(video.id)} alt="" loading="lazy" />
              <span className="learning-play" aria-hidden="true">
                ▶
              </span>
            </button>
          )}
        </div>

        <div className="learning-meta-row">
          <span className="learning-channel">{video.channel}</span>
          <span>{video.duration}</span>
          {playing && (
            <span className="learning-timer" aria-label={t('learning.focus')}>
              ⏱ {formatClock(elapsed)}
            </span>
          )}
        </div>

        <div className="learning-progress-row">
          <div
            className="learning-progress-track"
            role="progressbar"
            aria-valuenow={Math.min(100, progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('learning.progress', { n: progressPct })}
          >
            <span style={{ width: `${Math.min(100, progressPct)}%` }} />
          </div>
          <small>
            {t('learning.progress', { n: progressPct })}
            {sessions > 0 && ' · ' + t('learning.sessions', { n: sessions })}
          </small>
        </div>

        <div
          className="learning-tabs"
          role="tablist"
          aria-label={t('learning.tabs')}
          onKeyDown={onTablistKeyDown}
        >
          <button
            type="button"
            role="tab"
            id={TAB_BUTTON_IDS.overview}
            aria-controls={TAB_PANEL_IDS.overview}
            aria-selected={tab === 'overview'}
            tabIndex={tab === 'overview' ? 0 : -1}
            className={tab === 'overview' ? 'active' : ''}
            onClick={() => setTab('overview')}
          >
            {t('learning.overview')}
          </button>
          <button
            type="button"
            role="tab"
            id={TAB_BUTTON_IDS.takeaways}
            aria-controls={TAB_PANEL_IDS.takeaways}
            aria-selected={tab === 'takeaways'}
            tabIndex={tab === 'takeaways' ? 0 : -1}
            className={tab === 'takeaways' ? 'active' : ''}
            onClick={() => setTab('takeaways')}
          >
            {t('learning.takeaways')}
          </button>
        </div>

        <div className="learning-tab-panel">
          <div
            role="tabpanel"
            id={TAB_PANEL_IDS.overview}
            aria-labelledby={TAB_BUTTON_IDS.overview}
            hidden={tab !== 'overview'}
            tabIndex={0}
          >
            <p>{t('learning.overviewNote')}</p>
            <dl className="learning-facts">
              <div>
                <dt>{t('learning.factChannel')}</dt>
                <dd>{video.channel}</dd>
              </div>
              <div>
                <dt>{t('learning.factDuration')}</dt>
                <dd>{video.duration}</dd>
              </div>
              <div>
                <dt>{t('learning.factVerified')}</dt>
                <dd>{video.verifiedAt}</dd>
              </div>
            </dl>
          </div>
          <div
            role="tabpanel"
            id={TAB_PANEL_IDS.takeaways}
            aria-labelledby={TAB_BUTTON_IDS.takeaways}
            hidden={tab !== 'takeaways'}
            tabIndex={0}
          >
            <ul className="learning-takeaways">
              <li>{t('learning.tip1')}</li>
              <li>{t('learning.tip2')}</li>
              <li>{t('learning.tip3', { name: skill.name })}</li>
            </ul>
          </div>
        </div>

        <footer className="learning-actions">
          <a
            className="link-btn"
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noreferrer"
          >
            {t('learning.watchOnYouTube')}
          </a>
          <button
            type="button"
            className="btn"
            disabled={busy || completed}
            onClick={() => onMarkCompleted(skill)}
          >
            {completed ? t('learning.marked') : t('learning.markCompleted')}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
