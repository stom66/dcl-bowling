import * as utils from "@dcl-sdk/utils"
import { engine } from "@dcl/sdk/ecs"
import { Quaternion, Vector3 } from "@dcl/sdk/math"

import { LaneStore } from "src/shared/laneStore"
import { LanePhase } from "src/shared/enums"
import { GameSettings } from "src/shared/settings"
import { NotifyPlayerRollPayload, RequestPlayRollPayload, RollPayload } from "src/shared/types/shared-types"
import { userProfileCache } from "src/shared/utils/userProfileCache"

import { PIN_LANE_LOCAL_POSITIONS } from 'src/server/physics/physics.pin-layout'
import { getSimulationResults } from "src/server/physics/physics.client"
import { GameSettings as PhysicsSimulationSettings } from "src/server/physics/physics.settings"
import { SimulationInput, SimulationResult } from "src/server/physics/types"
import * as ServerMessaging from "src/server/serverMessaging"


/** Per-lane runtime state that lives only on the server (not part of the wire payload). */
type LaneRuntime = {
	phase        : LanePhase
	phaseEndTime : number     // Date.now() ms when the current phase's timer elapses
	pinStanding  : boolean[]  // Standing state of each of the 10 pins for the current player's frame
}


class GameManager {
	static instance: GameManager

	private readonly runtime = new Map<number, LaneRuntime>()

	private frameWatcherSystemActive: boolean = false

	constructor() { }


	// MARK: Init
	init() { }


	// =========================================================================
	// MARK: Phase 1 — On Player Request Join
	// =========================================================================
	/**
	 * Entry point for a player joining a lane. Decides whether to add them to
	 * an existing game or to kick off a fresh Start Game Countdown.
	 */
	async onPlayerRequestJoin(userId: string, laneIndex: number | undefined) {
		console.log('gameManager: onPlayerRequestJoin: userId', userId, 'laneIndex', laneIndex)

		if (laneIndex === undefined) {
			// TODO: find a random IDLE/STARTING lane for the player
			console.log('gameManager: onPlayerRequestJoin: no lane index provided, returning (not yet implemented)')
			return
		}

		// Did they request an invalid lane?
		if (laneIndex < 0 || laneIndex >= GameSettings.MAX_LANES) {
			console.log('gameManager: onPlayerRequestJoin: laneIndex out of range', laneIndex)
			return
		}

		// Are they already in a game?
		if (LaneStore.findLaneByUserId(userId)) {
			console.log('gameManager: onPlayerRequestJoin: player already in game, ignoring')
			return
		}

		// Is the game already started?
		const phase = LaneStore.getPhase(laneIndex)
		if (phase !== LanePhase.NONE && phase !== LanePhase.GAME_STARTING) {
			console.log('gameManager: onPlayerRequestJoin: game already started, ignoring')
			return
		}

		// Is there space in the lane?
		const lanePlayerCount = LaneStore.getLaneUserIds(laneIndex).length
		if (lanePlayerCount >= GameSettings.MAX_PLAYERS_PER_GAME) {
			console.log('gameManager: onPlayerRequestJoin: lane is full, ignoring')
			return
		}

		const isFirstPlayer = lanePlayerCount === 0

		// await so profile fetch completes before notifies / any follow-up logic
		const displayName = await userProfileCache.getDisplayName(userId)
		LaneStore.addPlayer(laneIndex, userId, displayName)

		ServerMessaging.notifyJoinGame(userId, laneIndex)

		// Starting the countdown is what transitions a brand-new lane into the
		// game lifecycle. Only the first joiner triggers it.
		if (isFirstPlayer && LaneStore.getPhase(laneIndex) === LanePhase.NONE) {
			this.startGameCountdown(laneIndex)
		}
	}


	// =========================================================================
	// MARK: Phase 2 — Start Game Countdown
	// =========================================================================
	/** Mark the lane as STARTING and schedule startGame() after the countdown. */
	private startGameCountdown(laneIndex: number) {
		console.log('gameManager: startGameCountdown: laneIndex', laneIndex)

		LaneStore.setPhase(laneIndex, LanePhase.GAME_STARTING)
		LaneStore.setGameStartTime(laneIndex, Date.now() + GameSettings.GAME_START_COUNTDOWN_DURATION)

		utils.timers.setTimeout(() => {
			this.startGame(laneIndex)
		}, GameSettings.GAME_START_COUNTDOWN_DURATION)
	}


	// =========================================================================
	// MARK: Phase 3 — Start Game
	// =========================================================================
	/**
	 * Initialise lane state for a fresh game (scorecards, indices, runtime),
	 * notify players that the game has started and make sure the frame watcher
	 * system is running. Synced phase becomes WAITING for
	 * {@link GameSettings.GAME_START_INITIAL_DELAY} so clients see
	 * GAME_STARTING -> WAITING before the first FRAME_START.
	 */
	private startGame(laneIndex: number) {
		console.log('gameManager: startGame: laneIndex', laneIndex)

		// Everyone left during the countdown — bail out cleanly.
		if (LaneStore.getLaneUserIds(laneIndex).length === 0) {
			console.log('gameManager: startGame: no players, aborting')
			this.resetLane(laneIndex)
			return
		}

		LaneStore.setCurrentTurn(laneIndex, 0, 0, '', 0, 0)
		LaneStore.initLaneScorecards(laneIndex)

		const rt = this.getRuntime(laneIndex)
		rt.pinStanding = newFullPinRack()

		this.ensureFrameWatcherRunning()

		this.schedulePhase(laneIndex, LanePhase.WAITING, GameSettings.GAME_START_INITIAL_DELAY)
	}


	// =========================================================================
	// MARK: onWaitingPhaseComplete
	/**
	 * After the post-countdown WAITING buffer, opens the first frame using the
	 * same FRAME_START timing as later frames.
	 */
	private onWaitingPhaseComplete(laneIndex: number) {
		if (LaneStore.getLaneUserIds(laneIndex).length === 0) {
			console.log('gameManager: onWaitingPhaseComplete: no players, aborting')
			this.endGame(laneIndex)
			return
		}

		const playerIndex = LaneStore.getCurrentFramePlayerIndex(laneIndex)
		const frameIndex  = LaneStore.getCurrentFrameIndex(laneIndex)

		this.startPlayerFrame(laneIndex, playerIndex, frameIndex, GameSettings.FRAME_DELAY_BEFORE_ROLL_START)
	}


	// =========================================================================
	// MARK: Phase 4 — Start Player Frame
	// =========================================================================
	/**
	 * Begin a frame for a specific player. Resets pin rack + roll index and
	 * schedules the FRAME_START phase. The phase change auto-fires
	 * `ON_MY_FRAME_START` / `ON_GROUP_FRAME_START` on each client via `MyLane`.
	 */
	private startPlayerFrame(
		laneIndex   : number,
		playerIndex : number,
		frameIndex  : number,
		delayMs     : number = GameSettings.FRAME_DELAY_BEFORE_ROLL_START,
	) {
		const players = LaneStore.getLaneUserIds(laneIndex)
		if (players.length === 0) {
			console.log('gameManager: startPlayerFrame: no players, ending game')
			this.endGame(laneIndex)
			return
		}
		if (playerIndex < 0 || playerIndex >= players.length) {
			console.log('gameManager: startPlayerFrame: bad playerIndex', playerIndex)
			return
		}

		const userId = players[playerIndex]!

		console.log(`gameManager: startPlayerFrame: lane ${laneIndex}, frame ${frameIndex}, playerIdx ${playerIndex}, userId ${userId}`)

		LaneStore.setCurrentTurn(laneIndex, frameIndex, playerIndex, userId, 0, 0)

		const rt = this.getRuntime(laneIndex)
		rt.pinStanding = newFullPinRack()

		this.schedulePhase(laneIndex, LanePhase.FRAME_START, delayMs)
	}


	// =========================================================================
	// MARK: Phase 5 — Start Player Roll
	// =========================================================================
	/**
	 * Start a roll window for the current player. Sends NOTIFY_PLAYER_ROLL_START
	 * and moves to the ROLL_AWAITING phase where we wait for the client's
	 * REQUEST_PLAY_ROLL within ROLL_MAX_DURATION.
	 */
	private startPlayerRoll(laneIndex: number) {
		const userId = LaneStore.getCurrentFrameUserId(laneIndex)
		if (!userId) return

		const rollIndex = LaneStore.getCurrentRollIndex(laneIndex)
		const rt = this.getRuntime(laneIndex)
		const pinStanding = rt.pinStanding.slice()

		console.log(`gameManager: startPlayerRoll: lane ${laneIndex}, user ${userId}, rollIndex ${rollIndex}`)

		const rollStartTimestamp = Date.now()
		LaneStore.setCurrentRollStartTime(laneIndex, rollStartTimestamp)

		this.schedulePhase(laneIndex, LanePhase.ROLL_AWAITING, GameSettings.ROLL_MAX_DURATION)

		// Roll-start carries transient pinStanding + timestamp that aren't on a
		// synced component, so this stays as a directed room message.
		ServerMessaging.notifyPlayerRollStart(laneIndex, userId, pinStanding, rollStartTimestamp)
	}


	// =========================================================================
	// MARK: Phase 6 — Handle Player Roll Request
	// =========================================================================
	/**
	 * Called when a client sends REQUEST_PLAY_ROLL. Validates it's this player's
	 * turn during the ROLL_AWAITING window, then runs the simulation and starts
	 * the ROLL_PLAYBACK phase.
	 */
	onPlayerRequestPlayRoll(userId: string, data: RequestPlayRollPayload) {
		console.log('gameManager: onPlayerRequestPlayRoll: userId', userId)

		const laneIndex = LaneStore.findLaneByUserId(userId)
		if (laneIndex === undefined) {
			console.log('gameManager: onPlayerRequestPlayRoll: user not in any lane')
			return
		}
		if (LaneStore.getCurrentFrameUserId(laneIndex) !== userId) {
			console.log('gameManager: onPlayerRequestPlayRoll: not this player\'s turn, ignoring')
			return
		}

		const rt = this.getRuntime(laneIndex)
		if (rt.phase !== LanePhase.ROLL_AWAITING) {
			console.log('gameManager: onPlayerRequestPlayRoll: wrong phase', rt.phase, '— ignoring late request')
			return
		}

		this.simulateAndPlaybackRoll(laneIndex, userId, data)
	}


	/**
	 * Run the Physics simulation for this roll, assemble a replay payload and
	 * broadcast it via NOTIFY_PLAYER_ROLL_PLAYBACK. Enters ROLL_PLAYBACK phase.
	 */
	private simulateAndPlaybackRoll(laneIndex: number, userId: string, data: RequestPlayRollPayload) {
		const simStartTime      = Date.now()

		const frameIndex        = LaneStore.getCurrentFrameIndex(laneIndex)
		const rollIndex         = LaneStore.getCurrentRollIndex(laneIndex)
		const rt                = this.getRuntime(laneIndex)
		const startingPinStates = rt.pinStanding.slice()

		// Run the sim - the could take a couple of seconds
		const simInput: SimulationInput = {
			direction: Vector3.create(data.direction.x, data.direction.y, data.direction.z),
			duration : PhysicsSimulationSettings.simDuration,
			pinStates: startingPinStates,
			position : Vector3.create(data.position.x, data.position.y, data.position.z),
			spin     : data.spin,
			strength : data.power,
		}
		console.log('gameManager: simulateAndPlaybackRoll: simInput', JSON.stringify(simInput, null, 2))
		const simResults: SimulationResult = getSimulationResults(simInput)

		const simDuration = Date.now() - simStartTime
		console.log(`gameManager: simulateAndPlaybackRoll: simDuration ${simDuration}ms`)

		const score = this.countTrueValues(startingPinStates) - this.countTrueValues(simResults.finalPinStates)
		const payload = this.buildRollPayload(userId, frameIndex, rollIndex, simResults, startingPinStates, score)

		// Update lane runtime + scorecard from the simulation result.
		rt.pinStanding = simResults.finalPinStates
		LaneStore.addScore(laneIndex, frameIndex, userId, score)

		this.schedulePhase(laneIndex, LanePhase.ROLL_PLAYBACK, GameSettings.ROLL_REPLAY_DURATION)

		// Roll-playback carries the keyframe payload that's far too big for a
		// synced component, so this stays as a directed room message.
		ServerMessaging.notifyPlayerRollPlayback(laneIndex, payload)
	}


	/** Convert Cannon sim output into the wire-format NotifyPlayerRollPayload. */
	private buildRollPayload(
		userId           : string,
		frameIndex       : number,
		rollIndex        : number,
		simResults       : SimulationResult,
		startingPinStates: boolean[],
		score            : number,
	): NotifyPlayerRollPayload {

		const payload: NotifyPlayerRollPayload = {
			userId           : userId,
			frameIndex       : frameIndex,
			rollIndex        : rollIndex,
			startingPinStates: startingPinStates,
			finalPinStates   : simResults.finalPinStates,
			gutterBall       : simResults.gutterBall,
			ballKeyframes    : simResults.compressed.ballKeyframes,
			duration         : simResults.duration,
			pinsKeyframes    : simResults.compressed.pinsKeyframes,
			score            : score,
			sentAt           : Date.now(),
		}

		return payload
	}


	// =========================================================================
	// MARK: Phase 7 — End Roll
	// =========================================================================
	/**
	 * End the current roll. Called either after ROLL_PLAYBACK completes, or
	 * when the ROLL_AWAITING timer elapses without a request (timedOut=true).
	 * Enters the ROLL_END_DELAY phase; the phase change auto-fires
	 * `ON_MY_ROLL_END` / `ON_GROUP_ROLL_END` on each client via `MyLane`.
	 */
	private endRoll(laneIndex: number, timedOut: boolean) {
		const userId = LaneStore.getCurrentFrameUserId(laneIndex)
		if (!userId) return

		if (timedOut) {
			// No request arrived within ROLL_MAX_DURATION — count as 0-pin roll.
			console.log(`gameManager: endRoll: lane ${laneIndex}, user ${userId} — TIMEOUT`)
			const frameIndex = LaneStore.getCurrentFrameIndex(laneIndex)
			LaneStore.addScore(laneIndex, frameIndex, userId, 0)
		} else {
			console.log(`gameManager: endRoll: lane ${laneIndex}, user ${userId}`)
		}

		LaneStore.setCurrentRollStartTime(laneIndex, 0)

		this.schedulePhase(laneIndex, LanePhase.ROLL_END, GameSettings.FRAME_DELAY_BETWEEN_TURNS)
	}


	/**
	 * Invoked when ROLL_END_DELAY elapses. Decides whether the current player
	 * gets another roll in this frame or we wrap up their frame.
	 */
	private afterRollEnd(laneIndex: number) {
		const rt           = this.getRuntime(laneIndex)
		const rollIndex    = LaneStore.getCurrentRollIndex(laneIndex)
		const allDown      = rt.pinStanding.every(s => !s)
		const isFinalFrame = rollIndex == (GameSettings.MAX_FRAMES_PER_GAME - 1)
		const userId       = LaneStore.getCurrentFrameUserId(laneIndex) || ''
		const frames       = LaneStore.getScoresMap(laneIndex).get(userId) || []
		const firstRollWasAStrike = frames?.[0]?.[0] === 10

		// Standard frames 0–8: two rolls unless a strike on the first.
		// TODO: 10th-frame bonus rolls (strike/spare ⇒ up to 3 rolls).
		if (rollIndex === 0 && !allDown) {
			LaneStore.setCurrentRollIndex(laneIndex, 1)
			this.startPlayerRoll(laneIndex)
		}
		else if (isFinalFrame && rollIndex === 1 && firstRollWasAStrike) {
			LaneStore.setCurrentRollIndex(laneIndex, 2)
			this.startPlayerRoll(laneIndex)
		} else {
			this.endPlayerFrame(laneIndex)
		}
	}


	// =========================================================================
	// MARK: Phase 8 — End Player Frame
	// =========================================================================
	/**
	 * Enter FRAME_END_DELAY before next player; the phase change auto-fires
	 * `ON_MY_FRAME_END` / `ON_GROUP_FRAME_END` on each client via `MyLane`.
	 */
	private endPlayerFrame(laneIndex: number) {
		const userId = LaneStore.getCurrentFrameUserId(laneIndex)
		if (!userId) return

		console.log(`gameManager: endPlayerFrame: lane ${laneIndex}, user ${userId}`)

		this.schedulePhase(laneIndex, LanePhase.FRAME_END, GameSettings.FRAME_DELAY_BETWEEN_TURNS)
	}


	// =========================================================================
	// MARK: Phase 9 — Advance to Next Player / Frame
	// =========================================================================
	/**
	 * Move on to the next player in the rotation. If we've cycled back to the
	 * first player, advance the frame index. After 10 frames we end the game.
	 */
	private advanceToNextPlayerFrame(laneIndex: number) {
		const players = LaneStore.getLaneUserIds(laneIndex)
		if (players.length === 0) {
			this.endGame(laneIndex)
			return
		}

		let playerIndex = LaneStore.getCurrentFramePlayerIndex(laneIndex) + 1
		let frameIndex  = LaneStore.getCurrentFrameIndex(laneIndex)

		if (playerIndex >= players.length) {
			playerIndex = 0
			frameIndex++
		}

		if (frameIndex >= GameSettings.MAX_FRAMES_PER_GAME) {
			this.endGame(laneIndex)
			return
		}

		this.startPlayerFrame(laneIndex, playerIndex, frameIndex)
	}


	// =========================================================================
	// MARK: Phase 10 — End Game
	// =========================================================================
	private endGame(laneIndex: number) {
		console.log(`gameManager: endGame: lane ${laneIndex}`)

		// Setting phase=NONE is the trigger clients use (via MyLane) to fire
		// ON_GROUP_GAME_END and clear their local laneIndex.
		LaneStore.setPhase(laneIndex, LanePhase.NONE)

		this.resetLane(laneIndex)
	}


	private resetLane(laneIndex: number) {
		this.runtime.delete(laneIndex)
		LaneStore.resetLane(laneIndex)
	}


	// =========================================================================
	// MARK: SYSTEM — Frame Watcher
	// =========================================================================
	/**
	 * Polls every active lane and advances the phase whenever its timer elapses.
	 * All game progression flows through this loop; phase-specific functions
	 * only do their own work and call schedulePhase() to hand control back.
	 */
	private systemFrameWatcher = (_dt: number) => {
		let activeGameCount = 0
		const now = Date.now()

		for (let laneIndex = 0; laneIndex < GameSettings.MAX_LANES; laneIndex++) {
			if (LaneStore.getPhase(laneIndex) === LanePhase.NONE) continue

			activeGameCount++

			const rt = this.runtime.get(laneIndex)
			if (!rt) continue
			if (rt.phase === LanePhase.NONE) continue
			if (now < rt.phaseEndTime) continue

			// Clear the phase BEFORE invoking the handler; the handler is
			// responsible for scheduling the next phase via schedulePhase().
			const completed = rt.phase
			rt.phase        = LanePhase.NONE
			rt.phaseEndTime = 0

			this.onPhaseComplete(laneIndex, completed)
		}

		if (activeGameCount === 0 && this.frameWatcherSystemActive) {
			engine.removeSystem(this.systemFrameWatcher)
			this.frameWatcherSystemActive = false
		}
	}


	/** Route a completed phase to the function that advances from it. */
	private onPhaseComplete(laneIndex: number, completed: LanePhase) {
		switch (completed) {
			case LanePhase.WAITING:
				this.onWaitingPhaseComplete(laneIndex)
				break
			case LanePhase.FRAME_START:
				this.startPlayerRoll(laneIndex)
				break
			case LanePhase.ROLL_AWAITING:
				// Player never requested a roll in time — timeout.
				this.endRoll(laneIndex, true)
				break
			case LanePhase.ROLL_PLAYBACK:
				this.endRoll(laneIndex, false)
				break
			case LanePhase.ROLL_END:
				this.afterRollEnd(laneIndex)
				break
			case LanePhase.FRAME_END:
				this.advanceToNextPlayerFrame(laneIndex)
				break
			default:
				console.log('gameManager: onPhaseComplete: unhandled phase', completed)
		}
	}


	// =========================================================================
	// MARK: Helpers
	// =========================================================================
	private ensureFrameWatcherRunning() {
		if (this.frameWatcherSystemActive) return
		this.frameWatcherSystemActive = true
		engine.addSystem(this.systemFrameWatcher)
	}

	private schedulePhase(laneIndex: number, phase: LanePhase, durationMs: number) {
		const runtime        = this.getRuntime(laneIndex)
		runtime.phase        = phase
		runtime.phaseEndTime = Date.now() + durationMs
		
		LaneStore.setPhase(laneIndex, phase)
	}

	private getRuntime(laneIndex: number): LaneRuntime {
		let runtime = this.runtime.get(laneIndex)
		if (!runtime) {
			runtime = { phase: LanePhase.NONE, phaseEndTime: 0, pinStanding: newFullPinRack() }
			this.runtime.set(laneIndex, runtime)
		}
		return runtime
	}

	private countTrueValues(array: boolean[]): number {
		var count = 0
		for (const value of array) {
			if (value) count++
		}
		return count		
	}
}


function newFullPinRack(): boolean[] {
	const rack: boolean[] = []
	for (let i = 0; i < PIN_LANE_LOCAL_POSITIONS.length; i++) rack.push(true)
	return rack
}


export const gameManager = new GameManager()




