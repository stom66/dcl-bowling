import * as utils from "@dcl-sdk/utils"
import { Transform } from "@dcl/sdk/ecs"
import { onEnterScene, onLeaveScene } from "@dcl/sdk/players"

import { ComponentManager } from "src/shared/components/componentManager"
import { ComponentStore } from "src/shared/components/componentStore"
import { LANES_GROUP_ID } from "src/shared/components/registry"
import { LaneStore } from "src/shared/laneStore"
import { GameSettings } from "src/shared/settings"
import { DiscordWebhooks } from "src/shared/utils/discord-webhooks"
import { eventBus, ServerEvents } from "src/shared/utils/eventBus"

import { blockedPlayers } from "src/client/data/blocklist"
import { gameManager } from "src/server/gameManager"
import { Metrics } from "src/server/metrics/client"
import { serverHandler } from "src/server/serverHandler"
import { notifyServerTime } from "src/server/serverMessaging"


// MARK: initServer
/**
 * Boots synced components, messaging, and scene enter/leave handlers.
 */
export async function initServer(): Promise<void> {
	console.log("Server: initServer()")

	Metrics.init()

	ComponentManager.init()
	for (let i = 0; i < GameSettings.MAX_LANES; i++) {
		ComponentManager.createGroupEntity(LANES_GROUP_ID, String(i))
	}
	ComponentStore.init()

	serverHandler.init()
	gameManager.init()

	// Periodically send the server time to the clients
	notifyServerTime()
	utils.timers.setInterval(() => {
		notifyServerTime()
	}, GameSettings.SERVER_TIME_UPDATE_INTERVAL)


	// MARK: Event bindings
	onEnterScene((player) => {
		if (player && !blockedPlayers.includes(player.userId)) {
			Metrics.startSession(player.userId, player.name)

			const playerPosition = Transform.getOrNull(player.entity)?.position
			DiscordWebhooks.newPlayer(player.name, player.userId, playerPosition)
			eventBus.emit(ServerEvents.PLAYER_SCENE_ENTER, { player })
		}
	})
	onLeaveScene((userId) => {
		LaneStore.removePlayerFromAllLanes(userId)
		if (!blockedPlayers.includes(userId)) {
			Metrics.endSession(userId)
			eventBus.emit(ServerEvents.PLAYER_SCENE_LEAVE, { userId })
		}
	})
}
