import { engine } from '@dcl/sdk/ecs'
import { isStateSyncronized } from '@dcl/sdk/network'
import { getPlatform, isMobile } from '@dcl/sdk/platform'
import { getRealm } from '~system/Runtime'
import { room } from '../shared/messages'
import {
  HEARTBEAT_FRESHNESS_MS,
  INTRO_ANSWERS,
  INTRO_ID,
  IntroAnswer,
  IntroSpec,
  MAX_COMMENT_LENGTH,
  Question,
  findQuestion
} from '../shared/series'
import { ServerHeartbeat } from '../shared/schemas'
import { sinceLoad } from '../shared/clock'
import { findSceneOwner } from './owner'

// Alive = heartbeat value changed recently on the client clock. A stale CRDT snapshot from
// an earlier server run never advances.
let lastBeatValue = 0
let lastBeatSeenAt = 0

// newest across entities: one left over from an earlier server run may still be there
function pollHeartbeat(): void {
  let newest = 0
  for (const [, hb] of engine.getEntitiesWith(ServerHeartbeat)) newest = Math.max(newest, hb.beatAt)
  if (newest === lastBeatValue) return
  // first value seen may be a stale snapshot: alive from the first change
  if (lastBeatValue === 0) {
    lastBeatValue = newest
    return
  }
  if (lastBeatSeenAt === 0) console.log(`[FEEDBACK] first server heartbeat at +${sinceLoad()}`)
  lastBeatValue = newest
  lastBeatSeenAt = Date.now()
}

export function isServerAlive(): boolean {
  if (!isStateSyncronized()) return false
  if (lastBeatSeenAt === 0) return false
  return Date.now() - lastBeatSeenAt < HEARTBEAT_FRESHNESS_MS
}

// not-shown: already asked at this trigger this visit, server never came up, or Group closed before it
export type AskResult = 'submitted' | 'skipped' | 'not-shown'

export type AskOptions = {
  repeat?: boolean
  comment?: boolean | readonly string[]
  // game (default): Intro once per visit. player (leaveFeedback): Intro every time, a greeting only:
  // yes opens the Group, no drops it, participation untouched.
  // LOCAL PATCH (bowling): the intro buttons set participation for game and debug.
  // 'out' blocks later feedback.ask() calls. Leave feedback still leaves it untouched.
  source?: AskSource
}

export type AskSource = 'game' | 'player' | 'debug'

// one ask() call
type Ask = {
  // slot: index in ask()'s ids. answer: kept by Next/Back until sent. left: Next or Back took the player off it
  steps: {
    question: Question
    slot: number
    comment: boolean
    answer?: { rating: number; comment: string }
    left?: boolean
  }[]
  // furthest step shown, -1 before the first: steps up to it get a Response, the rest not-shown
  reached: number
  // step to show first: 0, or where Leave feedback interrupted it
  at: number
  // what was on screen at that step when interrupted, not yet confirmed with Next: shown again, × still skips it
  draft?: { rating: number; comment: string }
  trigger: string
  source: AskSource
  // intro: the Intro alone (showIntro()), no steps. results[0]: submitted = accepted, skipped = declined.
  kind: 'group' | 'intro'
  // Intro answered yes for this Group (leaveFeedback shows it first)
  introDone: boolean
  // one per id passed to ask(), same order
  results: AskResult[]
  resolve: (results: AskResult[]) => void
  askedAt: number
}

const queue: Ask[] = []
let current: Ask | undefined
let step = 0
// "id|trigger" shown this visit
const shown = new Set<string>()
// a queued Group gives up if the server stays down this long
const SERVER_WAIT_MS = 120_000

export function askQuestions(questionIds: readonly string[], trigger: string, options: AskOptions = {}): Promise<AskResult[]> {
  const results: AskResult[] = questionIds.map(() => 'not-shown')
  const steps: Ask['steps'] = []
  const source = options.source ?? 'game'
  // while an Intro is pending, Questions queue behind it instead of being dropped
  if (source === 'game' && !gameMayAsk() && (participation === 'out' || !introPending())) {
    const out = participation === 'out'
    const why = out ? 'player said no to the Intro' : 'not a participant: feedback.intro() or feedback.enroll() first'
    console.log(`[FEEDBACK] ${why}, not showing ${questionIds.join(', ')}`)
    return Promise.resolve(results)
  }
  if (source === 'player' && (current?.source === 'player' || queue.some((a) => a.source === 'player'))) {
    console.log('[FEEDBACK] leaveFeedback() already open or waiting, ignored')
    return Promise.resolve(results)
  }
  questionIds.forEach((id, slot) => {
    const question = findQuestion(id)
    if (!question) return console.log(`[FEEDBACK] unknown question ${id}`)
    if (!options.repeat && isTaken(question.id, trigger)) return
    if (steps.some((s) => s.question.id === question.id)) return
    steps.push({ question, slot, comment: commentAllowed(question, options.comment) })
  })
  if (steps.length === 0) return Promise.resolve(results)

  return new Promise((resolve) => {
    const ask: Ask = { kind: 'group', steps, reached: -1, at: 0, trigger, source, introDone: false, results, resolve, askedAt: Date.now() }
    if (source !== 'player') {
      queue.push(ask)
      return
    }
    // the Intro on screen already greets them: the batch opens without a second one
    if (feedback.phase === 'intro') ask.introDone = true
    // server down: a game Intro or Question on screen stays, this waits behind it for the server,
    // up to SERVER_WAIT_MS (the Intro on screen is queue[0], a Question is `current`, outside the queue)
    if (feedback.phase !== 'idle' && !isServerAlive()) {
      queue.splice(feedback.phase === 'intro' ? 1 : 0, 0, ask)
      return
    }
    // the player asked: the game's panel steps aside and comes back after, where it was
    if (feedback.phase === 'open' && current) {
      if (cameBack()) keepAnswer()
      else current.draft = hasAnswer() ? { rating: feedback.rating, comment: feedback.comment } : undefined
      current.at = step
      queue.unshift(current)
      current = undefined
    }
    if (feedback.phase !== 'idle') {
      feedback.phase = 'idle'
      // its server wait starts over
      queue[0].askedAt = Date.now()
    }
    queue.unshift(ask)
  })
}

function commentAllowed(question: Question, comment: AskOptions['comment'] = true): boolean {
  if (question.commentPrompt === undefined) return false
  return typeof comment === 'boolean' ? comment : comment.includes(question.id)
}

function isTaken(questionId: string, trigger: string): boolean {
  const same = (a: Ask) => a.trigger === trigger && a.steps.some((s) => s.question.id === questionId)
  return shown.has(`${questionId}|${trigger}`) || (current !== undefined && same(current)) || queue.some(same)
}

function processQueue(): void {
  const alive = isServerAlive()
  // An Intro alone shows without the server, its answer waits in the outbox. One with Questions
  // behind it waits for the server with them, so Give feedback leads straight into the first.
  if (!alive && feedback.phase === 'idle' && queue[0]?.kind === 'intro' && queue.length === 1) {
    feedback.phase = 'intro'
    return
  }
  if (!alive) {
    for (let i = queue.length - 1; i >= 0; i--) {
      // an Intro never expires: it gates every later ask(). The one on screen stays until answered.
      if (queue[i].kind === 'intro' || (i === 0 && feedback.phase === 'intro')) continue
      if (Date.now() - queue[i].askedAt < SERVER_WAIT_MS) continue
      const ids = queue[i].steps.map((s) => s.question.id).join(', ')
      console.log(`[FEEDBACK] server not up after ${SERVER_WAIT_MS / 1000} s, not showing ${ids}`)
      dropGroup(queue.splice(i, 1)[0])
    }
    return
  }
  if (feedback.phase !== 'idle' || queue.length === 0) return

  if (needsIntro(queue[0])) {
    feedback.phase = 'intro'
    return
  }
  if (queue[0].source === 'game' && !gameMayAsk()) {
    const [dropped] = queue.splice(0, 1)
    console.log(`[FEEDBACK] not a participant, not showing ${dropped.steps.map((s) => s.question.id).join(', ')}`)
    return dropGroup(dropped)
  }
  current = queue.shift()!
  showStep(current.at)
  if (!current.draft) return
  feedback.rating = current.draft.rating
  feedback.comment = current.draft.comment
  current.draft = undefined
}

// Gates the game's ask() this visit. in: yes to the Intro, or enroll(). out: no to the Intro.
export type Participation = 'unknown' | 'in' | 'out'
let participation: Participation = 'unknown'
let introAccepted: (() => void) | undefined
let introDeclined: (() => void) | undefined
let participantsOnly = true

// the game's ask() may show now
function gameMayAsk(): boolean {
  return participation === 'in' || (participation === 'unknown' && !participantsOnly)
}

export function getParticipation(): Participation {
  return participation
}

// LOCAL PATCH (bowling): runs after I'll answer some questions. Not Leave feedback.
export function setIntroAccepted(listener: () => void): void {
  introAccepted = listener
}

// LOCAL PATCH (bowling): runs after no, go away. Not Leave feedback.
export function setIntroDeclined(listener: () => void): void {
  introDeclined = listener
}

// Own CSV row (enrolled), to tell these players from Intro yeses. Drops an unanswered game Intro.
export function enroll(trigger: string): void {
  if (participation === 'in') return console.log('[FEEDBACK] already a participant, enroll ignored')
  console.log(`[FEEDBACK] player enrolled (${trigger})`)
  participation = 'in'
  sendIntroAnswer('enrolled', trigger)
  const index = queue.findIndex((a) => a.kind === 'intro' && a.source === 'game')
  if (index === -1) return
  const [dropped] = queue.splice(index, 1)
  if (index === 0 && feedback.phase === 'intro') feedback.phase = 'idle'
  dropped.resolve(dropped.results)
  processQueue()
}

let intro: IntroSpec | null = null

export function introSpec(): IntroSpec | null {
  return intro
}

// INTRO.avatar, else the scene owner's wallet once found (null until then, or if none)
let sceneOwner: string | null = null
export function introAvatar(): string | null {
  if (!intro) return null
  return intro.avatar === undefined ? sceneOwner : intro.avatar
}

export type IntroResult = 'accepted' | 'declined' | 'not-shown'

export function showIntro(trigger: string, source: AskSource = 'game'): Promise<IntroResult> {
  const pending = (a: Ask) => a.kind === 'intro'
  // debug shows it even when participation is known
  if (!intro || queue.some(pending) || (source !== 'debug' && participation !== 'unknown')) {
    return Promise.resolve('not-shown')
  }
  return new Promise<AskResult[]>((resolve) =>
    queue.push({ kind: 'intro', steps: [], reached: 0, at: 0, trigger, source, introDone: false, results: ['not-shown'], resolve, askedAt: Date.now() })
  ).then(([r]) => (r === 'submitted' ? 'accepted' : r === 'skipped' ? 'declined' : 'not-shown'))
}

// a shown Intro stays in the queue until answered; Leave feedback's Intro doesn't count
function introPending(): boolean {
  return queue.some((a) => a.kind === 'intro')
}

// set at module load, so intro() and enroll() work from main()
export function configure(introSpec: IntroSpec | null, onlyParticipants: boolean, previewMobile: boolean): void {
  intro = introSpec
  participantsOnly = onlyParticipants
  if (!intro && onlyParticipants)
    console.log('[FEEDBACK] INTRO is null and ASK_PARTICIPANTS_ONLY is true: ask() shows nothing until feedback.enroll()')
  previewMobileWanted = previewMobile
}

// PREVIEW_MOBILE applies once the realm is known to be a local preview
let previewMobileWanted = false
let previewMobile = false

// Mobile layout: own panel, 1600x720 virtual screen. false until the explorer reports the platform.
export function isMobileLayout(): boolean {
  return previewMobile || isMobile()
}

function needsIntro(ask: Ask): boolean {
  if (ask.kind === 'intro') return true
  return intro !== null && ask.source === 'player' && !ask.introDone
}

export function acceptIntro(): void {
  if (feedback.phase !== 'intro') return
  console.log('[FEEDBACK] intro accepted')
  sendIntroAnswer('accepted', queue[0]?.trigger ?? '')
  const ask = queue[0]
  // Leave feedback's Intro only greets. Game and debug intros set the visit flag.
  if (ask?.kind === 'intro' && ask.source !== 'player') {
    participation = 'in'
    introAccepted?.()
  }
  feedback.phase = 'idle'
  if (ask?.kind === 'intro') {
    queue.shift()
    ask.results[0] = 'submitted'
    ask.resolve(ask.results)
  } else if (ask) {
    ask.introDone = true
  }
  processQueue()
}

export function declineIntro(): void {
  if (feedback.phase !== 'intro') return
  console.log('[FEEDBACK] intro declined')
  sendIntroAnswer('declined', queue[0]?.trigger ?? '')
  feedback.phase = 'idle'
  // from Leave feedback: drop only this Group, the game's Questions are unaffected
  if (queue[0]?.kind === 'group' && queue[0].source === 'player') {
    const [dropped] = queue.splice(0, 1)
    return dropped.resolve(dropped.results)
  }
  const [answered] = queue.splice(0, 1)
  if (!answered) return
  answered.results[0] = 'skipped'
  answered.resolve(answered.results)
  // Leave feedback declines above, without touching participation.
  participation = 'out'
  introDeclined?.()
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].source !== 'game') continue
    const [dropped] = queue.splice(i, 1)
    dropped.resolve(dropped.results)
  }
}

function showStep(index: number): void {
  if (!current) return
  step = index
  current.reached = Math.max(current.reached, index)
  const { question, answer } = current.steps[index]
  shown.add(`${question.id}|${current.trigger}`)
  feedback.phase = 'open'
  feedback.question = question
  feedback.trigger = current.trigger
  feedback.withComment = current.steps[index].comment
  feedback.step = index + 1
  feedback.steps = current.steps.length
  // LOCAL PATCH (bowling): a continueLabel step is dialogue, not a scored question.
  const scored = current.steps.filter((s) => s.question.continueLabel === undefined)
  let seen = 0
  for (let i = 0; i <= index; i++) {
    if (current.steps[i].question.continueLabel === undefined) seen++
  }
  feedback.barSteps = scored.length
  feedback.barStep = seen
  feedback.rating = answer?.rating ?? 0
  feedback.comment = answer?.comment ?? ''
}

// idle → [intro →] open ⇄ (Next / Back) → idle
export type Phase = 'idle' | 'intro' | 'open'

const RESEND_MS = 3000
const GIVE_UP_MS = 30000
// "Thanks" toast after Submit: fades in, holds, fades out
const TOAST_FADE_IN_MS = 200
const TOAST_HOLD_MS = 2000
const TOAST_FADE_OUT_MS = 300

export const feedback = {
  phase: 'idle' as Phase,
  question: undefined as Question | undefined,
  trigger: '',
  withComment: true,
  // 1-based, "step/steps" in the progress bar
  step: 1,
  steps: 1,
  // LOCAL PATCH (bowling): progress ignores dialogue steps.
  barStep: 1,
  barSteps: 1,
  rating: 0, // 0 = no rating
  comment: ''
}

let toastAt = 0
const enteredAt = Date.now()

export function setRating(value: number): void {
  // tapping the selected rating again clears it
  feedback.rating = feedback.rating === value ? 0 : value
}

export function setComment(value: string): void {
  feedback.comment = value.slice(0, MAX_COMMENT_LENGTH)
}

// a rating or a comment, either counts
function hasAnswer(): boolean {
  return feedback.rating !== 0 || (feedback.withComment && feedback.comment.trim() !== '')
}

export function isFirstStep(): boolean {
  return feedback.step <= 1
}

export function isLastStep(): boolean {
  return feedback.step >= feedback.steps
}

// "Completed" replaces the bar: last step answered, only Submit left
export function isCompleted(): boolean {
  return feedback.steps > 1 && isLastStep() && hasAnswer()
}

// the step on screen was left with Next or Back and the player returned to it
function cameBack(): boolean {
  return current?.steps[step].left === true
}

// LOCAL PATCH (bowling): the sprite they picked, drawn in front of later question text.
let chosenMascotSheet: string | undefined
let chosenMascotFrame = 0

export function chosenMascot(): { sheet: string; frame: number } | undefined {
  if (chosenMascotSheet === undefined) return undefined
  return { sheet: chosenMascotSheet, frame: chosenMascotFrame }
}

function keepAnswer(): void {
  if (!current) return
  const question = current.steps[step].question
  // Dialogue has no rating. The click still counts as continuing.
  if (question.continueLabel) {
    current.steps[step].answer = { rating: 0, comment: '' }
    current.steps[step].left = true
    return
  }
  const rating = feedback.rating
  const answered = hasAnswer()
  current.steps[step].answer = answered ? { rating, comment: feedback.comment } : undefined
  current.steps[step].left = true
  const sheet = question.iconSheet
  if (sheet && answered && rating >= 1) {
    chosenMascotSheet = sheet
    chosenMascotFrame = rating - 1
  }
}


// MARK: continueDialogue
/**
 * Leaves a dialogue step. More questions in this group are shown next.
 * The last step closes the group so a follow-up ask can open.
 */
export function continueDialogue(): void {
  if (!current || feedback.phase !== 'open') return
  console.log(`[FEEDBACK] continueDialogue: step ${step + 1} of ${current.steps.length}`)
  if (step < current.steps.length - 1) {
    keepAnswer()
    showStep(step + 1)
    return
  }
  submitGroup()
}

// unanswered: the Question counts as skipped
export function nextStep(): void {
  if (!current || feedback.phase !== 'open' || isLastStep()) return
  keepAnswer()
  showStep(step + 1)
}

export function previousStep(): void {
  if (!current || feedback.phase !== 'open' || isFirstStep()) return
  keepAnswer()
  showStep(step - 1)
}

// One Response per reached step, sent in the background: the panel closes at once.
// Nothing answered: closes like ×, no "Thanks".
export function submitGroup(): void {
  if (!current || feedback.phase !== 'open' || !isLastStep()) return
  keepAnswer()
  if (current.steps.some((s) => s.answer && s.question.continueLabel === undefined)) showToast()
  sendGroup(current)
  finishGroup()
}

let toastText = 'Thanks for your feedback!'
let toastCheck = true
let toastHoldMs = TOAST_HOLD_MS
let toastAtPanel = false


// MARK: showToast
/**
 * Fades in a short notice. The thanks line is the default. `check` draws the tick.
 * `atPanel` places it where the question dialog sits instead of the top centre.
 */
export function showToast(
	message = 'Thanks for your feedback!',
	check   = true,
	holdMs  = TOAST_HOLD_MS,
	atPanel = false,
): void {
	toastText    = message
	toastCheck   = check
	toastHoldMs  = holdMs
	toastAtPanel = atPanel
	toastAt      = Date.now()
}


// MARK: toastLabel
/** The notice currently fading in. */
export function toastLabel(): string {
	return toastText
}


// MARK: toastShowsCheck
/** True when the notice should show the tick icon. */
export function toastShowsCheck(): boolean {
	return toastCheck
}


// MARK: toastAtPanel
/** True when the notice should sit where the question dialog sits. */
export function toastAtDialog(): boolean {
	return toastAtPanel
}

// × and Skip: answers kept with Next are sent. The step on screen: as shown if the player left it and came
// back (Back, or Next after a Back), else skipped. Unreached steps get no Response.
export function closeGroup(): void {
  if (!current || feedback.phase !== 'open') return
  if (cameBack()) keepAnswer()
  sendGroup(current)
  finishGroup()
}

// "Thanks" toast: 0 → 1 → 0, null when gone
export function toastOpacity(): number | null {
  const t = Date.now() - toastAt
  const fadeOutAt = TOAST_FADE_IN_MS + toastHoldMs
  if (toastAt === 0 || t > fadeOutAt + TOAST_FADE_OUT_MS) return null
  if (t < TOAST_FADE_IN_MS) return t / TOAST_FADE_IN_MS
  return t <= fadeOutAt ? 1 : 1 - (t - fadeOutAt) / TOAST_FADE_OUT_MS
}

function finishGroup(): void {
  if (!current) return
  const done = current
  feedback.phase = 'idle'
  feedback.question = undefined
  current = undefined
  resolveGroup(done)
}

// A queued Group given up on. One Leave feedback interrupted was already shown: what the player saw is sent, like ×.
function dropGroup(ask: Ask): void {
  if (ask.reached < 0) return ask.resolve(ask.results)
  sendGroup(ask)
  resolveGroup(ask)
}

function resolveGroup(done: Ask): void {
  // the whole Group, reached or not: closing it is an answer to all of it
  for (const s of done.steps) shown.add(`${s.question.id}|${done.trigger}`)
  done.steps.forEach((s, i) => {
    if (i <= done.reached) done.results[s.slot] = s.answer ? 'submitted' : 'skipped'
  })
  done.resolve(done.results)
}

// Each Response stays in the outbox until acked: resent every RESEND_MS while the server is up,
// dropped after GIVE_UP_MS.
type Payload = {
  requestId: string
  questionId: string
  trigger: string
  rating: number
  comment: string
  commentShown: boolean
  secondsInScene: number
  platform: string
}
type OutboxRow = { payload: Payload; firstSentAt: number; lastSentAt: number }
const outbox = new Map<string, OutboxRow>()

function sendGroup(ask: Ask): void {
  ask.steps.forEach((s, i) => {
    if (i > ask.reached) return
    // LOCAL PATCH (bowling): dialogue is a click-through, not an answer.
    if (s.question.continueLabel !== undefined) return
    sendRow({
      questionId: s.question.id,
      trigger: ask.trigger,
      rating: s.answer?.rating ?? 0,
      comment: s.comment ? (s.answer?.comment ?? '') : '',
      commentShown: s.comment
    })
  })
}

// Own CSV row, to count who agrees to answer. rating = index in INTRO_ANSWERS, the server writes it as ratingLabel.
function sendIntroAnswer(answer: IntroAnswer, trigger: string): void {
  sendRow({ questionId: INTRO_ID, trigger, rating: INTRO_ANSWERS.indexOf(answer), comment: '', commentShown: false })
}

function sendRow(fields: Omit<Payload, 'requestId' | 'secondsInScene' | 'platform'>): void {
  const id = newRequestId()
  const row: OutboxRow = {
    payload: {
      requestId: id,
      ...fields,
      secondsInScene: Math.round((Date.now() - enteredAt) / 1000),
      platform: getPlatform() ?? 'unknown'
    },
    firstSentAt: Date.now(),
    lastSentAt: 0
  }
  outbox.set(id, row)
  transmit(id, row, 'send')
}

function transmit(id: string, row: OutboxRow, kind: 'send' | 'resend'): void {
  console.log(`[FEEDBACK] ${kind} ${id} ${row.payload.questionId}`)
  row.lastSentAt = Date.now()
  void room.send('feedbackSubmit', row.payload)
}

function newRequestId(): string {
  // ~14 chars, e.g. "mfqz8k2x4f7a9c": the server dedupes across all players, so two must not collide in the same ms
  return Date.now().toString(36) + Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, '0')
}

// LOCAL PATCH (bowling): loaded once this visit. Answering now does not change it.
let priorGiven = false
let priorSettled = false
let priorRequestId = ''
let priorSentAt = 0
const PRIOR_RETRY_MS = 3000
const PRIOR_GIVE_UP_MS = 15000
const priorWaiters: Array<(given: boolean) => void> = []

function settlePrior(given: boolean): void {
  if (priorSettled) {
    if (given) priorGiven = true
    return
  }
  priorSettled = true
  priorGiven = given
  console.log(`[FEEDBACK] prior feedback ${given ? 'already given' : 'not yet'}`)
  const waiters = priorWaiters.splice(0)
  for (const waiter of waiters) waiter(given)
}

function requestPrior(now: number): void {
  if (priorRequestId === '') priorRequestId = newRequestId()
  priorSentAt = now
  void room.send('feedbackPriorQuery', { requestId: priorRequestId })
}

// MARK: gaveFeedbackBeforeVisit
/** True when this player submitted an answer on an earlier visit. */
export function gaveFeedbackBeforeVisit(): boolean {
  return priorGiven
}

// MARK: feedbackPrior
/**
 * Resolves once the server has said whether this player already gave feedback.
 * Gives up as not-yet if the server stays quiet.
 */
export function feedbackPrior(): Promise<boolean> {
  if (priorSettled) return Promise.resolve(priorGiven)
  return new Promise((resolve) => priorWaiters.push(resolve))
}

export function setupFeedbackState(): void {
  if (intro && intro.avatar === undefined) void findSceneOwner().then((owner) => (sceneOwner = owner))
  if (previewMobileWanted)
    void getRealm({}).then(({ realmInfo }) => {
      previewMobile = realmInfo?.isPreview === true
      console.log(`[FEEDBACK] PREVIEW_MOBILE ${previewMobile ? 'on' : 'ignored: not a local preview'}`)
    })
  room.onMessage('feedbackSaved', (data) => {
    console.log(`[FEEDBACK] ack ${data.requestId} ok=${data.ok}`)
    outbox.delete(data.requestId)
  })
  room.onMessage('feedbackPrior', (data) => {
    if (data.requestId !== priorRequestId) return
    settlePrior(data.given)
  })

  const priorStartedAt = Date.now()
  engine.addSystem(() => {
    pollHeartbeat()
    const now = Date.now()
    const alive = isServerAlive()
    if (!priorSettled && alive && now - priorSentAt > PRIOR_RETRY_MS) requestPrior(now)
    if (!priorSettled && now - priorStartedAt > PRIOR_GIVE_UP_MS) settlePrior(false)
    for (const [id, row] of outbox) {
      // give-up clock runs only while the server is up, for example an Intro answered during a cold start
      if (!alive) row.firstSentAt = now
      if (now - row.firstSentAt > GIVE_UP_MS) {
        console.log(`[FEEDBACK] no ack for ${id} after ${GIVE_UP_MS / 1000} s, giving up`)
        outbox.delete(id)
      } else if (now - row.lastSentAt > RESEND_MS && alive) {
        transmit(id, row, 'resend')
      }
    }
    processQueue()
  })
}
