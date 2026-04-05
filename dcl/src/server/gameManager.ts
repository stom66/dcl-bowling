import * as utils from "@dcl-sdk/utils"

import { LaneStatus } from "src/shared/enums"
import { MessageType, room } from "src/shared/room"
import { GameSettings } from "src/shared/settings"

import { ServerStore } from "src/server/serverStore"
import { RequestPlayTurnPayload } from "src/shared/types"
import { notifyJoinGame, notifyLaneStateUpdate } from "./serverMessaging"


class GameManager {
	static instance: GameManager
	private readonly store: ServerStore

	constructor() {
		this.store = ServerStore.getInstance()
	}


	// MARK: Init
	init() { }


	// MARK: Join Game
	onPlayerRequestJoin(userId: string, laneIndex: number | undefined) {
		console.log('gameManager: onPlayerRequestJoin: userId', userId, 'laneIndex', laneIndex)


		// laneIndex might be undefined, if the user wants to join a random lane
		if (laneIndex === undefined) {
			console.log('gameManager: onPlayerRequestJoin: no lane index provided, returning (incomplete)')
			return // TODO: add logic to find a random lane
		}

		if (laneIndex < 0 || laneIndex >= GameSettings.MAX_LANES) {
			console.log('gameManager: onPlayerRequestJoin: laneIndex out of range', laneIndex)
			return
		}

		
		const laneState = this.store.getLaneState(laneIndex)

		// Check player isn't already in the game
		if (laneState.players.has(userId)) {
			console.log('gameManager: onPlayerRequestJoin: player already in game, returning')
			return
		}

		// Check the game has not started yet
		if (laneState.laneStatus !== LaneStatus.IDLE && laneState.laneStatus !== LaneStatus.STARTING) {
			console.log('gameManager: onPlayerRequestJoin: game already started, returning')
			return
		}

		// If the lane doesn't have a start time, assign one
		if (laneState.laneStatus === LaneStatus.IDLE) {
			this.startGameCountdown(laneIndex)
		}

		// Add player to the game
		this.store.addPlayer(userId, laneIndex)

		// Notify player that they have joined the game
		notifyJoinGame(userId, laneIndex)

		// Notify other players that the player has joined the game
		notifyLaneStateUpdate(laneIndex)
	}


	// MARK: Play Turn
	onPlayerRequestPlayTurn(data: RequestPlayTurnPayload) {
		console.log('gameManager: onPlayerRequestPlayTurn: data', data)
	}


	startGameCountdown(laneIndex: number) {
		const laneState = this.store.getLaneState(laneIndex)
		laneState.laneStatus = LaneStatus.STARTING
		laneState.gameStartTime = Date.now() + GameSettings.GAME_START_DELAY

		utils.timers.setTimeout(() => {
			this.startGame(laneIndex)
		}, GameSettings.GAME_START_DELAY)
	}


	startGame(laneIndex: number) {
		const laneState = this.store.getLaneState(laneIndex)
		laneState.laneStatus = LaneStatus.ACTIVE

		// Now we go into the gameplay loop.
		// We need to cycle throuhg th eplayers, giving them each 2 turns per frame
		// we run for 10 frames per player
		// the final 
	}

}

export const gameManager = new GameManager()
