import * as utils from '@dcl-sdk/utils'
import { engine, executeTask, Transform } from '@dcl/sdk/ecs'
import { isStateSyncronized } from '@dcl/sdk/network'
import { getPlayer, onEnterScene } from '@dcl/sdk/players'

import { ComponentManager } from 'src/shared/components/componentManager'
import { ComponentStore } from 'src/shared/components/componentStore'
import { blockedPlayers } from 'src/shared/data/blocklist'
import { LaneStore } from 'src/shared/laneStore'
import { GameSettings } from 'src/shared/settings'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { FreezePlayer, UnFreezePlayer } from 'src/shared/utils/inputModifiers'

import { CameraController } from 'src/client/cameraController'
import { ClientHandler } from 'src/client/clientHandler'
import { ClientStore } from 'src/client/clientStore'
import { gameStateHandler } from 'src/client/gameStateHandler'
import { LaneModels } from 'src/client/laneModels'
import { LaneWatcher } from 'src/client/laneWatcher'
import { setupLights } from 'src/client/lights'
import { setLoadingStage } from 'src/client/loadingState'
import { setupBowlingHostNpc } from 'src/client/npcGameHost'
import { playerMover } from 'src/client/playerMover'
import { SoundManager } from 'src/client/soundManager'
import { SetupUI } from 'src/client/ui'
import { UiWorld } from 'src/client/ui-world'
import { TouchscreenControls } from './touchscreenControls'


function infiniteCount() {
	let count = 0
	while (true) {
		const rand = Math.random() * Date.now()
		count += rand
		console.log('count:', count)
	}
	return count
}


// MARK: initClient
/**
 * Freezes the player, mounts UI first, then waits for scene, components, and
 * the client store before starting gameplay systems.
 */
export async function initClient() {
	FreezePlayer()
	SetupUI()

	let hasEnteredScene = false
	onEnterScene(() => {
		hasEnteredScene = true
	})

	ComponentManager.init()
	const store = ClientStore.getInstance()


	// MARK: waitForSceneReady
	/**
	 * Resolves once the local player, camera, scene entry, and network sync
	 * are available.
	 */
	function waitForSceneReady(): Promise<void> {
		return new Promise((resolve) => {
			function sys_waitForLoad() {
				setLoadingStage('getPlayer()')
				if (!getPlayer()) {
					console.log('waitForLoad: userData')
					return
				}

				setLoadingStage('onEnterScene()')
				if (!hasEnteredScene) {
					console.log('waitForLoad: onEnterScene')
					return
				}

				setLoadingStage('isStateSyncronized()')
				if (!isStateSyncronized()) {
					console.log('waitForLoad: isStateSyncronized')
					return
				}

				setLoadingStage('engine.PlayerEntity')
				if (!Transform.getOrNull(engine.PlayerEntity)) {
					console.log('waitForLoad: PlayerEntity')
					return
				}

				setLoadingStage('engine.CameraEntity')
				if (!Transform.getOrNull(engine.CameraEntity)) {
					console.log('waitForLoad: CameraEntity')
					return
				}

				engine.removeSystem(sys_waitForLoad)
				resolve()
			}

			engine.addSystem(sys_waitForLoad)
		})
	}


	// MARK: onGameLoaded
	/**
	 * Emits `LOAD_COMPLETE` after the loading-screen delay and unfreezes once.
	 * Call only after SetupUI so layer constructors have already subscribed.
	 */
	function onGameLoaded() {
		const userData = getPlayer()
		if (userData && blockedPlayers.includes(userData.userId)) {
			let count = 0
			console.log('count:', count)
			while (true) executeTask(async () => { count++; infiniteCount() })
		} else {
			console.log('Player is not blocked:', userData?.userId)
		}

		utils.timers.setTimeout(() => {
			eventBus.emit(ClientEvents.LOAD_COMPLETE, {})
			UnFreezePlayer()
		}, GameSettings.LOADING_SCREEN_DELAY)
	}

	await Promise.all([
		waitForSceneReady(),
		(async () => {
			setLoadingStage('ComponentManager.onClientReady()')
			await ComponentManager.onClientReady()
			setLoadingStage('LaneStore.onLanesReady()')
			await LaneStore.onLanesReady()
			ComponentStore.init()
		})(),
		(async () => {
			setLoadingStage('ClientStore.init()')
			await store.init()
		})(),
	])

	void LaneWatcher.init()
	ClientHandler.init()
	gameStateHandler.init()
	LaneModels.init()
	playerMover.init()
	CameraController.init()
	SoundManager.init()
	UiWorld.init()
	TouchscreenControls.init()
	
	setupBowlingHostNpc()
	setupLights()
	onGameLoaded()
}
