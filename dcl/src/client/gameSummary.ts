import { GameSettings } from 'src/shared/settings'
import { GameSummaryCard } from 'src/shared/types/shared-types'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { timers } from 'src/shared/utils/timers'

import { CameraController } from 'src/client/cameraController'
import { playerMover } from 'src/client/playerMover'
import { letterboxLayer } from 'src/client/ui/themes/bowling/layers/letterbox.layer'


export namespace GameSummary {

	let activeCard    : GameSummaryCard | undefined
	let dismissTimer  : number | undefined
	let dismissing    = false


	// MARK: init
	/**
	 * Binds the ceremony start and dismiss so staging, camera, and letterbox
	 * stay in lockstep with the summary UI.
	 */
	export function init(): void {
		eventBus.on(ClientEvents.ON_GAME_SUMMARY,     onSummaryStart)
		eventBus.on(ClientEvents.ON_GAME_SUMMARY_END, onSummaryEnd)
	}


	// MARK: onSummaryStart
	/** Freezes the player, stages them at the lane, and starts the camera shot. */
	function onSummaryStart(card: GameSummaryCard): void {
		console.log('GameSummary: onSummaryStart: lane', card.laneIndex)
		dismissing  = false
		activeCard  = card
		clearDismissTimer()
		playerMover.movePlayerToSummarySpot(card.laneIndex)
		CameraController.triggerSummaryCamera(card.laneIndex)
		letterboxLayer.showBars()
		dismissTimer = timers.setTimeout(() => {
			dismissTimer = undefined
			eventBus.emit(ClientEvents.ON_GAME_SUMMARY_END, {})
		}, GameSettings.SHOW_GAME_SUMMARY_DURATION)
	}


	// MARK: onSummaryEnd
	/** Releases the virtual camera and sends the player to that lane's lobby. */
	function onSummaryEnd(): void {
		if (dismissing) return
		dismissing = true
		clearDismissTimer()

		const laneIndex = activeCard?.laneIndex
		activeCard = undefined
		console.log('GameSummary: onSummaryEnd: lane', laneIndex)

		CameraController.resetCamera()
		letterboxLayer.hideBars()
		if (laneIndex !== undefined) {
			playerMover.movePlayerToLaneLobby(laneIndex)
		}
	}


	// MARK: clearDismissTimer
	/** Cancels the auto-dismiss timeout when Continue fires first. */
	function clearDismissTimer(): void {
		if (dismissTimer === undefined) return
		timers.clearTimeout(dismissTimer)
		dismissTimer = undefined
	}

}
