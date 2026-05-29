import { engine } from '@dcl/sdk/ecs'
import { onEnterScene } from '@dcl/sdk/players'
import { EnvVar } from '@dcl/sdk/server'

import { PlayerStats, PlayerStatsRecord } from 'src/server/metrics/playerStats'
import { GameSettings } from 'src/shared/settings'

import { VERSION } from 'src/client/data/version'

import { MetricEvents } from 'src/server/metrics/metricEvents'
import { Posthog } from 'src/server/metrics/posthog'
import { SimulationInput } from '../physics/types'
import { NotifyPlayerRollPayload } from 'src/shared/types/shared-types'


export namespace Metrics {
	// MARK: Vars
	const sessions    = new Map<string, number>()            // userId -> startTimestamp
	const playerStats = new Map<string, PlayerStatsRecord>() // userId -> session stats


	// MARK: Init
	export function init() {
		console.log('Metrics: init()')
		Posthog.init()
	}


	// MARK: Utils
	function userDistinctId(userId: string): string {
		return `user_${userId}`
	}

	function gameDistinctId(gameStartTime: number, laneIndex: number): string {
		return `game_${gameStartTime}_${laneIndex}`
	}

	function createEmptyPlayerStats(): PlayerStatsRecord {
		return Object.fromEntries(
			Object.values(PlayerStats).map(stat => [stat, 0])
		) as PlayerStatsRecord
	}

	export function incrementPlayerStat(
		userId: string, 
		stat  : PlayerStats,
		amount: number = 1
	): void {
		let record = playerStats.get(userId)
		if (!record) {
			record = createEmptyPlayerStats()
			playerStats.set(userId, record)
		}
		record[stat] += amount
	}


	// MARK: Player: Session
	export function startSession(userId: string, displayName: string) {
		if (sessions.has(userId)) return

		sessions.set(userId, Date.now())

		trackSceneJoined(userId, displayName)
	}

	export function endSession(userId: string): void {
		const startTimestamp = sessions.get(userId)
		if (!startTimestamp) {
			return
		}

		const durationMs = Date.now() - startTimestamp
		const stats      = playerStats.get(userId)
		trackSceneLeft(userId, durationMs, stats)

		sessions.delete(userId)
		playerStats.delete(userId)

	}


	// MARK: Player: Scene
	export function trackSceneJoined(userId: string, displayName: string) {
		Posthog.identify(userDistinctId(userId), {
			$set: {
				displayName: displayName
			},
			$set_once: {
				walletAddress: userId
			}
		})

		Posthog.capture(userDistinctId(userId), MetricEvents.PLAYER_SCENE_JOINED, {
			version              : VERSION,
			sessionStartTimestamp: sessions.get(userId)
		})

		console.log('Metrics: trackSceneJoined: userId', userId, 'displayName', displayName)
	}

	export function trackSceneLeft(userId: string, durationMs: number, playerStats?: PlayerStatsRecord) {
		Posthog.capture(userDistinctId(userId), MetricEvents.PLAYER_SCENE_LEFT, {
			version              : VERSION,
			durationMs           : durationMs,
			sessionStartTimestamp: sessions.get(userId),
			...playerStats,
		})

		console.log('Metrics: trackSceneLeft: userId', userId, 'durationMs', durationMs, 'playerStats', playerStats)
	}



	// MARK: Player: Game
	export function trackGameJoined(
		userId       : string, 
		gameStartTime: number, 
		laneIndex    : number
	) {
		incrementPlayerStat(userId, PlayerStats.GAMES_PLAYED)

		Posthog.capture(userDistinctId(userId), MetricEvents.PLAYER_GAME_JOINED, {
			version              : VERSION,
			gameId               : gameDistinctId(gameStartTime, laneIndex),
			sessionStartTimestamp: sessions.get(userId)
		})

		console.log('Metrics: trackGameJoined: userId', userId, 'gameStartTime', gameStartTime, 'laneIndex', laneIndex)
	}

	export function trackGameWon(
		userId       : string, 
		gameStartTime: number, 
		laneIndex    : number
	) {
		incrementPlayerStat(userId, PlayerStats.GAMES_WON)

		Posthog.capture(userDistinctId(userId), MetricEvents.PLAYER_GAME_WON, {
			version              : VERSION,
			gameId               : gameDistinctId(gameStartTime, laneIndex),
			sessionStartTimestamp: sessions.get(userId)
		})

		console.log('Metrics: trackGameWon: userId', userId, 'gameStartTime', gameStartTime, 'laneIndex', laneIndex)
	}

	export function trackGameNotWon(
		userId       : string, 
		gameStartTime: number, 
		laneIndex    : number
	) {
		Posthog.capture(userDistinctId(userId), MetricEvents.PLAYER_GAME_NOT_WON, {
			version              : VERSION,
			gameId               : gameDistinctId(gameStartTime, laneIndex),
			sessionStartTimestamp: sessions.get(userId)
		})

		console.log('Metrics: trackGameNotWon: userId', userId, 'gameStartTime', gameStartTime, 'laneIndex', laneIndex)
	}


	// MARK: Game
	export function trackGameCreated(
		userId       : string, 
		gameStartTime: number,
		laneIndex    : number
	) {
		incrementPlayerStat(userId, PlayerStats.GAMES_CREATED)

		const gameId = gameDistinctId(gameStartTime, laneIndex)
		Posthog.capture(gameId, MetricEvents.GAME_CREATED, {
			version        : VERSION,
			gameStartTime  : gameStartTime,
			laneIndex      : laneIndex,
			createdByUserId: userId,
		})

		Posthog.capture(userDistinctId(userId), MetricEvents.PLAYER_GAME_CREATED, {
			version              : VERSION,
			gameId               : gameId,
			sessionStartTimestamp: sessions.get(userId)
		})

		console.log('Metrics: trackGameCreated: gameId', gameId, 'gameStartTime', gameStartTime, 'laneIndex', laneIndex, 'userId', userId)
	}

	export function trackGameStarted(
		gameStartTime: number, 
		laneIndex    : number,
		playerIds: string[]
	) {
		const gameId = gameDistinctId(gameStartTime, laneIndex)
		Posthog.capture(gameId, MetricEvents.GAME_STARTED, {
			version    : VERSION,
			laneIndex  : laneIndex,
			playerCount: playerIds.length,
			playerIds  : playerIds
		})

		console.log('Metrics: trackGameStarted: gameId', gameId, 'gameStartTime', gameStartTime, 'laneIndex', laneIndex, 'playerCount', playerIds.length)
	}

	export function trackGameEnded(
		gameStartTime: number, 
		laneIndex    : number, 
		playerIds    : string[], 
		winnerUserId : string | undefined
	) {
		const gameId = gameDistinctId(gameStartTime, laneIndex)
		Posthog.capture(gameId, MetricEvents.GAME_ENDED, {
			version     : VERSION,
			playerCount : playerIds.length,
			playerIds   : playerIds,
			laneIndex   : laneIndex,
			winnerUserId: winnerUserId,
			durationMs  : Date.now() - gameStartTime
		})

		console.log('Metrics: trackGameEnded: gameId', gameId, 'gameStartTime', gameStartTime, 'laneIndex', laneIndex, 'playerCount', playerIds.length, 'winnerUserId', winnerUserId, 'durationMs', Date.now() - gameStartTime)
	}

	export function trackGameAborted(
		gameStartTime: number, 
		laneIndex    : number
	) {
		const gameId = gameDistinctId(gameStartTime, laneIndex)
		Posthog.capture(gameId, MetricEvents.GAME_ABORTED, {
			version      : VERSION,
			gameStartTime: gameStartTime,
			laneIndex    : laneIndex,
			durationMs   : Date.now() - gameStartTime
		})

		console.log('Metrics: trackGameAborted: gameId', gameId, 'gameStartTime', gameStartTime, 'laneIndex', laneIndex, 'durationMs', Date.now() - gameStartTime)
	}


	// MARK: Rolls
	export function trackRoll(
		gameStartTime: number,
		laneIndex    : number,
		rollPayload  : NotifyPlayerRollPayload,
		simInput     : SimulationInput
	) {
		const gameId = gameDistinctId(gameStartTime, laneIndex)
		Posthog.capture(gameId, MetricEvents.PLAYER_ROLLED, {
			version              : VERSION,
			laneIndex            : laneIndex,

			userId               : rollPayload.userId,
			frameIndex           : rollPayload.frameIndex,
			rollIndex            : rollPayload.rollIndex,

			inputPosition        : simInput.position,
			inputDirection       : simInput.direction,
			inputStrength        : simInput.strength,
			inputSpin            : simInput.spin,

			startingPinStates    : rollPayload.startingPinStates,
			finalPinStates       : rollPayload.finalPinStates,
			durationMs           : rollPayload.duration,

			isGutterBall         : rollPayload.gutterBall,
			isStrike             : rollPayload.isStrike,
			isSpare              : rollPayload.isSpare,
			score                : rollPayload.score,

			sessionStartTimestamp: sessions.get(rollPayload.userId)
		})

		console.log('Metrics: trackRoll: gameId', gameId, 'userId', rollPayload.userId, 'frameIndex', rollPayload.frameIndex, 'rollIndex', rollPayload.rollIndex, 'score', rollPayload.score)
	}
}
