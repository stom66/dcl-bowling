import { TouchScreenControls } from '@dcl/sdk/ecs'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'


export namespace TouchscreenControls {

	// MARK: init
	/**
	 * Hides the native mobile HUD while the local player's roll controls are on screen,
	 * and brings it back when the roll, the match, or the lane ends.
	 */
	export function init() {
		eventBus.on(ClientEvents.ON_MY_ROLL_START, () => {
			disableInputs()
		})
		eventBus.on(ClientEvents.ON_MY_ROLL_END, () => {
			enableInputs()
		})
		eventBus.on(ClientEvents.ON_GROUP_GAME_END, () => {
			enableInputs()
		})
		eventBus.on(ClientEvents.REQUEST_LEAVE_GAME, () => {
			enableInputs()
		})
	}


	// MARK: disableInputs
	/**
	 * Hides the joystick, the crosshair, and every on-screen gamepad button
	 * (jump, interact, E, F, and 1-4).
	 * Unlisted buttons stay visible, so this hides each gamepad action explicitly.
	 */
	export function disableInputs() {
		TouchScreenControls.hideJoystick()
		TouchScreenControls.hideCrosshair()
		TouchScreenControls.hideAll()
	}


	// MARK: enableInputs
	/**
	 * Restores the default joystick, crosshair, and gamepad buttons.
	 */
	export function enableInputs() {
		TouchScreenControls.showJoystick()
		TouchScreenControls.showCrosshair()
		TouchScreenControls.showAll()
	}
}
