import ReactEcs from '@dcl/sdk/react-ecs'
import { alpha, Background, getTheme, Layer, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { GameSettings } from 'src/shared/settings'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { getDummyScoreData } from 'src/shared/utils/scoreCalc'

import { ClientStore } from 'src/client/clientStore'
import {
	getScoreboardRowWidth,
	renderScoreboard,
} from 'src/client/ui/themes/bowling/layers/scoreboardView'


// Temporary preview: dummy frames, visible on load. Turn off before shipping.
const DEBUG_FORCE_SHOW = false

const clientStore = ClientStore.getInstance()


// MARK: ScoresLayer
/**
 * Bottom-center scoreboard. Slides in after roll playback.
 */
export class ScoresLayer extends Layer {
	private lastKnownScores    : Map<string, number[][]> | null = null
	private lastKnownLeaves    : Map<string, number[]> | null = null
	private lastKnownFrameCount: number = GameSettings.DEFAULT_FRAME_COUNT

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
			const liveCount = clientStore.getFrameCount()
			if (liveCount > 0) this.lastKnownFrameCount = liveCount
		})
		eventBus.on(ClientEvents.ON_GAME_SUMMARY,              () => { this.hide(0.8) })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,            () => { this.hide(0.8) })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END,   () => { this.show(0.8) })
	}


	// MARK: getLiveScorecard
	/**
	 * Current lane scorecard, or dummy data when the preview flag is on.
	 */
	private getLiveScorecard(): {
		frameCount : number
		frames     : Map<string, number[][]>
		leaves     : Map<string, number[]> | null
	} {
		let frames = clientStore.getFrames() ?? new Map<string, number[][]>()
		let leaves = clientStore.getLeaves() ?? new Map<string, number[]>()
		if (DEBUG_FORCE_SHOW) {
			const dummy = getDummyScoreData()
			frames = dummy.frames
			leaves = dummy.leaves
		}
		if (frames.size > 0) {
			this.lastKnownScores     = frames
			this.lastKnownLeaves     = leaves
			const liveCount          = clientStore.getFrameCount()
			this.lastKnownFrameCount = liveCount > 0 ? liveCount : this.lastKnownFrameCount
		}

		return {
			frameCount : this.getActiveFrameCount(frames),
			frames     : this.lastKnownScores ?? frames,
			leaves     : this.lastKnownLeaves ?? leaves,
		}
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


	// MARK: body
	protected body() {
		const theme      = getTheme()
		const scorecard  = this.getLiveScorecard()
		const rowWidth   = getScoreboardRowWidth(scorecard.frameCount, false, true)

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
				{renderScoreboard({
					frameCount    : scorecard.frameCount,
					frames        : scorecard.frames,
					keyPrefix     : 'ui_Scores',
					leaves        : scorecard.leaves,
					showRanks     : false,
					showTotalScore: true,
				})}
			</UiBox>,
		]
	}
}

export const scoresLayer = new ScoresLayer()
