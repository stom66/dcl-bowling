import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	alpha,
	AvatarIcon,
	Background,
	getTheme,
	Layer,
	Text,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { GameSettings } from 'src/shared/settings'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { FrameResult, getDummyScoreData, getFrameResults, getPlayerTotalScore } from 'src/shared/utils/scoreCalc'
import { getOrdinalSuffix } from 'src/shared/utils/strings'
import { timers } from 'src/shared/utils/timers'

import { ClientStore } from 'src/client/clientStore'


const DEBUG_FORCE_SHOW = false

const FRAME_CELL_WIDTH  = 52
const FRAME_CELL_HEIGHT = 45
const FRAME_CELL_MARGIN = 4

const FONT_SIZE_SCORE = 9

const clientStore = ClientStore.getInstance()


// MARK: ScoresLayer
/**
 * Bottom-center scoreboard. Slides in after roll playback and after a game ends.
 */
export class ScoresLayer extends Layer {
	private lastKnownScores    : Map<string, number[][]> | null = null
	private lastKnownFrameCount: number = GameSettings.DEFAULT_FRAME_COUNT
	private gameHasEnded = false

	constructor() {
		super({
			id         : 'bowling-scores',
			zone       : ZoneType.BottomCenter,
			canBeHidden: true,
			startHidden: !DEBUG_FORCE_SHOW,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			uiTransform: {
				height: 'auto',
				margin: { bottom: 16 },
			},
		})

		eventBus.on(ClientEvents.ON_MY_ROLL_START,             () => { this.hide(0.8) })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, () => { this.hide(0.8) })
		eventBus.on(ClientEvents.ON_GROUP_GAME_START,          () => {
			this.gameHasEnded = false
			const liveCount = clientStore.getFrameCount()
			if (liveCount > 0) this.lastKnownFrameCount = liveCount
		})
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,            () => {
			this.gameHasEnded = true
			this.showFinalScores()
		})
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END,   () => { this.show(0.8) })
	}


	// MARK: showFinalScores
	private showFinalScores() {
		this.show(0.8)
		timers.setTimeout(() => {
			this.hide(0.8)
		}, GameSettings.SHOW_FINAL_SCORES_DURATION)
	}


	// MARK: getFrames
	private getFrames(sortResults: boolean = false): Map<string, FrameResult[]> {
		let frames: Map<string, number[][]> | null = null
		if (!this.gameHasEnded) {
			frames = clientStore.getFrames() ?? new Map<string, number[][]>()
			if (DEBUG_FORCE_SHOW) frames = getDummyScoreData()
			if (frames.size > 0) {
				this.lastKnownScores     = frames
				const liveCount          = clientStore.getFrameCount()
				this.lastKnownFrameCount = liveCount > 0 ? liveCount : this.lastKnownFrameCount
			}
		} else {
			frames = this.lastKnownScores
		}

		if (frames === null) {
			return new Map<string, FrameResult[]>()
		}

		const frameCount = this.getActiveFrameCount(frames)
		const frameResults = new Map<string, FrameResult[]>()
		for (const [userId, frame] of frames.entries()) {
			frameResults.set(userId, getFrameResults(frame, frameCount))
		}

		if (!sortResults) return frameResults

		return new Map<string, FrameResult[]>([...frameResults.entries()].sort((a, b) => {
			return getPlayerTotalScore(b[1]) - getPlayerTotalScore(a[1])
		}))
	}



	// MARK: getActiveFrameCount
	/**
	 * Frame length for the scorecard currently on screen.
	 */
	private getActiveFrameCount(frames: Map<string, number[][]> | null): number {
		if (DEBUG_FORCE_SHOW) return 5

		const liveCount = clientStore.getFrameCount()
		if (liveCount > 0) return liveCount
		if (this.lastKnownFrameCount > 0) return this.lastKnownFrameCount

		let max = 0
		if (frames) {
			for (const frame of frames.values()) {
				if (frame.length > max) max = frame.length
			}
		}
		return max || GameSettings.DEFAULT_FRAME_COUNT
	}



	// MARK: getRowWidth
	private getRowWidth(
		showRanks     : boolean,
		showTotalScore: boolean,
	): number {
		let rowWidth = (FRAME_CELL_WIDTH + FRAME_CELL_MARGIN) * this.getActiveFrameCount(this.lastKnownScores)
		rowWidth += FRAME_CELL_HEIGHT + FRAME_CELL_MARGIN
		if (showRanks)      rowWidth += FRAME_CELL_HEIGHT + FRAME_CELL_MARGIN
		if (showTotalScore) rowWidth += FRAME_CELL_HEIGHT + FRAME_CELL_MARGIN
		return rowWidth
	}


	// MARK: getFramesUi
	private getFramesUi(
		userId      : string,
		frameResults: FrameResult[],
	) {
		const theme = getTheme()
		const ui    : ReactEcs.JSX.Element[] = []

		for (const [frameIndex, frameResult] of frameResults.entries()) {
			const frameScores: ReactEcs.JSX.Element[] = []

			for (let i = 0; i < frameResult.scores.length; i++) {
				const score = frameResult.scores[i]
				let scoreDisplay = score.toString()
				if (score === 0) scoreDisplay = '-'
				if (score === 10) scoreDisplay = 'X'
				if (i === 1 && frameResult.isSpare) scoreDisplay = '/'

				frameScores.push(
					<UiBox
						key             = {`ui_Scores_row_${userId}_frame_${frameIndex}_score_${i}`}
						width           = {16}
						height          = {18}
						margin          = {{ right: 2 }}
						borderRadius    = {3}
						backgroundColor = {theme.colors.info}
						alignItems      = "center"
						justifyContent  = "center"
					>
						<Text
							value     = {scoreDisplay}
							fontSize  = {9}
							fontColor = {theme.colors.light}
							textAlign = "middle-center"
							width     = "100%"
							height    = "100%"
						/>
					</UiBox>,
				)
			}

			ui.push(
				<UiBox
					key             = {`ui_Scores_row_${userId}_frame_${frameIndex}`}
					width           = {FRAME_CELL_WIDTH}
					height          = {45}
					margin          = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
					borderRadius    = {4}
					backgroundColor = {Color4.fromHexString(frameResult.isStrike ? '#1f354d' : frameResult.isSpare ? '#345981' : '#4c958166')}
					uiTransform     = {{ flexDirection: 'column' }}
				>
					<UiBox
						key            = {`ui_Scores_row_${userId}_frame_${frameIndex}_scores`}
						width          = "100%"
						height         = "50%"
						alignItems     = "flex-end"
						justifyContent = "flex-end"
						borderWidth    = {0}
						uiTransform    = {{ flexDirection: 'row' }}
					>
						{frameScores}
					</UiBox>
					<Text
						key       = {`ui_Scores_row_${userId}_frame_${frameIndex}_runningTotal`}
						value     = {frameResult.runningScore?.toString() ?? '-'}
						fontSize  = {14}
						fontColor = {alpha(theme.colors.light, frameResult.isPending ? 0.25 : 1)}
						textAlign = "middle-center"
						width     = "100%"
						height    = "50%"
					/>
				</UiBox>,
			)
		}

		return ui
	}


	// MARK: getScoreRows
	private getScoreRows(
		showRanks     : boolean,
		showTotalScore: boolean,
	) {
		const theme        = getTheme()
		const frameResults = this.getFrames(showRanks)
		const ui           : ReactEcs.JSX.Element[] = []
		const rowWidth     = this.getRowWidth(showRanks, showTotalScore)
		let rank           = 0

		for (const [userId, frameResult] of frameResults.entries()) {
			rank++
			ui.push(
				<UiBox
					key           = {`ui_Scores_row_${userId}`}
					width         = {rowWidth}
					height        = {FRAME_CELL_HEIGHT}
					alignItems    = "flex-start"
					margin        = {{ bottom: 5 }}
					borderWidth   = {0}
					uiTransform   = {{ flexDirection: 'row' }}
				>
					<Text
						key             = {`ui_Scores_row_${userId}_rank`}
						value           = {rank.toString() + getOrdinalSuffix(rank)}
						fontSize        = {16}
						fontColor       = {theme.colors.light}
						textAlign       = "middle-center"
						width           = {FRAME_CELL_HEIGHT}
						height          = {FRAME_CELL_HEIGHT}
						backgroundColor = {theme.colors.info}
						borderRadius    = {8}
						margin          = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
						uiTransform     = {{
							display: showRanks ? 'flex' : 'none',
						}}
					/>
					<AvatarIcon
						key          = {`ui_Scores_row_${userId}_avatar`}
						userId       = {userId}
						width        = {FRAME_CELL_HEIGHT}
						height       = {FRAME_CELL_HEIGHT}
						borderRadius = {8}
						margin       = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
					/>
					<UiBox
						key           = {`ui_Scores_row_${userId}_scores`}
						width         = "auto"
						height        = {45}
						alignItems    = "flex-start"
						borderWidth   = {0}
						uiTransform   = {{ flexDirection: 'row' }}
					>
						{this.getFramesUi(userId, frameResult)}
					</UiBox>
					<UiBox
						key    = {`ui_Scores_row_${userId}_spacer`}
						width  = {0}
						height = {FRAME_CELL_HEIGHT}
						uiTransform = {{
							flexGrow  : 1,
							flexShrink: 0,
							display   : showTotalScore ? 'flex' : 'none',
						}}
					/>
					<Text
						key             = {`ui_Scores_row_${userId}_totalScore`}
						value           = {getPlayerTotalScore(frameResult).toString() ?? '-'}
						fontSize        = {14}
						fontColor       = {theme.colors.light}
						textAlign       = "middle-center"
						width           = {FRAME_CELL_HEIGHT}
						height          = {FRAME_CELL_HEIGHT}
						backgroundColor = {theme.colors.info}
						borderRadius    = {8}
						margin          = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
						uiTransform     = {{
							display : showTotalScore ? 'flex' : 'none',
							alignSelf: 'flex-end',
						}}
					/>
				</UiBox>,
			)
		}

		return ui
	}


	// MARK: body
	protected body() {
		const theme          = getTheme()
		const showRanks      = this.gameHasEnded
		const showTotalScore = true
		const rowWidth       = this.getRowWidth(showRanks, showTotalScore)

		return [
			<Background
				key             = "chrome"
				backgroundColor = {alpha(theme.colors.secondary, 0.85)}
				borderColor     = {theme.colors.primary}
				borderWidth     = {3}
				borderRadius    = {32}
			/>,
			<UiBox
				key            = "scores-body"
				width          = {rowWidth + 32}
				height         = "auto"
				alignItems     = "center"
				justifyContent = "center"
				padding        = {{ top: 16, bottom: 10, left: 0, right: 0 }}
				borderWidth    = {0}
				uiTransform    = {{ flexDirection: 'column' }}
			>
				{this.getScoreRows(showRanks, showTotalScore)}
			</UiBox>,
		]
	}
}

export const scoresLayer = new ScoresLayer()
