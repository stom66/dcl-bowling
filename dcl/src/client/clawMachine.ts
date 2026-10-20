import * as utils from '@dcl-sdk/utils'
import {
	Animator,
	Billboard,
	BillboardMode,
	ColliderLayer,
	engine,
	Entity,
	GltfContainer,
	GltfNodeModifiers,
	InputAction,
	Material,
	MeshCollider,
	MeshRenderer,
	pointerEventsSystem,
	TextureWrapMode,
	Transform,
} from '@dcl/sdk/ecs'
import { Color3, Vector2, Vector3 } from '@dcl/sdk/math'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerTickets } from 'src/shared/components/definitions/shared.playerTickets'
import { MessageType, net } from 'src/shared/net'
import { NotifyClawResultPayload } from 'src/shared/types/shared-types'

import { CameraController } from 'src/client/cameraController'
import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { sfx, SoundManager } from 'src/client/soundManager'


/** Tag → ticket value and matching body/top suffix (`claw-machine.0N` / `claw-machine-top.0N`). */
const PRIZE_TAGS: { tag: string, ticketValue: number, variant: string }[] = [
	{ tag: 'prizes5',   ticketValue: 5,   variant: '01' },
	{ tag: 'prizes10',  ticketValue: 10,  variant: '02' },
	{ tag: 'prizes25',  ticketValue: 25,  variant: '03' },
	{ tag: 'prizes100', ticketValue: 100, variant: '04' },
]

const IDLE_CLIP    = 'idle'
const ACTION_CLIPS = ['action01', 'action02', 'action03', 'action04'] as const
const SPIN_CLIP    = 'spin'

/**
 * Presentation lengths — may end before the full GLTF clip so the reward
 * hand-off can start once the ball is out of the chute.
 */
const ACTION_DURATION_MS: Record<ActionClip, number> = {
	action01: 10_000,
	action02: 6_750,
	action03: 6_750,
	action04: 6_750,
}

/** Seconds to crossfade the finished action → idle. */
const BLEND_DURATION = 0.4

/**
 * Idle / spin loop length in the exported GLTFs (~12.98s).
 * Start delays are shuffled across this window so machines stay out of phase.
 */
const LOOP_DURATION_MS = 13_000

const MAX_INTERACT_DISTANCE = 8

const NEON_GRADIENT_TEXTURE = 'assets/models/tex/neon-gradient.png'

/** UV units per second. Positive values slide neon-gradient sideways along X. */
const NEON_UV_SCROLL_SPEED = 0.1

/**
 * Full GLTF node paths for the split neon meshes (armature / bone / mesh).
 * Tops: neons.001–004. Bodies: neons.005–008 (one neon object per variant file).
 */
const TOP_NEON_NODE_BY_VARIANT: Record<string, string> = {
	'01': 'claw-machine-top.armature/Bone.001/neons.001',
	'02': 'claw-machine-top.armature.001/Bone.001/neons.002',
	'03': 'claw-machine-top.armature.003/Bone.001/neons.003',
	'04': 'claw-machine-top.armature.002/Bone.001/neons.004',
}

const BODY_NEON_NODE_BY_VARIANT: Record<string, string> = {
	'01': 'Armature.claw-machine/neons.005',
	'02': 'Armature.claw-machine/neons.006',
	'03': 'Armature.claw-machine/neons.007',
	'04': 'Armature.claw-machine/neons.008',
}


type ActionClip = typeof ACTION_CLIPS[number]

type MachinePhase = 'idle' | 'waiting' | 'action' | 'blend'


type NeonScrollTarget = {
	entity : Entity
	offsetX: number
}


type MachineState = {
	anchor         : Entity
	body           : Entity
	top            : Entity
	ticketValue    : number
	phase          : MachinePhase
	activeAction   : ActionClip | undefined
	blendElapsed   : number
	actionEndsAtMs : number
	pointerEnabled : boolean
}


export namespace ClawMachine {

	let isInitialized = false

	const machines: MachineState[] = []

	/** Body + top entities whose neon mesh UVs are scrolled each frame. */
	const neonTargets: NeonScrollTarget[] = []

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

		for (const { tag, ticketValue, variant } of PRIZE_TAGS) {
			const entities = engine.getEntitiesByTag(tag)
			for (const entity of entities) {
				if (machines.some((m) => m.anchor === entity)) continue
				setupMachine(entity, ticketValue, variant)
			}
		}

		net.onMessage(MessageType.NOTIFY_CLAW_RESULT, (data) => {
			onClawResult(data as NotifyClawResultPayload)
		})

		if (machines.length === 0) {
			console.log('ClawMachine: init: no claw machines found')
			return
		}

		scheduleStaggeredLoopStarts()
		engine.addSystem(sys_update)
		engine.addSystem(sys_scrollNeonGradient)

		console.log('ClawMachine: init: registered', machines.length, 'machine(s)')
	}


	// MARK: setupMachine
	/**
	 * Clears the placeholder cube visuals and builds the body + top under it.
	 */
	function setupMachine(
		anchor     : Entity,
		ticketValue: number,
		variant    : string,
	): void {
		stripPlaceholder(anchor)

		const body = createBody(anchor, variant)
		const top  = createTop(anchor, variant)

		const state: MachineState = {
			anchor,
			body,
			top,
			ticketValue,
			phase         : 'idle',
			activeAction  : undefined,
			blendElapsed  : 0,
			actionEndsAtMs: 0,
			pointerEnabled: false,
		}
		machines.push(state)
		setPointerEnabled(state, true)
	}


	// MARK: hoverTextFor
	/** Pointer hover label for a prize-tier ticket cost. */
	function hoverTextFor(ticketValue: number): string {
		return `Claim Prize - ${ticketValue} tickets`
	}


	// MARK: setPointerEnabled
	/**
	 * Registers or removes the body's pointer-down handler.
	 * Must not be called from inside that handler — defer via timer when disabling on interact.
	 */
	function setPointerEnabled(
		state  : MachineState,
		enabled: boolean,
	): void {
		if (state.pointerEnabled === enabled) return
		state.pointerEnabled = enabled

		if (enabled) {
			pointerEventsSystem.onPointerDown(
				{
					entity: state.body,
					opts  : {
						button       : InputAction.IA_PRIMARY,
						hoverText    : hoverTextFor(state.ticketValue),
						maxDistance  : MAX_INTERACT_DISTANCE,
						showFeedback : true,
						showHighlight: true,
					},
				},
				() => {
					onInteract(state)
				},
			)
			return
		}

		pointerEventsSystem.removeOnPointerDown(state.body)
	}


	// MARK: returnToIdle
	/** Clears busy presentation state and restores the interact prompt. */
	function returnToIdle(state: MachineState): void {
		state.phase          = 'idle'
		state.activeAction   = undefined
		state.blendElapsed   = 0
		state.actionEndsAtMs = 0
		setPointerEnabled(state, true)
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


	// MARK: shuffledDelaysMs
	/**
	 * Evenly spaced delays across {@link LOOP_DURATION_MS}, then shuffled, so
	 * N machines do not cluster on the same start time.
	 */
	function shuffledDelaysMs(count: number): number[] {
		if (count <= 0) return []

		const delays: number[] = []
		for (let i = 0; i < count; i++) {
			const slot   = (i / count) * LOOP_DURATION_MS
			const jitter = Math.floor(Math.random() * (LOOP_DURATION_MS / count))
			delays.push(Math.floor(slot + jitter))
		}

		for (let i = delays.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			const tmp = delays[i]
			delays[i] = delays[j]
			delays[j] = tmp
		}

		return delays
	}


	// MARK: scheduleLoopStart
	/**
	 * Holds `clip` on its first frame, then starts looping playback after `delayMs`.
	 * Skips the start if this body is mid-claw so a late idle kick-off cannot override the action.
	 */
	function scheduleLoopStart(
		entity : Entity,
		clip   : string,
		delayMs: number,
	): void {
		utils.timers.setTimeout(() => {
			const machine = machines.find((m) => m.body === entity)
			if (machine && machine.phase !== 'idle') return

			const animator = Animator.getMutableOrNull(entity)
			if (!animator) return

			const clipState = animator.states.find((s) => s.clip === clip)
			if (!clipState) return

			clipState.playing     = true
			clipState.loop        = true
			clipState.speed       = 1
			clipState.shouldReset = true
			clipState.weight      = 1
		}, delayMs)
	}


	// MARK: scheduleStaggeredLoopStarts
	/** Assigns unique start delays to every body idle and top spin clip. */
	function scheduleStaggeredLoopStarts(): void {
		const bodyDelays = shuffledDelaysMs(machines.length)
		const topDelays  = shuffledDelaysMs(machines.length)

		for (let i = 0; i < machines.length; i++) {
			const state = machines[i]
			scheduleLoopStart(state.body, IDLE_CLIP, bodyDelays[i] ?? 0)
			scheduleLoopStart(state.top,  SPIN_CLIP, topDelays[i] ?? 0)
		}
	}


	// MARK: neonGradientMaterial
	function neonGradientMaterial(offsetX: number) {
		return {
			material: {
				$case: 'pbr' as const,
				pbr  : {
					texture: Material.Texture.Common({
						src     : NEON_GRADIENT_TEXTURE,
						wrapMode: TextureWrapMode.TWM_REPEAT,
						offset  : Vector2.create(offsetX, 0),
					}),
					emissiveTexture: Material.Texture.Common({
						src     : NEON_GRADIENT_TEXTURE,
						wrapMode: TextureWrapMode.TWM_REPEAT,
						offset  : Vector2.create(offsetX, 0),
					}),
					emissiveColor    : Color3.create(0.5, 0.5, 0.5),
					emissiveIntensity: 1,
					metallic         : 0,
				},
			},
		}
	}


	// MARK: attachNeonScroll
	/**
	 * Overrides the split neon mesh material and registers the entity for UV scrolling.
	 * Each entity gets its own random phase in `[0, 1)`.
	 */
	function attachNeonScroll(
		entity  : Entity,
		nodePath: string,
	): void {
		const offsetX = Math.random()
		GltfNodeModifiers.create(entity, {
			modifiers: [{
				path    : nodePath,
				material: neonGradientMaterial(offsetX),
			}],
		})
		neonTargets.push({ entity, offsetX })
	}


	// MARK: createBody
	/**
	 * Spawns `claw-machine.0N.gltf` under the anchor. Idle starts after a staggered
	 * delay; action clips stay ready.
	 */
	function createBody(
		anchor : Entity,
		variant: string,
	): Entity {
		const body = engine.addEntity()
		Transform.create(body, {
			parent  : anchor,
			position: Vector3.Zero(),
		})
		GltfContainer.create(body, {
			src                          : `assets/models/claw-machine.${variant}.gltf`,
			visibleMeshesCollisionMask   : 0,
			invisibleMeshesCollisionMask : ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS,
		})
		// Hold idle on frame 0 until the staggered start kicks in.
		Animator.create(body, {
			states: [
				{ clip: IDLE_CLIP,  playing: true,  loop: false, weight: 1, speed: 0, shouldReset: false },
				{ clip: 'action01', playing: false, loop: false, weight: 0, speed: 1, shouldReset: false },
				{ clip: 'action02', playing: false, loop: false, weight: 0, speed: 1, shouldReset: false },
				{ clip: 'action03', playing: false, loop: false, weight: 0, speed: 1, shouldReset: false },
				{ clip: 'action04', playing: false, loop: false, weight: 0, speed: 1, shouldReset: false },
			],
		})

		const neonPath = BODY_NEON_NODE_BY_VARIANT[variant]
		if (neonPath) attachNeonScroll(body, neonPath)

		return body
	}


	// MARK: createTop
	/**
	 * Spawns the prize-tier top sign with a Y-axis billboard. `spin` starts after a staggered delay.
	 */
	function createTop(
		anchor : Entity,
		variant: string,
	): Entity {
		const top = engine.addEntity()
		Transform.create(top, {
			parent  : anchor,
			position: Vector3.Zero(),
		})
		GltfContainer.create(top, {
			src: `assets/models/claw-machine-top.${variant}.gltf`,
		})
		Billboard.create(top, {
			billboardMode: BillboardMode.BM_Y,
		})
		Animator.create(top, {
			states: [
				{ clip: SPIN_CLIP, playing: true, loop: false, weight: 1, speed: 0, shouldReset: false },
			],
		})

		const neonPath = TOP_NEON_NODE_BY_VARIANT[variant]
		if (neonPath) attachNeonScroll(top, neonPath)

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

		// Defer removal — mutating pointer handlers inside this callback re-fires the click.
		utils.timers.setTimeout(() => {
			if (state.phase !== 'idle') setPointerEnabled(state, false)
		}, 0)
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
			returnToIdle(state)
			SoundManager.playSound(sfx.ui_purchase_error)
			return
		}

		if (data.refunded) {
			console.log('ClawMachine: onClawResult: refunded, pool empty')
			returnToIdle(state)
			SoundManager.playSound(sfx.ui_purchase_error)
			return
		}

		playAction(state, pickActionClip())
	}


	// MARK: pickActionClip
	/** Picks one of the four claw action clips at random. */
	function pickActionClip(): ActionClip {
		const index = Math.floor(Math.random() * ACTION_CLIPS.length)
		return ACTION_CLIPS[index]
	}


	// MARK: playAction
	/**
	 * Plays the chosen action alone (pauses idle), then blends back after the clip's known length.
	 */
	function playAction(
		state : MachineState,
		clip  : ActionClip,
	): void {
		const durationMs = ACTION_DURATION_MS[clip]
		const started    = Animator.playSingleAnimation(state.body, clip, true)
		if (!started) {
			console.error('ClawMachine: playAction: playSingleAnimation failed', clip, state.body)
			suppressRewardUntilMs = 0
			CameraController.endClawCinematic()
			returnToIdle(state)
			return
		}

		CameraController.triggerClawCamera(state.body)

		state.phase           = 'action'
		state.activeAction    = clip
		state.blendElapsed    = 0
		state.actionEndsAtMs  = Date.now() + durationMs
		suppressRewardUntilMs = state.actionEndsAtMs
		setPointerEnabled(state, false)

		console.log('ClawMachine: playAction: started', clip, 'durationMs', durationMs, 'tickets', state.ticketValue)
	}


	// MARK: startBlendToIdle
	/**
	 * Holds the finished action pose and crossfades weight into looping idle.
	 */
	function startBlendToIdle(state: MachineState): void {
		const clip = state.activeAction
		if (!clip) {
			returnToIdle(state)
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
			returnToIdle(state)
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

		returnToIdle(state)
	}


	// MARK: wrapUnit
	function wrapUnit(value: number): number {
		return ((value % 1) + 1) % 1
	}


	// MARK: sys_scrollNeonGradient
	/** Advances each neon target's UV offset and writes it onto the node modifiers. */
	function sys_scrollNeonGradient(dt: number): void {
		for (const target of neonTargets) {
			target.offsetX = wrapUnit(target.offsetX + NEON_UV_SCROLL_SPEED * dt)

			const modifiers = GltfNodeModifiers.getMutableOrNull(target.entity)
			if (!modifiers) continue

			for (const modifier of modifiers.modifiers) {
				const material = modifier.material?.material
				if (material?.$case !== 'pbr') continue

				const albedo   = material.pbr.texture
				const emissive = material.pbr.emissiveTexture
				if (albedo?.tex?.$case === 'texture') {
					albedo.tex.texture.offset = Vector2.create(target.offsetX, 0)
				}
				if (emissive?.tex?.$case === 'texture') {
					emissive.tex.texture.offset = Vector2.create(target.offsetX, 0)
				}
			}
		}
	}


	// MARK: sys_update
	/**
	 * Ends actions on their known clip length, then drives the weight blend back to idle.
	 */
	function sys_update(dt: number): void {
		for (const state of machines) {
			if (state.phase === 'action') {
				if (!state.activeAction) {
					returnToIdle(state)
					continue
				}
				if (Date.now() < state.actionEndsAtMs) continue
				startBlendToIdle(state)
				continue
			}

			if (state.phase !== 'blend') continue

			const clip = state.activeAction
			if (!clip) {
				returnToIdle(state)
				continue
			}

			state.blendElapsed += dt
			const t = Math.min(1, state.blendElapsed / BLEND_DURATION)

			const animator = Animator.getMutableOrNull(state.body)
			if (!animator) {
				returnToIdle(state)
				continue
			}

			const idle   = animator.states.find((s) => s.clip === IDLE_CLIP)
			const action = animator.states.find((s) => s.clip === clip)
			if (action) {
				action.playing = true
				action.loop    = false
				action.speed   = 0
				action.weight  = 1 - t
			}
			if (idle) {
				idle.playing = true
				idle.loop    = true
				idle.speed   = 1
				idle.weight  = t
			}

			if (t >= 1) finishBlend(state)
		}
	}
}
