import { GameFrameCount, normalizeFrameCount } from "src/shared/settings"

export type FrameResult = {
	frameNumber : number
	totalScore  : number
	runningScore: number | undefined
	scores      : number[]
	isStrike    : boolean
	isSpare     : boolean
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
 */
export function getFrameResults(
	frames    : number[][],
	frameCount: number,
): FrameResult[] {
	const length = normalizeFrameCount(frameCount)

	const frameResults: FrameResult[] = []

	let lastFrameIsPending = false
	for (const [i, frame] of frames.entries()) {
		const totalScore   = frame.reduce((a, b) => a + b, 0)
		const isStrike     = frame[0]            === 10
		const isSpare      = frame[0] + frame[1] === 10 && !isStrike
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


export function getDummyScoreData() {
	const frames = new Map<string, number[][]>()

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
		[6,0],
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
		[8,2],
	])

	return frames
}
