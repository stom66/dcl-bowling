import { engine, TouchScreenControls } from '@dcl/sdk/ecs'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'


export namespace TouchscreenControls {

	// MARK: init
	/**
	 * Hides touchscreen movement controls while the local player's roll is in progress.
	 */
	export function init() {
		eventBus.on(ClientEvents.ON_MY_ROLL_START, () => {
			disableInputs()
		})
		eventBus.on(ClientEvents.ON_MY_ROLL_END, () => {
			enableInputs()
		})
	}


	// MARK: disableInputs
	/**
	 * Hides the on-screen joystick and crosshair, and clears custom touch buttons.
	 */
	export function disableInputs() {
		TouchScreenControls.createOrReplace(engine.RootEntity, {
			hideJoystick : true,
			hideCrosshair: true,
			touchInputs  : [],
		})
	}


	// MARK: enableInputs
	/**
	 * Restores the default on-screen joystick and crosshair, with no custom touch buttons.
	 */
	export function enableInputs() {
		TouchScreenControls.createOrReplace(engine.RootEntity, {
			hideJoystick : false,
			hideCrosshair: false,
			touchInputs  : [],
		})
	}
}
