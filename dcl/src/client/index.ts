import { ClientHandler } from 'src/client/clientHandler'
import { ClientStore } from 'src/client/clientStore'

import { gameStateHandler } from './gameStateHandler'
import { setupBowlingHostNpc } from 'src/client/npcGameHost'

import { SetupUI } from 'src/client/ui'
import { engine, LightSource, MeshRenderer, Transform } from '@dcl/sdk/ecs'
import { Color3, Vector3 } from '@dcl/sdk/math'
import { MessageType, room } from 'src/shared/room'
import { setupLights } from './lights'
import { newPlayer } from 'src/shared/utils/discord-webhooks'
import { onEnterScene } from '@dcl/sdk/players'



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

	SetupUI()
	setupBowlingHostNpc()
	setupLights()

	onEnterScene((player) => {
		if (player && !IS_DEV) {
			newPlayer(store.getDisplayName(), store.getUserId())
		}
	})
}
