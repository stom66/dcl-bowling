import * as utils from "@dcl-sdk/utils"
import { engine } from "@dcl/sdk/ecs"
import { Quaternion, Vector3 } from "@dcl/sdk/math"

import { LanePhase } from "src/shared/enums"
import { GameSettings } from "src/shared/settings"
import { NotifyPlayerRollPayload, RequestPlayRollPayload, RollPayload } from "src/shared/types/shared-types"

import { PIN_LANE_LOCAL_POSITIONS } from 'src/server/physics/physics.pin-layout'
import { getSimulationResults } from "src/server/physics/physics.client"
import { GameSettings as PhysicsSimulationSettings } from "src/server/physics/physics.settings"
import { SimulationInput, SimulationResult } from "src/server/physics/types"
import * as ServerMessaging from "src/server/serverMessaging"
import { ServerStore } from "src/server/serverStore"


/** Per-lane runtime state that lives only on the server (not part of the wire payload). */
type LaneRuntime = {
	phase        : LanePhase
	phaseEndTime : number     // Date.now() ms when the current phase's timer elapses
	pinStanding  : boolean[]  // Standing state of each of the 10 pins for the current player's frame
}


class GameManager {
	static instance: GameManager

	private readonly store: ServerStore
	private readonly runtime = new Map<number, LaneRuntime>()

	private frameWatcherSystemActive: boolean = false

	constructor() {
		this.store = ServerStore.getInstance()
	}


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

		if (laneIndex < 0 || laneIndex >= GameSettings.MAX_LANES) {
			console.log('gameManager: onPlayerRequestJoin: laneIndex out of range', laneIndex)
			return
		}

		if (this.store.getPlayers(laneIndex).has(userId)) {
			console.log('gameManager: onPlayerRequestJoin: player already in game, ignoring')
			return
		}

		if (this.store.getLanePhase(laneIndex) !== LanePhase.NONE && this.store.getLanePhase(laneIndex) !== LanePhase.GAME_STARTING) {
			console.log('gameManager: onPlayerRequestJoin: game already started, ignoring')
			return
		}

		const isFirstPlayer = this.store.getPlayers(laneIndex).size === 0

		// await so profile fetch completes before notifies / any follow-up logic
		await this.store.addPlayer(userId, laneIndex)

		ServerMessaging.notifyJoinGame(userId, laneIndex)
		ServerMessaging.notifyLaneStateUpdate(laneIndex)

		// Starting the countdown is what transitions a brand-new lane into the
		// game lifecycle. Only the first joiner triggers it.
		if (isFirstPlayer && this.store.getLanePhase(laneIndex) === LanePhase.NONE) {
			this.startGameCountdown(laneIndex)
		}
	}


	// =========================================================================
	// MARK: Phase 2 — Start Game Countdown
	// =========================================================================
	/** Mark the lane as STARTING and schedule startGame() after the countdown. */
	private startGameCountdown(laneIndex: number) {
		console.log('gameManager: startGameCountdown: laneIndex', laneIndex)

		this.store.setLanePhase(laneIndex, LanePhase.GAME_STARTING)
		this.store.setGameStartTime(laneIndex, Date.now() + GameSettings.GAME_START_COUNTDOWN_DURATION)

		ServerMessaging.notifyLaneStateUpdate(laneIndex)

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
	 * system is running.
	 */
	private startGame(laneIndex: number) {
		console.log('gameManager: startGame: laneIndex', laneIndex)

		// Everyone left during the countdown — bail out cleanly.
		if (this.store.getPlayers(laneIndex).size === 0) {
			console.log('gameManager: startGame: no players, aborting')
			this.resetLane(laneIndex)
			return
		}

		this.store.setCurrentFrameIndex(laneIndex, 0)
		this.store.setCurrentFramePlayerIndex(laneIndex, 0)
		this.store.setCurrentRollIndex(laneIndex, 0)
		this.store.setCurrentFrameUserId(laneIndex, undefined)
		this.store.setCurrentRollStartTime(laneIndex, undefined)
		this.store.initLaneScorecards(laneIndex)

		this.store.setLanePhase(laneIndex, LanePhase.WAITING)

		this.runtime.set(laneIndex, {
			phase       : LanePhase.WAITING,
			phaseEndTime: 0,
			pinStanding : newFullPinRack(),
		})

		ServerMessaging.notifyGameStart(laneIndex)

		this.ensureFrameWatcherRunning()

		// Kick off the first frame for the first player. The extra delay here
		// gives clients time to react to the NOTIFY_GAME_START before the first
		// frame-start notification goes out.
		this.startPlayerFrame(laneIndex, 0, 0, GameSettings.GAME_START_INITIAL_DELAY)
	}


	// =========================================================================
	// MARK: Phase 4 — Start Player Frame
	// =========================================================================
	/**
	 * Begin a frame for a specific player. Resets pin rack + roll index, sends
	 * NOTIFY_PLAYER_FRAME_START and schedules the FRAME_START_DELAY phase.
	 */
	private startPlayerFrame(
		laneIndex   : number,
		playerIndex : number,
		frameIndex  : number,
		delayMs     : number = GameSettings.FRAME_DELAY_BEFORE_ROLL_START,
	) {
		const players = Array.from(this.store.getPlayers(laneIndex).keys())
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

		this.store.setCurrentFrameIndex(laneIndex, frameIndex)
		this.store.setCurrentFramePlayerIndex(laneIndex, playerIndex)
		this.store.setCurrentFrameUserId(laneIndex, userId)
		this.store.setCurrentRollIndex(laneIndex, 0)
		this.store.setCurrentRollStartTime(laneIndex, undefined)

		const rt = this.getRuntime(laneIndex)
		rt.pinStanding = newFullPinRack()

		this.schedulePhase(laneIndex, LanePhase.FRAME_START, delayMs)
		
		ServerMessaging.notifyPlayerFrameStart(laneIndex, userId)
		ServerMessaging.notifyLaneStateUpdate(laneIndex)
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
		const userId = this.store.getCurrentFrameUserId(laneIndex)
		if (!userId) return

		const rollIndex = this.store.getCurrentRollIndex(laneIndex)
		const rt = this.getRuntime(laneIndex)
		const pinStanding = rt.pinStanding.slice()

		console.log(`gameManager: startPlayerRoll: lane ${laneIndex}, user ${userId}, rollIndex ${rollIndex}`)

		this.store.setCurrentRollStartTime(laneIndex, Date.now())

		this.schedulePhase(laneIndex, LanePhase.ROLL_AWAITING, GameSettings.ROLL_MAX_DURATION)

		ServerMessaging.notifyPlayerRollStart(laneIndex, userId, pinStanding)
		ServerMessaging.notifyLaneStateUpdate(laneIndex)

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

		const laneIndex = this.store.findLaneByUserId(userId)
		if (laneIndex === undefined) {
			console.log('gameManager: onPlayerRequestPlayRoll: user not in any lane')
			return
		}
		if (this.store.getCurrentFrameUserId(laneIndex) !== userId) {
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

		const frameIndex        = this.store.getCurrentFrameIndex(laneIndex)
		const rollIndex         = this.store.getCurrentRollIndex(laneIndex)
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
		this.store.addScore(laneIndex, frameIndex, userId, score)

		this.schedulePhase(laneIndex, LanePhase.ROLL_PLAYBACK, GameSettings.ROLL_REPLAY_DURATION)

		ServerMessaging.notifyPlayerRollPlayback(laneIndex, payload)
		ServerMessaging.notifyLaneStateUpdate(laneIndex)
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
	 * Emits NOTIFY_PLAYER_ROLL_END and enters the ROLL_END_DELAY phase.
	 */
	private endRoll(laneIndex: number, timedOut: boolean) {
		const userId = this.store.getCurrentFrameUserId(laneIndex)
		if (!userId) return

		if (timedOut) {
			// No request arrived within ROLL_MAX_DURATION — count as 0-pin roll.
			console.log(`gameManager: endRoll: lane ${laneIndex}, user ${userId} — TIMEOUT`)
			const frameIndex = this.store.getCurrentFrameIndex(laneIndex)
			this.store.getFrames(laneIndex).get(userId)?.[frameIndex]?.push(0)
		} else {
			console.log(`gameManager: endRoll: lane ${laneIndex}, user ${userId}`)
		}

		this.store.setCurrentRollStartTime(laneIndex, undefined)

		this.schedulePhase(laneIndex, LanePhase.ROLL_END, GameSettings.FRAME_DELAY_BETWEEN_TURNS)

		ServerMessaging.notifyPlayerRollEnd(laneIndex, userId)
		ServerMessaging.notifyLaneStateUpdate(laneIndex)
	}


	/**
	 * Invoked when ROLL_END_DELAY elapses. Decides whether the current player
	 * gets another roll in this frame or we wrap up their frame.
	 */
	private afterRollEnd(laneIndex: number) {
		const rt        = this.getRuntime(laneIndex)
		const rollIndex = this.store.getCurrentRollIndex(laneIndex)
		const allDown   = rt.pinStanding.every(s => !s)

		// Standard frames 0–8: two rolls unless a strike on the first.
		// TODO: 10th-frame bonus rolls (strike/spare ⇒ up to 3 rolls).
		if (rollIndex === 0 && !allDown) {
			this.store.setCurrentRollIndex(laneIndex, 1)
			this.startPlayerRoll(laneIndex)
		} else {
			this.endPlayerFrame(laneIndex)
		}
	}


	// =========================================================================
	// MARK: Phase 8 — End Player Frame
	// =========================================================================
	/** Emit NOTIFY_PLAYER_FRAME_END and enter FRAME_END_DELAY before next player. */
	private endPlayerFrame(laneIndex: number) {
		const userId = this.store.getCurrentFrameUserId(laneIndex)
		if (!userId) return

		console.log(`gameManager: endPlayerFrame: lane ${laneIndex}, user ${userId}`)

		this.schedulePhase(laneIndex, LanePhase.FRAME_END, GameSettings.FRAME_DELAY_BETWEEN_TURNS)
		
		ServerMessaging.notifyPlayerFrameEnd(laneIndex, userId)
		ServerMessaging.notifyLaneStateUpdate(laneIndex)
	}


	// =========================================================================
	// MARK: Phase 9 — Advance to Next Player / Frame
	// =========================================================================
	/**
	 * Move on to the next player in the rotation. If we've cycled back to the
	 * first player, advance the frame index. After 10 frames we end the game.
	 */
	private advanceToNextPlayerFrame(laneIndex: number) {
		const players = Array.from(this.store.getPlayers(laneIndex).keys())
		if (players.length === 0) {
			this.endGame(laneIndex)
			return
		}

		let playerIndex = this.store.getCurrentFramePlayerIndex(laneIndex) + 1
		let frameIndex  = this.store.getCurrentFrameIndex(laneIndex)

		if (playerIndex >= players.length) {
			playerIndex = 0
			frameIndex++
		}

		if (frameIndex >= 10) {
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

		this.store.setLanePhase(laneIndex, LanePhase.NONE)

		ServerMessaging.notifyGameEnd(laneIndex)

		this.resetLane(laneIndex)
	}


	private resetLane(laneIndex: number) {
		this.runtime.delete(laneIndex)
		this.store.setLanePhase(laneIndex, LanePhase.NONE)
		this.store.resetLaneState(laneIndex)
		ServerMessaging.notifyLaneStateUpdate(laneIndex)
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
			if (this.store.getLanePhase(laneIndex) === LanePhase.NONE) continue

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
		
		this.store.setLanePhase(laneIndex, phase)
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




