// Static catalogue of learning videos, verified at build time and bundled
// with the app. No YouTube API is called at runtime.
import rawData from '../../data/learning_videos.json'

export type LearningVideo = {
  id: string
  title: string
  channel: string
  channelId: string
  durationSeconds: number
  duration: string
  verifiedAt: string
}

export type LearningVideosMeta = {
  generated: string
  source: string
  channels: Record<string, { channelId: string; rss?: string }>
  verifyCommand: string
}

export const learningVideosMeta = rawData.meta as LearningVideosMeta

const videoData = rawData as {
  meta: LearningVideosMeta
  skills: Record<string, LearningVideo[]>
}

// Look up videos by the skill name the profile displays. Skills without an
// entry simply have no video block.
export function videosForSkill(name: string): LearningVideo[] {
  return videoData.skills[name] ?? []
}

// Thumbnail straight from the standard YouTube image host.
export function videoThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

// Privacy-enhanced embed URL; the iframe itself lives in LearningPlayer.
export function videoEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`
}
