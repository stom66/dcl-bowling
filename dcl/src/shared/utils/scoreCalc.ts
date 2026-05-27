import { GameSettings } from "../settings"

export type FrameResult = {
	frameNumber : number
	totalScore  : number
	runningScore: number | undefined
	scores      : number[]
	isStrike    : boolean
	isSpare     : boolean
	isPending   : boolean // Are we waiting on follow-up bowls to amend this score? Eg, strikes
}


export function getPlayerTotalScore(frameResults: FrameResult[]): number {
	return frameResults[frameResults.length - 1].runningScore ?? 0
}

function IsFinalFrame(frameNumber: number): boolean {
	return frameNumber == GameSettings.MAX_FRAMES_PER_GAME
}

export function getFrameResults(frames: number[][]): FrameResult[] {
	// So, we're going to get given an array of frames, each frame is an array of numbers.
	// We need to return an array of objects, which contain: 
	// frameNumber (starting at 1), totalScore, runningScore, and scores (array of numbers)

	const frameResults: FrameResult[] = []

	// First pass just fills in the easy data
	let lastFrameIsPending = false
	for (const [i, frame] of frames.entries()) {
		const totalScore      = frame.reduce((a, b) => a + b, 0)
		const isStrike        = frame[0]            === 10
		const isSpare         = frame[0] + frame[1] === 10 && !isStrike
		const isFinalFrame    = IsFinalFrame(i+1)

		let isPending = false
		if (lastFrameIsPending) isPending = true
		else {
			if (isStrike) {
				isPending = true

				if (isFinalFrame && frame.length > 2) {
					isPending = false
				} else {
					// Check if we have two rolls after the strike
					const nextFrame = frames[i + 1]
					const nextNextFrame = frames[i + 2]
					if (nextFrame) {
						if (nextFrame.length > 1) { // Does the next frame have 2 scores?
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

	// Second pass calculetes the running scores	
	let runningScore = 0
	for (let [index, frameResult] of frameResults.entries()) {

		// add all the scores from this frame to the running score
		runningScore += frameResult.totalScore

		const nextFrame = frameResults[index + 1]
		const nextNextFrame = frameResults[index + 2]

		// STRIKE: If the current frame is a strike, add the score of the next two balls
		if (frameResult.isStrike && !IsFinalFrame(frameResult.frameNumber)) {

			if (nextFrame) {

				// Is the next frame the final frame? Then we just add the first two scores (they should be there)
				if (IsFinalFrame(nextFrame.frameNumber)) {
					if (nextFrame.scores[0] !== undefined) runningScore += nextFrame.scores[0]
					if (nextFrame.scores[1] !== undefined) runningScore += nextFrame.scores[1]
				} else {
					// add the first score from the next frame
					if (nextFrame.scores[0] !== undefined) runningScore += nextFrame.scores[0]

					// add the second score from the next frame 
					if (nextFrame.scores[1] !== undefined) {
						runningScore += nextFrame.scores[1]
					} 
					// If there's not a second score, but there is a score in the nextNExt, add that
					else if (nextNextFrame && nextNextFrame.scores[0] !== undefined) {
						runningScore += nextNextFrame.scores[0]
					}
				}
			}
		}
		
		// SPARE: If the current frame is a spare, add the score of the next one ball
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

	// Add example dummy user with ten frames, each an array of numbers representing individual balls
	/* frames.set('0xCEC7e38e088A87D77F2B60Fcae6840D00E018155', [
		[10],     
		[7, 2],   
		[9, 0],   
		[10],     
		[0, 8],   
		[8, 2],   
		[0, 6],   
		[10],     
		[10],     
		[10, 8, 1]
	])

	

	
	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEA', [
		[5, 0],
		[10],
		[10],
		[10],
		[10],
		[10],
	]) */

	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF', [
		[10],
		[10],
		[10],
		[10],
		[10],
		[10],
		[10],
		[10],
		[10],
		[10,10,10]
	])

		// Real-world exmaple set
	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEB', [
		[10],
		[9,0],
		[10],
		[7,0],
		[0,9],
		[8,0],
		[3,7],
		[9,0],
		[7,0],
		[6,0],
	])
	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEC', [
		[8,2],
		[10],
		[9,0],
		[7,1],
		[4,0],
		[3,4],
		[10],
		[7,3],
		[8,0],
		[7,0],
	])
	frames.set('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEED', [
		[7,1],
		[3,5],
		[5,5],
		[10],
		[4,6],
		[9,1],
		[7,3],
		[8,2],
		[8,2],
	])

	return frames
}