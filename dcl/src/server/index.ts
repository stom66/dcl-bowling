import { onEnterScene, onLeaveScene } from "@dcl/sdk/players"
import * as utils from "@dcl-sdk/utils"

import { GameSettings } from "src/shared/settings"

import { gameManager } from "src/server/gameManager"
import { serverHandler } from "src/server/serverHandler"
import { notifyServerTime } from "src/server/serverMessaging"
import { ServerStore } from "src/server/serverStore"


export async function initServer(): Promise<void> {
	console.log("Server: initServer()")

	const serverStore = ServerStore.getInstance() // Initialize the store
	
	serverHandler.init()
	gameManager.init()

	// Periodically send the server time to the clients
	notifyServerTime()
	utils.timers.setInterval(() => {
		notifyServerTime()
	}, GameSettings.SERVER_TIME_UPDATE_INTERVAL)


	// MARK: Event bindings
	onEnterScene((player) => {
		// Placeholder
	})
	onLeaveScene((userId) => {
		serverStore.removePlayer(userId)
	})
}
 