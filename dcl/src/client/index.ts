import { ClientHandler } from 'src/client/clientHandler'
import { ClientStore } from 'src/client/clientStore'

import { gameStateHandler } from './gameStateHandler'
import { setupBowlingHostNpc } from 'src/client/npcGameHost'

import { SetupUI } from 'src/client/ui'


export async function initClient() {
	const store = ClientStore.getInstance()
	await store.init()

	ClientHandler.init()
	gameStateHandler.init()

	SetupUI()
	setupBowlingHostNpc()
}
