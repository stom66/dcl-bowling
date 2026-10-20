import { engine, InputAction, TouchScreenControls } from '@dcl/sdk/ecs'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'


export namespace TouchscreenControls {

	/** Stays true while a login reward popup session is open. */
	let rewardLocked = false

	// MARK: init
	/**
	 * Hides the native mobile HUD while the local player's roll controls are on
	 * screen, during the load fly-in, or during login rewards, and brings it
	 * back when those end.
	 */
	export function init() {
		eventBus.on(ClientEvents.ON_MY_ROLL_START, () => {
			disableInputs()
		})
		eventBus.on(ClientEvents.ON_MY_ROLL_END, () => {
			if (rewardLocked) return
			enableInputs()
		})
		eventBus.on(ClientEvents.ON_GROUP_GAME_END, () => {
			if (rewardLocked) return
			enableInputs()
		})
		eventBus.on(ClientEvents.REQUEST_LEAVE_GAME, () => {
			if (rewardLocked) return
			enableInputs()
		})
		eventBus.on(ClientEvents.ON_LOAD_FLY_IN_START, () => {
			disableInputs()
		})
		eventBus.on(ClientEvents.ON_LOAD_FLY_IN_END, () => {
			if (rewardLocked) return
			enableInputs()
		})
		eventBus.on(ClientEvents.ON_REWARD_OPEN, () => {
			rewardLocked = true
			disableInputs()
		})
		eventBus.on(ClientEvents.ON_REWARD_CLOSE, () => {
			rewardLocked = false
			enableInputs()
		})
		eventBus.on(ClientEvents.ON_CLAW_CINEMATIC_START, () => {
			disableInputs()
		})
		eventBus.on(ClientEvents.ON_CLAW_CINEMATIC_END, () => {
			if (rewardLocked) return
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
