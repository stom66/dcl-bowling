import { ClientHandler } from 'src/client/clientHandler'
import { ClientStore } from 'src/client/clientStore'

import { gameStateHandler } from './gameStateHandler'
import { setupBowlingHostNpc } from 'src/client/npcGameHost'

import { SetupUI } from 'src/client/ui'
import { engine, LightSource, MeshRenderer, Transform } from '@dcl/sdk/ecs'
import { Color3, Vector3 } from '@dcl/sdk/math'
import { MessageType, room } from 'src/shared/room'
import { setupLights } from './lights'


export async function initClient() {
	const store = ClientStore.getInstance()
	await store.init()

	ClientHandler.init()
	gameStateHandler.init()

	SetupUI()
	setupBowlingHostNpc()
	setupLights()


	// DEBUG: auto-join a game on load
	//room.send(MessageType.REQUEST_JOIN_GAME, 2)



}
