import { isServer } from '@dcl/sdk/network'
import { engine } from '@dcl/sdk/ecs'
import { setQuestions } from './shared/series'
import { registerValidators } from './shared/schemas'
import { sinceLoad } from './shared/clock'
import {
  AskResult,
  IntroResult,
  Participation,
  askQuestions,
  configure,
  enroll,
  getParticipation,
  setupFeedbackState,
  showIntro
} from './client/state'
import { setupUi } from './client/ui'
import { ASK_PARTICIPANTS_ONLY, DEBUG, INTRO, PREVIEW_MOBILE, QUESTIONS } from '../questions'

// Static import on purpose: registerMessages() defines a component, so it must run at module load, before the engine seals.
import './shared/messages'

export type { AskResult, IntroResult, Participation }

// Importing { feedback } is the whole setup, client and server. Questions set at module load,
// the rest on the first tick, which comes after main(): syncEntity throws before that.
setQuestions(QUESTIONS)
configure(INTRO, ASK_PARTICIPANTS_ONLY, PREVIEW_MOBILE)
console.log('[FEEDBACK] loaded')

function startOnFirstTick(): void {
  engine.removeSystem(startOnFirstTick)
  console.log(`[FEEDBACK] starting on the ${isServer() ? 'server' : 'client'} at +${sinceLoad()}`)
  if (isServer()) {
    registerValidators()
    // Dynamic import keeps @dcl/sdk/server (Storage) out of the client path.
    void import('./server/server').then(({ startServer }) => startServer(INTRO))
    return
  }
  setupFeedbackState()
  setupUi(DEBUG)
}
engine.addSystem(startOnFirstTick)

type QuestionId = keyof typeof QUESTIONS

export type AskOptions = {
  // show even if already seen at this trigger this visit
  repeat?: boolean
  // comment field: true (default) all, false none, or only these ids, e.g. ['playMore'].
  // Only hides: a Question without commentPrompt never shows one.
  comment?: boolean | readonly QuestionId[]
}

// Dynamic mode. Queued, shown once nothing else is on screen and the server is up.
// Array = Group: one panel, Questions one after another, progress bar.
// Resolves when the player is done: one result, or one per id in order. Once per visit per trigger.
function ask(questionId: QuestionId, trigger: string, options?: AskOptions): Promise<AskResult>
function ask(questionIds: readonly QuestionId[], trigger: string, options?: AskOptions): Promise<AskResult[]>
function ask(
  ids: QuestionId | readonly QuestionId[],
  trigger: string,
  options?: AskOptions
): Promise<AskResult | AskResult[]> {
  const group = typeof ids === 'string' ? [ids] : ids
  const results = isServer()
    ? Promise.resolve(group.map((): AskResult => 'not-shown'))
    : askQuestions(group, trigger, options)
  return typeof ids === 'string' ? results.then((r) => r[0]) : results
}

// Static mode: player-initiated (button, kiosk, area). Intro, then the batch as one Group, on every call,
// whatever the answer to feedback.intro(). Its Intro only greets: participation stays as it was.
// Closes a game panel on screen (a game Intro comes back after). Ignored (not-shown) while the previous call is open or waiting.
function leaveFeedback(questionIds: readonly QuestionId[], trigger: string): Promise<AskResult[]> {
  if (isServer()) return Promise.resolve(questionIds.map((): AskResult => 'not-shown'))
  return askQuestions(questionIds, trigger, { repeat: true, source: 'player' })
}

// Dynamic mode opt-in (INTRO in questions.ts): yes = participant, no = no game Questions this visit.
// Game Questions wait until it is answered. Once per visit, only while participation is unknown, else not-shown.
function intro(trigger: string): Promise<IntroResult> {
  if (isServer()) return Promise.resolve('not-shown')
  return showIntro(trigger)
}

// Participant without the Intro, e.g. hand-picked players. CSV row: questionId intro, ratingLabel enrolled.
function enrollPlayer(trigger: string): void {
  if (!isServer()) enroll(trigger)
}

// 'in', 'out' (said no to the Intro) or 'unknown'.
function participation(): Participation {
  return getParticipation()
}

export const feedback = { intro, enroll: enrollPlayer, participation, ask, leaveFeedback }
