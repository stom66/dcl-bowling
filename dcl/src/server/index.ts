import { onEnterScene, onLeaveScene } from "@dcl/sdk/players"
import * as utils from "@dcl-sdk/utils"

import { ComponentManager } from "src/shared/components/componentManager"
import { LaneStore } from "src/shared/laneStore"
import { GameSettings } from "src/shared/settings"

import { gameManager } from "src/server/gameManager"
import { serverHandler } from "src/server/serverHandler"
import { notifyServerTime } from "src/server/serverMessaging"
import { DiscordWebhooks } from "src/shared/utils/discord-webhooks"
import { Metrics } from "./metrics/client"


export async function initServer(): Promise<void> {
	console.log("Server: initServer()")

	Metrics.init()

	ComponentManager.init()

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
		if (player) {
			Metrics.startSession(player.userId, player.name)
			DiscordWebhooks.newPlayer(player.name, player.userId)
		}
	})
	onLeaveScene((userId) => {
		Metrics.endSession(userId)
		LaneStore.removePlayerFromAllLanes(userId)
	})
}
