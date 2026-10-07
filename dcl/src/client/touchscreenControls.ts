import { engine, InputAction, TouchScreenControls } from '@dcl/sdk/ecs'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'


export namespace TouchscreenControls {

	// MARK: init
	/**
	 * Hides the native mobile HUD while the local player's roll controls are on
	 * screen, or during the load fly-in, and brings it back when those end.
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
		eventBus.on(ClientEvents.ON_LOAD_FLY_IN_START, () => {
			disableInputs()
		})
		eventBus.on(ClientEvents.ON_LOAD_FLY_IN_END, () => {
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
		TouchScreenControls.createOrReplace(engine.RootEntity, {
			hideJoystick : true,
			hideCrosshair: true,
			touchInputs  : [
				{ inputAction: InputAction.IA_JUMP,      hide: true },
				{ inputAction: InputAction.IA_ACTION_3,  hide: true,},
				{ inputAction: InputAction.IA_ACTION_4,  hide: true,},
				{ inputAction: InputAction.IA_ACTION_5,  hide: true },
				{ inputAction: InputAction.IA_ACTION_6,  hide: true },
				{ inputAction: InputAction.IA_POINTER,   hide: true },
				{ inputAction: InputAction.IA_PRIMARY,   hide: true },
				{ inputAction: InputAction.IA_SECONDARY, hide: true },
				{ inputAction: InputAction.IA_MODIFIER,  hide: true },
			],
		})
	}


	// MARK: enableInputs
	/**
	 * Restores the default joystick, crosshair, and gamepad buttons.
	 */
	export function enableInputs() {
		TouchScreenControls.createOrReplace(engine.RootEntity, {
			hideJoystick : false,
			hideCrosshair: false,
			touchInputs  : [
				{ inputAction: InputAction.IA_ACTION_3,  hide: true,},
				{ inputAction: InputAction.IA_ACTION_4,  hide: true,},
				{ inputAction: InputAction.IA_ACTION_5,  hide: true },
				{ inputAction: InputAction.IA_ACTION_6,  hide: true },
				{ inputAction: InputAction.IA_POINTER,   hide: true },
				{ inputAction: InputAction.IA_PRIMARY,   hide: true },
				{ inputAction: InputAction.IA_SECONDARY, hide: true },
			],
		})
	}
}
