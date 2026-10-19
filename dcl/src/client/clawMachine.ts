import * as utils from '@dcl-sdk/utils'
import {
	Animator,
	ColliderLayer,
	engine,
	Entity,
	GltfContainer,
	InputAction,
	Material,
	MeshCollider,
	MeshRenderer,
	pointerEventsSystem,
	Transform,
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerTickets } from 'src/shared/components/definitions/shared.playerTickets'
import { MessageType, net } from 'src/shared/net'
import { NotifyClawResultPayload } from 'src/shared/types/shared-types'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { sfx, SoundManager } from 'src/client/soundManager'


/** Tag → ticket value and matching top-sign suffix (`claw-machine-top.0N.gltf`). */
const PRIZE_TAGS: { tag: string, ticketValue: number, topSuffix: string }[] = [
	{ tag: 'prizes5',   ticketValue: 5,   topSuffix: '01' },
	{ tag: 'prizes10',  ticketValue: 10,  topSuffix: '02' },
	{ tag: 'prizes25',  ticketValue: 25,  topSuffix: '03' },
	{ tag: 'prizes100', ticketValue: 100, topSuffix: '04' },
]

const BODY_MODEL_SRC = 'assets/models/claw-machine.gltf'

const IDLE_CLIP   = 'idle'
const ACTION_CLIPS = ['action01', 'action02', 'action03'] as const
const SPIN_CLIP   = 'spin'

/** Seconds to crossfade the finished action → idle. */
const BLEND_DURATION = 0.4

/** Extra hold after the action finishes before the reward popup may show. */
const REWARD_HOLD_AFTER_ACTION_MS = 1200

/** Max ms to wait before starting a looping clip, so machines do not animate in lockstep. */
const LOOP_START_DELAY_MAX_MS = 4000

const MAX_INTERACT_DISTANCE = 8


type ActionClip = typeof ACTION_CLIPS[number]

type MachinePhase = 'idle' | 'waiting' | 'action' | 'blend'


type MachineState = {
	anchor           : Entity
	body             : Entity
	ticketValue      : number
	phase            : MachinePhase
	activeAction     : ActionClip | undefined
	blendElapsed     : number
	wasActionPlaying : boolean
}


export namespace ClawMachine {

	let isInitialized = false

	const machines: MachineState[] = []

	/** Machine waiting on `NOTIFY_CLAW_RESULT`. */
	let pendingMachine: MachineState | undefined

	/** RewardLayer holds claw offers until this timestamp. */
	let suppressRewardUntilMs = 0


	// MARK: isRewardSuppressed
	/**
	 * True while a claw presentation is in progress so the reward popup waits.
	 */
	export function isRewardSuppressed(): boolean {
		return Date.now() < suppressRewardUntilMs
	}


	// MARK: init
	/**
	 * Finds tagged prize cubes, strips their mesh, and spawns body + top children.
	 * Tags are `prizes5` / `prizes10` / `prizes25` / `prizes100`.
	 */
	export function init(): void {
		if (isInitialized) return
		isInitialized = true

		for (const { tag, ticketValue, topSuffix } of PRIZE_TAGS) {
			const entities = engine.getEntitiesByTag(tag)
			for (const entity of entities) {
				if (machines.some((m) => m.anchor === entity)) continue
				setupMachine(entity, ticketValue, topSuffix)
			}
		}

		net.onMessage(MessageType.NOTIFY_CLAW_RESULT, (data) => {
			onClawResult(data as NotifyClawResultPayload)
		})

		if (machines.length === 0) {
			console.log('ClawMachine: init: no claw machines found')
			return
		}

		console.log('ClawMachine: init: registered', machines.length, 'machine(s)')
		engine.addSystem(sys_update)
	}


	// MARK: setupMachine
	/**
	 * Clears the placeholder cube visuals and builds the body + top under it.
	 */
	function setupMachine(
		anchor     : Entity,
		ticketValue: number,
		topSuffix  : string,
	): void {
		stripPlaceholder(anchor)

		const body = createBody(anchor)
		createTop(anchor, topSuffix)

		const state: MachineState = {
			anchor,
			body,
			ticketValue,
			phase           : 'idle',
			activeAction    : undefined,
			blendElapsed    : 0,
			wasActionPlaying: false,
		}
		machines.push(state)

		pointerEventsSystem.onPointerDown(
			{
				entity: body,
				opts  : {
					button       : InputAction.IA_PRIMARY,
					hoverText    : 'Play',
					maxDistance  : MAX_INTERACT_DISTANCE,
					showFeedback : true,
					showHighlight: true,
				},
			},
			() => {
				onInteract(state)
			},
		)
	}


	// MARK: stripPlaceholder
	/**
	 * Removes the Creator Hub cube mesh (and related components) so only the GLTF children show.
	 */
	function stripPlaceholder(anchor: Entity): void {
		if (MeshRenderer.has(anchor)) MeshRenderer.deleteFrom(anchor)
		if (Material.has(anchor)) Material.deleteFrom(anchor)
		if (MeshCollider.has(anchor)) MeshCollider.deleteFrom(anchor)
	}


	// MARK: randomLoopStartDelayMs
	/** Random delay in `[0, LOOP_START_DELAY_MAX_MS]` so looping clips start out of phase. */
	function randomLoopStartDelayMs(): number {
		return Math.floor(Math.random() * (LOOP_START_DELAY_MAX_MS + 1))
	}


	// MARK: scheduleLoopStart
	/**
	 * Holds `clip` on its first frame, then starts looping playback after a random delay.
	 */
	function scheduleLoopStart(
		entity: Entity,
		clip  : string,
	): void {
		const delayMs = randomLoopStartDelayMs()
		utils.timers.setTimeout(() => {
			const animator = Animator.getMutableOrNull(entity)
			if (!animator) return

			const state = animator.states.find((s) => s.clip === clip)
			if (!state) return

			state.playing     = true
			state.loop        = true
			state.speed       = 1
			state.shouldReset = true
			state.weight      = 1
		}, delayMs)
	}


	// MARK: createBody
	/**
	 * Spawns `claw-machine.gltf` under the anchor. Idle starts after a random delay; action clips stay ready.
	 */
	function createBody(anchor: Entity): Entity {
		const body = engine.addEntity()
		Transform.create(body, {
			parent  : anchor,
			position: Vector3.Zero(),
		})
		GltfContainer.create(body, {
			src                          : BODY_MODEL_SRC,
			visibleMeshesCollisionMask   : 0,
			invisibleMeshesCollisionMask : ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS,
		})
		// Hold idle on frame 0 until the staggered start kicks in.
		Animator.create(body, {
			states: [
				{ clip: IDLE_CLIP, playing: true,  loop: false, weight: 1, speed: 0, shouldReset: false },
				{ clip: 'action01', playing: false, loop: false, weight: 0, speed: 1, shouldReset: false },
				{ clip: 'action02', playing: false, loop: false, weight: 0, speed: 1, shouldReset: false },
				{ clip: 'action03', playing: false, loop: false, weight: 0, speed: 1, shouldReset: false },
			],
		})
		scheduleLoopStart(body, IDLE_CLIP)
		return body
	}


	// MARK: createTop
	/**
	 * Spawns the prize-tier top sign. `spin` starts after a random delay.
	 */
	function createTop(
		anchor   : Entity,
		topSuffix: string,
	): Entity {
		const top = engine.addEntity()
		Transform.create(top, {
			parent  : anchor,
			position: Vector3.Zero(),
		})
		GltfContainer.create(top, {
			src: `assets/models/claw-machine-top.${topSuffix}.gltf`,
		})
		Animator.create(top, {
			states: [
				{ clip: SPIN_CLIP, playing: true, loop: false, weight: 1, speed: 0, shouldReset: false },
			],
		})
		scheduleLoopStart(top, SPIN_CLIP)
		return top
	}


	// MARK: getLocalTicketBalance
	/** Synced ticket balance for the local player. */
	function getLocalTicketBalance(): number {
		const userId = ClientStore.getInstance().getUserId()
		if (!userId) return 0
		return ComponentStore.getOrNull(PlayerTickets, { key: userId })?.balance ?? 0
	}


	// MARK: onInteract
	/**
	 * Spends tickets via the server when the player uses a claw machine.
	 */
	function onInteract(state: MachineState): void {
		if (state.phase !== 'idle' || pendingMachine) {
			console.log('ClawMachine: onInteract: busy, ignoring', state.ticketValue)
			return
		}

		const balance = getLocalTicketBalance()
		if (balance < state.ticketValue) {
			console.log('ClawMachine: onInteract: not enough tickets', balance, state.ticketValue)
			SoundManager.playSound(sfx.ui_purchase_error)
			return
		}

		pendingMachine = state
		state.phase    = 'waiting'
		console.log('ClawMachine: onInteract: requesting play', state.ticketValue)
		ClientMessaging.requestClawPlay(state.ticketValue)
	}


	// MARK: onClawResult
	/**
	 * Plays the claw action on a win, or clears busy state on refund / failure.
	 */
	function onClawResult(data: NotifyClawResultPayload): void {
		const state = pendingMachine
		pendingMachine = undefined

		if (!state) {
			console.log('ClawMachine: onClawResult: no pending machine', data)
			return
		}

		if (!data.ok) {
			console.log('ClawMachine: onClawResult: rejected', data)
			state.phase = 'idle'
			SoundManager.playSound(sfx.ui_purchase_error)
			return
		}

		if (data.refunded) {
			console.log('ClawMachine: onClawResult: refunded, pool empty')
			state.phase = 'idle'
			SoundManager.playSound(sfx.ui_purchase_error)
			return
		}

		suppressRewardUntilMs = Date.now() + 15_000
		playAction(state, pickActionClip())
	}


	// MARK: pickActionClip
	/** Picks one of the three claw action clips at random. */
	function pickActionClip(): ActionClip {
		const index = Math.floor(Math.random() * ACTION_CLIPS.length)
		return ACTION_CLIPS[index]
	}


	// MARK: playAction
	/**
	 * Starts the chosen action at full weight with idle underneath at zero weight.
	 */
	function playAction(
		state : MachineState,
		clip  : ActionClip,
	): void {
		const animator = Animator.getMutableOrNull(state.body)
		if (!animator) {
			console.error('ClawMachine: playAction: missing Animator', state.body)
			return
		}

		const idle = animator.states.find((s) => s.clip === IDLE_CLIP)
		if (!idle) {
			console.error('ClawMachine: playAction: missing idle clip')
			return
		}

		for (const stateClip of animator.states) {
			if (stateClip.clip === IDLE_CLIP) continue
			const isActive         = stateClip.clip === clip
			stateClip.playing      = isActive
			stateClip.loop         = false
			stateClip.shouldReset  = isActive
			stateClip.weight       = isActive ? 1 : 0
			stateClip.speed        = 1
		}

		idle.playing = true
		idle.loop    = true
		idle.weight  = 0
		idle.speed   = 1

		state.phase            = 'action'
		state.activeAction     = clip
		state.blendElapsed     = 0
		state.wasActionPlaying = false

		console.log('ClawMachine: playAction: started', clip, 'tickets', state.ticketValue)
	}


	// MARK: startBlendToIdle
	/**
	 * Holds the finished action pose and crossfades weight into looping idle.
	 */
	function startBlendToIdle(state: MachineState): void {
		const clip = state.activeAction
		if (!clip) {
			state.phase = 'idle'
			return
		}

		const animator = Animator.getMutableOrNull(state.body)
		if (!animator) return

		const idle   = animator.states.find((s) => s.clip === IDLE_CLIP)
		const action = animator.states.find((s) => s.clip === clip)
		if (!idle || !action) return

		action.playing     = true
		action.loop        = false
		action.shouldReset = false
		action.speed       = 0
		action.weight      = 1

		idle.playing = true
		idle.loop    = true
		idle.speed   = 1
		idle.weight  = 0

		state.phase        = 'blend'
		state.blendElapsed = 0

		console.log('ClawMachine: startBlendToIdle: blending', clip, '→ idle', state.ticketValue)
	}


	// MARK: finishBlend
	/**
	 * Settles on looping idle at full weight after the crossfade completes.
	 */
	function finishBlend(state: MachineState): void {
		const animator = Animator.getMutableOrNull(state.body)
		if (!animator) {
			state.phase        = 'idle'
			state.activeAction = undefined
			return
		}

		for (const stateClip of animator.states) {
			if (stateClip.clip === IDLE_CLIP) {
				stateClip.playing = true
				stateClip.loop    = true
				stateClip.weight  = 1
				stateClip.speed   = 1
			} else {
				stateClip.playing = false
				stateClip.weight  = 0
			}
		}

		state.phase            = 'idle'
		state.activeAction     = undefined
		state.blendElapsed     = 0
		state.wasActionPlaying = false
	}


	// MARK: sys_update
	/**
	 * Detects action completion and drives the weight blend back to idle.
	 */
	function sys_update(dt: number): void {
		for (const state of machines) {
			if (state.phase === 'action') {
				const clip = state.activeAction
				if (!clip) {
					state.phase = 'idle'
					continue
				}

				const animator  = Animator.get(state.body)
				const action    = animator.states.find((s) => s.clip === clip)
				const isPlaying = action?.playing ?? false

				if (state.wasActionPlaying && !isPlaying) {
					suppressRewardUntilMs = Date.now() + REWARD_HOLD_AFTER_ACTION_MS
					startBlendToIdle(state)
					continue
				}

				state.wasActionPlaying = isPlaying
				continue
			}

			if (state.phase !== 'blend') continue

			const clip = state.activeAction
			if (!clip) {
				state.phase = 'idle'
				continue
			}

			state.blendElapsed += dt
			const t = Math.min(1, state.blendElapsed / BLEND_DURATION)

			const animator = Animator.getMutableOrNull(state.body)
			if (!animator) {
				state.phase = 'idle'
				continue
			}

			const idle   = animator.states.find((s) => s.clip === IDLE_CLIP)
			const action = animator.states.find((s) => s.clip === clip)
			if (action) action.weight = 1 - t
			if (idle) idle.weight = t

			if (t >= 1) finishBlend(state)
		}
	}
}
