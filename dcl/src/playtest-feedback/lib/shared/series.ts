// Set once at module load, so the client and the server see the same Questions.
import { Scale } from './scales'

export type QuestionSpec = {
  text: string
  scale: Scale
  // comment field placeholder; omit for rating only
  commentPrompt?: string
  // LOCAL PATCH (bowling): text box only, no rating tiles. Reapply after replacing lib/.
  commentOnly?: boolean
  // LOCAL PATCH (bowling): 1x5 sheet in assets/playtest-feedback/. Frame n is rating n.
  iconSheet?: string
  // LOCAL PATCH (bowling): text and one button, then the next question. Not saved.
  continueLabel?: string
}

export type IntroSpec = {
  title: string
  text: string
  // see INTRO in questions.ts
  avatar?: string | null
}

export type Question = {
  id: string
  text: string
  scale: Scale
  commentPrompt?: string
  // LOCAL PATCH (bowling): text box only, no rating tiles.
  commentOnly?: boolean
  // LOCAL PATCH (bowling): 1x5 sheet in assets/playtest-feedback/. Frame n is rating n.
  iconSheet?: string
  // LOCAL PATCH (bowling): text and one button, then the next question. Not saved.
  continueLabel?: string
}

let series: Question[] = []

export function setQuestions(specs: Record<string, QuestionSpec>): void {
  if (INTRO_ID in specs) console.log(`[FEEDBACK] '${INTRO_ID}' is reserved for the Intro's CSV rows: rename that Question`)
  series = Object.keys(specs).map((id) => ({
    id,
    text: specs[id].text,
    scale: specs[id].scale,
    commentPrompt: specs[id].commentPrompt,
    commentOnly: specs[id].commentOnly,
    iconSheet: specs[id].iconSheet,
    continueLabel: specs[id].continueLabel
  }))
}

export function allQuestions(): readonly Question[] {
  return series
}

export function findQuestion(id: string): Question | undefined {
  return series.find((q) => q.id === id)
}

export const MAX_RATING = 5
// ratingLabel when neither rating nor comment (Skip, or panel closed)
export const SKIPPED_LABEL = 'skipped'
// questionId of Intro and enroll() rows. Reserved: no Question may use it.
export const INTRO_ID = 'intro'
// sent as rating = index here
export const INTRO_ANSWERS = ['declined', 'accepted', 'enrolled'] as const
export type IntroAnswer = (typeof INTRO_ANSWERS)[number]
export const MAX_COMMENT_LENGTH = 1000
export const HEARTBEAT_MS = 2000
export const HEARTBEAT_FRESHNESS_MS = 6000
