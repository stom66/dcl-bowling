import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	Background,
	getTheme,
	Label,
	Layer,
	PropsController,
	Text,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { LanePhase } from 'src/shared/enums'
import { GameSettings } from 'src/shared/settings'
import { LaneSnapshot } from 'src/shared/types/shared-types'
import { clockSync } from 'src/shared/utils/clockSync'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { ClientStore } from 'src/client/clientStore'


type GameStatusProps = {
	playerName: string
	endTime   : number
}


const clientStore = ClientStore.getInstance()


// MARK: GameStatusLayer
/**
 * Top-center HUD showing the current lane phase and countdown.
 */
export class GameStatusLayer extends Layer {
	private statusProps: PropsController<GameStatusProps>

	constructor() {
		super({
			id         : 'bowling-game-status',
			zone       : ZoneType.TopCenter,
			canBeHidden: false,
			uiTransform: {
				width : 400,
				height: 80,
				margin: { top: 8 },
			},
		})

		this.statusProps = new PropsController<GameStatusProps>({
			playerName: '~',
			endTime   : 0,
		})

		eventBus.on(ClientEvents.NOTIFY_LANE_STATE, (data: LaneSnapshot) => {
			const myLane = clientStore.getLaneIndex()
			if (myLane === undefined || data.laneIndex !== myLane) return

			if (data.currentFrameUserId) {
				void userProfileCache.getDisplayName(data.currentFrameUserId).then((displayName) => {
					this.statusProps.set('playerName', displayName || '~')
				})
			}

			if (data.currentRollStartTime) {
				this.statusProps.set(
					'endTime',
					clockSync.toLocalTime(data.currentRollStartTime) + GameSettings.ROLL_MAX_DURATION,
				)
			} else {
				this.statusProps.set('endTime', clockSync.toLocalTime(data.gameStartTime))
			}
		})
	}


	// MARK: getStatusText
	private getStatusText(): string {
		const lanePhase  = clientStore.getLanePhase()
		const playerName = this.statusProps.get('playerName')

		if (lanePhase === LanePhase.GAME_STARTING) return 'Game is starting...'
		if (lanePhase === LanePhase.WAITING)       return 'Waiting for the next frame'
		if (lanePhase === LanePhase.FRAME_START)   return `${playerName}'s turn is starting`
		if (lanePhase === LanePhase.ROLL_AWAITING) return `${playerName} is about to roll`
		if (lanePhase === LanePhase.ROLL_PLAYBACK) return `${playerName} is rolling!`
		if (lanePhase === LanePhase.ROLL_END)      return `${playerName} has finished rolling`
		if (lanePhase === LanePhase.FRAME_END)     return `${playerName} has finished their frame`
		if (lanePhase === LanePhase.GAME_ENDING)   return 'Game is ending...'
		if (lanePhase === LanePhase.NONE)          return 'You are not in a game'
		return 'You are idle.'
	}


	// MARK: getCountdownTime
	private getCountdownTime(): string {
		const endTime = this.statusProps.get('endTime')
		if (endTime > 0) {
			const timeRemaining = Math.ceil((endTime - Date.now()) / 1000)
			return timeRemaining > 0 ? timeRemaining.toString() : '~'
		}
		return '~'
	}


	// MARK: body
	protected body() {
		const theme = getTheme()

		return [
			<Background
				key             = "chrome"
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {3}
				borderRadius    = {16}
			/>,
			<Label
				key             = "game-status"
				value           = {this.getStatusText()}
				width           = "100%"
				fontSize        = {26}
				textAlign       = "middle-left"
				backgroundColor = {theme.colors.secondary}
				fontColor       = {theme.colors.light}
			>
				<Text
					value     = {this.getCountdownTime()}
					fontSize  = {26}
					fontColor = {Color4.White()}
					textAlign = "middle-right"
				/>
			</Label>,
		]
	}
}

export const gameStatusLayer = new GameStatusLayer()
