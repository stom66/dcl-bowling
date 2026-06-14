import { engine, executeTask, LightSource, MeshRenderer, Transform } from '@dcl/sdk/ecs'
import { Color3, Vector3 } from '@dcl/sdk/math'
import { getPlayer, onEnterScene } from '@dcl/sdk/players'
import * as utils from "@dcl-sdk/utils"


import { ComponentManager } from 'src/shared/components/componentManager'
import { MessageType, room } from 'src/shared/room'

import { ClientHandler } from 'src/client/clientHandler'
import { ClientStore } from 'src/client/clientStore'

import { gameStateHandler } from 'src/client/gameStateHandler'
import { LaneWatcher } from 'src/client/laneWatcher'
import { setupBowlingHostNpc } from 'src/client/npcGameHost.new'

import { SetupScreenUI } from 'src/client/ui-screen'
import { setupLights } from 'src/client/lights'
import { playerMover } from 'src/client/playerMover'
import { SoundManager } from 'src/client/soundManager'
import { CameraController } from 'src/client/cameraController'
import { UiWorld } from './ui-world'
import { FreezePlayer, UnFreezePlayer } from 'src/shared/utils/inputModifiers'
import { GameSettings } from 'src/shared/settings'
import { isStateSyncronized } from '@dcl/sdk/network'
import { blockedPlayers } from './data/blocklist'



// MARK: Vars
declare var process: {
	env: {
		NODE_ENV: string
	}
}
const env = process.env.NODE_ENV
const IS_DEV = env == "development"

function infiniteCount() {
	let count = 0
	while (true) {
		var rand = Math.random() * Date.now()
		count+=rand
		console.log("count:", count)
	}
	return count
}

export async function initClient() {

	let userData = getPlayer()

	FreezePlayer()

	var hasEnteredScene = false
	onEnterScene((player) => {
		hasEnteredScene = true
	})

	function onGameLoaded() {
		// Is the player blocked?
		if (userData && blockedPlayers.includes(userData.userId)) {
			let count = 0
			console.log("count:", count)
			while (true) executeTask(async () => {count++; let rand = infiniteCount()})
		} else {
			console.log("Player is not blocked:", userData?.userId)
		}


		utils.timers.setTimeout(() => {
			//HideLoading()
			UnFreezePlayer()
		}, GameSettings.LOADING_SCREEN_DELAY) 

	}


	function waitForLoad() {
		if (!isStateSyncronized())                     {console.log("waitForLoad: isStateSyncronized"); return}

		// Wait for userData to be available
		userData = getPlayer()
		if(!userData)                                  {console.log("waitForLoad: userData");           return}
		if (!hasEnteredScene)                          {console.log("waitForLoad: onEnterScene");       return}
		if (!Transform.getOrNull(engine.PlayerEntity)) {console.log("waitForLoad: PlayerEntity");       return}
		if (!Transform.getOrNull(engine.CameraEntity)) {console.log("waitForLoad: CameraEntity");       return}

		engine.removeSystem(waitForLoad)

		onGameLoaded()
	}

	ComponentManager.init()
	await ComponentManager.onClientReady().then(() => {
		console.log("ComponentManager.onClientReady")
		
		// Fire-and-forget: MyLane awaits CRDT discovery internally, then binds onChange.
		void LaneWatcher.init()
	
		ClientHandler.init()
		gameStateHandler.init()
		playerMover.init()
		CameraController.init()
		SoundManager.init()
	
		SetupScreenUI()
		UiWorld.init()
		
		setupBowlingHostNpc()
		setupLights()
	})


	const store = ClientStore.getInstance()
	await store.init()


	onEnterScene((player) => {
		hasEnteredScene = true
	})

	engine.addSystem(waitForLoad)
}
