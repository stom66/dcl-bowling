import { GameFrameCount, normalizeFrameCount } from "src/shared/settings"
import { isSplitLeave, splitLabel } from "src/shared/utils/splits"

export type FrameResult = {
	frameNumber : number
	totalScore  : number
	runningScore: number | undefined
	scores      : number[]
	isStrike    : boolean
	isSpare     : boolean
	isSplit     : boolean
	splitLabel  : string | undefined
	isPending   : boolean // Are we waiting on follow-up bowls to amend this score? Eg, strikes
}


// MARK: getPlayerTotalScore
/**
 * Returns the final running score, or zero when there are no frame results.
 */
export function getPlayerTotalScore(frameResults: FrameResult[]): number {
	const finalFrame = frameResults[frameResults.length - 1]
	return finalFrame?.runningScore ?? 0
}



// MARK: IsFinalFrame
/**
 * True when `frameNumber` (1-based) is the last frame of a game of `frameCount`.
 */
function IsFinalFrame(
	frameNumber: number,
	frameCount : GameFrameCount,
): boolean {
	return frameNumber === frameCount
}



// MARK: getFrameResults
/**
 * Builds per-frame totals and running score for a scorecard of `frameCount` frames.
 * `leaves` is the roll-0 standing-pin bitmask for each frame. A missing leave is not a split.
 */
export function getFrameResults(
	frames    : number[][],
	frameCount: number,
	leaves?   : number[],
): FrameResult[] {
	const length = normalizeFrameCount(frameCount)

	const frameResults: FrameResult[] = []

	let lastFrameIsPending = false
	for (const [i, frame] of frames.entries()) {
		const totalScore   = frame.reduce((a, b) => a + b, 0)
		const isStrike     = frame[0]            === 10
		const isSpare      = frame[0] + frame[1] === 10 && !isStrike
		const leave        = leaves?.[i] ?? 0
		const isSplit      = isSplitLeave(leave)
		const isFinalFrame = IsFinalFrame(i + 1, length)

		let isPending = false
		if (lastFrameIsPending) isPending = true
		else {
			if (isStrike) {
				isPending = true

				if (isFinalFrame && frame.length > 2) {
					isPending = false
				} else {
					const nextFrame     = frames[i + 1]
					const nextNextFrame = frames[i + 2]
					if (nextFrame) {
						if (nextFrame.length > 1) {
							isPending = false
						} else {
							if (nextNextFrame) {
								if (nextNextFrame.length >= (2 - nextFrame.length)) {
									isPending = false
								}
							}
						}
					}
				}
			}
			if (isSpare) {
				isPending = true
				const nextFrame = frames[i + 1]
				if (nextFrame && nextFrame[0] !== undefined) {
					isPending = false
				}
			}

			if (isPending) lastFrameIsPending = true
		}

		const frameResult: FrameResult = {
			frameNumber : i + 1,
			totalScore  : totalScore,
			runningScore: undefined,
			scores      : frame,
			isStrike    : isStrike,
			isSpare     : isSpare,
			isSplit     : isSplit,
			splitLabel  : splitLabel(leave),
			isPending   : isPending
		}
		frameResults.push(frameResult)
	}

	let runningScore = 0
	for (let [index, frameResult] of frameResults.entries()) {

		runningScore += frameResult.totalScore

		const nextFrame     = frameResults[index + 1]
		const nextNextFrame = frameResults[index + 2]

		if (frameResult.isStrike && !IsFinalFrame(frameResult.frameNumber, length)) {

			if (nextFrame) {

				if (IsFinalFrame(nextFrame.frameNumber, length)) {
					if (nextFrame.scores[0] !== undefined) runningScore += nextFrame.scores[0]
					if (nextFrame.scores[1] !== undefined) runningScore += nextFrame.scores[1]
				} else {
					if (nextFrame.scores[0] !== undefined) runningScore += nextFrame.scores[0]

					if (nextFrame.scores[1] !== undefined) {
						runningScore += nextFrame.scores[1]
					}
					else if (nextNextFrame && nextNextFrame.scores[0] !== undefined) {
						runningScore += nextNextFrame.scores[0]
					}
				}
			}
		}

		if (frameResult.isSpare) {
			if (nextFrame && nextFrame.scores[0] !== undefined) {
				runningScore += nextFrame.scores[0]
			}
		}

		frameResult.runningScore = runningScore
	}

	return frameResults
}


// Pins 7 and 10 standing: head pin down, two groups that do not touch.
const DUMMY_SPLIT_7_10 = (1 << 6) | (1 << 9)


// MARK: getDummyScoreData
/**
 * Fake scorecards for the debug scoreboard.
 * The second card opens with an 8 that leaves a 7-10 split.
 */
export function getDummyScoreData() {
	const frames = new Map<string, number[][]>()
	const leaves = new Map<string, number[]>()

	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF', [
		[10],
		[10],
		[10],
		[10],
		[10,10,10]
	])

	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEB', [
		[8,0],
		[3,7],
		[9,0],
		[7,0],
		[6,4],
	])
	leaves.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEB', [
		DUMMY_SPLIT_7_10,
		0,
		0,
		0,
		0,
	])
	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEC', [
		[3,4],
		[10],
		[7,3],
		[8,0],
		[7,0],
	])
	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEED', [
		[9,1],
		[7,3],
		[8,2],
		[8],
	])

	return { frames, leaves }
}
