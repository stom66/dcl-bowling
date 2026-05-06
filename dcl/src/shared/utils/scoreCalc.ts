export type FrameResult = {
	frameNumber : number
	totalScore  : number
	runningScore: number | undefined
	scores      : number[]
	isStrike    : boolean
	isSpare     : boolean
}

export function getFrameResults(frames: number[][]): FrameResult[] {
	// So, we're going to get given an array of frames, each frame is an array of numbers.
	// We need to return an array of objects, which contain: 
	// frameNumber (starting at 1), totalScore, runningScore, and scores (array of numbers)

	const results: FrameResult[] = []

	// First pass just fills in the easy data
	for (let i = 0; i < frames.length; i++) {
		const frame      = frames[i]
		const totalScore = frame.reduce((a, b) => a + b, 0)
		const isStrike   = frame[0]            == 10
		const isSpare    = frame[0] + frame[1] == 10 && !isStrike

		results.push({
			frameNumber : i + 1,
			totalScore  : totalScore,
			runningScore: undefined,
			scores      : frame,
			isStrike    : isStrike,
			isSpare     : isSpare
		})
	}

	// Second pass calculetes the running scores	
	var runningScore = 0
	for (let [index, frameResult] of results.entries()) {

		// STRIKE: If the current frame is a strike, add the score of the next two balls
		if (frameResult.isStrike) {
			runningScore += 10

			if (frameResult.frameNumber == 10) {
				runningScore += frameResult.scores[1]
				runningScore += frameResult.scores[2]
				frameResult.runningScore = runningScore
			}

			const nextFrame = results[index + 1]
			if (nextFrame) {

				// Is the next frame the final frame?
				if (nextFrame.frameNumber == 10) {
					if (nextFrame.scores[0]) runningScore += nextFrame.scores[0]
					if (nextFrame.scores[1]) runningScore += nextFrame.scores[1]
					frameResult.runningScore = runningScore
				}

				else if (nextFrame.isStrike) {

					runningScore += nextFrame.totalScore
					// Also add the value of the next ball
					const nextNextFrame = results[index + 2]
					if (nextNextFrame) {
						if (nextNextFrame.scores[0]) runningScore += nextNextFrame.scores[0]
						frameResult.runningScore = runningScore
					}
				} 
				
				else {
					runningScore += nextFrame.totalScore
					frameResult.runningScore = runningScore
				}
			}

		}
		
		// SPARE: If the current frame is a spare, add the score of the next one ball
		if (frameResult.isSpare) {
			runningScore += 10
			const nextFrame = results[index + 1]
			if (nextFrame) {
				if (nextFrame.scores[0]) runningScore += nextFrame.scores[0]
				frameResult.runningScore = runningScore
			}
		}

		// OPEN: If the current frame is not a strike or spare, add the total score of the previous frame
		if (!frameResult.isStrike && !frameResult.isSpare) {
			//const lastFrame = results[index - 1]
			//if (lastFrame) runningScore += lastFrame.totalScore

			// Add the score from this frame
			runningScore += frameResult.totalScore

			// Frame was not a strike. Store the running score immediately
			frameResult.runningScore = runningScore
		}
	}

	

	return results
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
			//[10],
			//[10],
			//[10,10,10]
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