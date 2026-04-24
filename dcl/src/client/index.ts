import { engine, LightSource, MeshRenderer, Transform } from '@dcl/sdk/ecs'
import { Color3, Vector3 } from '@dcl/sdk/math'
import { onEnterScene } from '@dcl/sdk/players'


import { MessageType, room } from 'src/shared/room'
import { newPlayer } from 'src/shared/utils/discord-webhooks'

import { ClientHandler } from 'src/client/clientHandler'
import { ClientStore } from 'src/client/clientStore'

import { gameStateHandler } from 'src/client/gameStateHandler'
import { setupBowlingHostNpc } from 'src/client/npcGameHost'

import { SetupUI } from 'src/client/ui'
import { setupLights } from 'src/client/lights'
import { playerMover } from 'src/client/playerMover'
import { SoundManager } from 'src/client/soundManager'
import { CameraController } from 'src/client/cameraController'



// MARK: Vars
declare var process: {
	env: {
		NODE_ENV: string
	}
}
const env = process.env.NODE_ENV
const IS_DEV = env == "development"


export async function initClient() {
	const store = ClientStore.getInstance()
	await store.init()

	ClientHandler.init()
	gameStateHandler.init()
	playerMover.init()
	CameraController.init()
	SoundManager.init()

	SetupUI()
	setupBowlingHostNpc()
	setupLights()

	onEnterScene((player) => {
		if (player && !IS_DEV) {
			newPlayer(store.getDisplayName(), store.getUserId())
		}
	})
}
