import * as utils from '@dcl-sdk/utils'
import { AssetLoad, engine, Entity, ParticleSystem, PBParticleSystem, PBParticleSystem_BlendMode, PBParticleSystem_PlaybackState, PBParticleSystem_SimulationSpace, Transform } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import { getPlayer } from '@dcl/sdk/players'

import { ComponentManager } from 'src/shared/components/componentManager'
import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerUnlocks } from 'src/shared/components/definitions/shared.playerUnlocks'
import { PLAYERS_GROUP_ID } from 'src/shared/components/registry'
import { trails } from 'src/shared/data/unlocks'
import { userProfileCache } from 'src/shared/utils/userProfileCache'


export const ParticleEffect = {
	UNLOCK : 'unlock',
} as const

export type ParticleEffectName = typeof ParticleEffect[keyof typeof ParticleEffect]


/**
 * Placement for {@link ParticleSpawner.spawn}. `position` and `rotation` are
 * local when `parent` is set, and world-space otherwise.
 */
export type ParticleSpawnOptions = {
	position?      : Vector3
	rotation?      : Quaternion
	parent?        : Entity
	/** Deletes the emitter entity after this many milliseconds. */
	removeAfterMs? : number
}


const MOBILE_PARTICLE_RATIO = 0.5
const UNLOCK_BASELINE_MS    = 2000
const UNLOCK_EMIT_MS        = 800
const UNLOCK_LIFETIME       = 1.35
const UNLOCK_REMOVE_MS      = UNLOCK_EMIT_MS + UNLOCK_LIFETIME * 1000 + 200

export const PARTILCE_TEXTURES = {
	SPARKLES: 'assets/images/unlocks/trails/sprites-sparkles.png',
	DUST: 'assets/images/unlocks/trails/sprites-dust.png',	
} as const;	

export type ParticleTextureName = typeof PARTILCE_TEXTURES[keyof typeof PARTILCE_TEXTURES]

/** Chest height, slightly in front of the avatar so the fountain clears the body. */
const UNLOCK_PLAYER_OFFSET = Vector3.create(0, 1, 0.2)
/** Cone emitters shoot along local forward. This aims that axis up. */
const UNLOCK_AIM_UP        = Quaternion.fromEulerDegrees(-90, 0, 0)

const UNLOCK_COLORS = [
	Color4.create(1.00, 0.22, 0.28, 1),
	Color4.create(1.00, 0.55, 0.10, 1),
	Color4.create(1.00, 0.88, 0.20, 1),
	Color4.create(0.25, 1.00, 0.45, 1),
	Color4.create(0.25, 0.70, 1.00, 1),
	Color4.create(0.72, 0.35, 1.00, 1),
]


export namespace ParticleSpawner {

	type UnlockBaseline = {
		known   : Set<string>
		ready   : boolean
		started : boolean
	}

	let isInitialized      = false
	const watchedUserIds   = new Set<string>()
	const unlockBaselines  = new Map<string, UnlockBaseline>()


	// MARK: init
	/**
	 * Preloads particle textures and watches every player's unlock list.
	 * Safe to call once; later calls are ignored.
	 */
	export function init(): void {
		if (isInitialized) return
		isInitialized = true

		console.log('ParticleSpawner: init')
		preloadAssets()
		watchUnlocks()
	}


	// MARK: spawn
	/**
	 * Creates an emitter and starts `config` on it.
	 * `rate`, `maxParticles`, and burst counts are scaled by the mobile particle ratio.
	 * Pass `parent` to attach the emitter. `position` and `rotation` are then local to that parent.
	 * Returns undefined when the particle ratio is zero.
	 */
	export function spawn(
		config   : PBParticleSystem,
		options? : ParticleSpawnOptions,
	): Entity | undefined {
		const ratio = getParticleRatio()
		if (ratio <= 0) return undefined

		const entity = engine.addEntity()
		Transform.create(entity, {
			parent   : options?.parent,
			position : options?.position ?? Vector3.Zero(),
			rotation : options?.rotation ?? Quaternion.Identity(),
		})
		ParticleSystem.create(entity, scaleConfig(config, ratio))

		const removeAfterMs = options?.removeAfterMs
		if (removeAfterMs !== undefined) {
			utils.timers.setTimeout(() => {
				removeEmitter(entity)
			}, removeAfterMs)
		}

		return entity
	}


	// MARK: trigger
	/**
	 * Plays a named effect.
	 * `unlock` parents an upward fountain to the local player unless `parent` or `position` is passed.
	 * A purchase parents it to the player who unlocked the item.
	 */
	export function trigger(
		effect    : ParticleEffectName,
		position? : Vector3,
		parent?   : Entity,
	): void {
		switch (effect) {
			case ParticleEffect.UNLOCK:
				triggerUnlock(position, parent)
				break
		}
	}


	// MARK: stop
	/**
	 * Stops new emission. Particles already alive finish their lifetime.
	 */
	export function stop(
		entity : Entity | undefined,
	): void {
		if (entity === undefined) return
		const ps = ParticleSystem.getMutableOrNull(entity)
		if (!ps) return
		ps.active = false
	}


	// MARK: preloadAssets
	function preloadAssets(): void {
		const entity = engine.addEntity()
		const trailTextures = Object.values(trails)
			.map((trail) => {
				const emitter = trail.emitter as { texture?: { src?: string } } | undefined
				return emitter?.texture?.src
			})
			.filter((src): src is string => typeof src === 'string')

		AssetLoad.create(entity, {
			assets: [...new Set([
				...Object.values(PARTILCE_TEXTURES),
				...trailTextures,
			])],
		})
	}


	// MARK: getParticleRatio
	function getParticleRatio(): number {
		return isMobile() ? MOBILE_PARTICLE_RATIO : 1
	}


	// MARK: scaleCount
	function scaleCount(
		count : number,
		ratio : number,
	): number {
		if (count <= 0) return 0
		return Math.max(1, Math.round(count * ratio))
	}


	// MARK: scaleConfig
	/**
	 * Copies `config` with emission counts scaled. Authoring values stay unchanged.
	 */
	function scaleConfig(
		config : PBParticleSystem,
		ratio  : number,
	): PBParticleSystem {
		const scaled: PBParticleSystem = { ...config }

		if (typeof config.rate === 'number') {
			scaled.rate = scaleCount(config.rate, ratio)
		}
		if (typeof config.maxParticles === 'number') {
			scaled.maxParticles = scaleCount(config.maxParticles, ratio)
		}
		if (config.bursts) {
			scaled.bursts = {
				values: config.bursts.values.map((burst) => ({
					...burst,
					count: scaleCount(burst.count, ratio),
				})),
			}
		}

		return scaled
	}


	// MARK: watchUnlocks
	/**
	 * Subscribes once per player. The first snapshots are a baseline so items
	 * they already own do not play the fountain when they enter.
	 */
	function watchUnlocks(): void {
		ComponentManager.onKeyedEntity(PLAYERS_GROUP_ID, (_entity, userId) => {
			if (watchedUserIds.has(userId)) return
			watchedUserIds.add(userId)

			ComponentStore.onChange(PlayerUnlocks, (data) => {
				onUnlocksChanged(userId, data?.unlockedItemIds ?? [])
			}, { key: userId })
		})
	}


	// MARK: onUnlocksChanged
	/**
	 * Plays the unlock fountain when new item ids appear after that player's
	 * baseline window. A reset that only removes ids does not play it.
	 */
	function onUnlocksChanged(
		userId          : string,
		unlockedItemIds : readonly string[],
	): void {
		let baseline = unlockBaselines.get(userId)
		if (!baseline) {
			baseline = {
				known   : new Set<string>(),
				ready   : false,
				started : false,
			}
			unlockBaselines.set(userId, baseline)
		}

		if (!baseline.ready) {
			baseline.known = new Set(unlockedItemIds)
			if (!baseline.started) {
				baseline.started = true
				const pending = baseline
				utils.timers.setTimeout(() => {
					pending.ready = true
					console.log('ParticleSpawner: onUnlocksChanged: baseline ready', userId, 'count', pending.known.size)
				}, UNLOCK_BASELINE_MS)
			}
			return
		}

		const added: string[] = []
		for (const itemId of unlockedItemIds) {
			if (!baseline.known.has(itemId)) added.push(itemId)
		}

		baseline.known = new Set(unlockedItemIds)
		if (added.length === 0) return

		console.log('ParticleSpawner: onUnlocksChanged: unlocked', userId, added.join(', '))
		playUnlockForPlayer(userId)
	}


	// MARK: playUnlockForPlayer
	/**
	 * Parents the fountain to the unlocking player's avatar.
	 */
	function playUnlockForPlayer(
		userId : string,
	): void {
		const player = getPlayer({ userId })
		if (player) {
			triggerUnlock(undefined, player.entity)
			return
		}

		if (userProfileCache.isLocalUser(userId)) {
			triggerUnlock()
			return
		}

		console.log('ParticleSpawner: playUnlockForPlayer: player not in scene', userId)
	}


	// MARK: triggerUnlock
	/**
	 * Brief upward fountain. Several tinted sparkle emitters share one aimed root
	 * so the colors erupt together and clean up together.
	 */
	function triggerUnlock(
		position? : Vector3,
		parent?   : Entity,
	): void {
		const ratio = getParticleRatio()
		if (ratio <= 0) return

		const rootParent   = parent ?? (position === undefined ? engine.PlayerEntity : undefined)
		const rootPosition = position ?? (rootParent !== undefined ? UNLOCK_PLAYER_OFFSET : Vector3.Zero())

		const root = engine.addEntity()
		Transform.create(root, {
			parent   : rootParent,
			position : rootPosition,
			rotation : UNLOCK_AIM_UP,
		})

		const emitters: Entity[] = []
		for (const color of UNLOCK_COLORS) {
			const emitter = spawn(unlockConfig(color), { parent: root })
			if (emitter !== undefined) emitters.push(emitter)
		}

		console.log('ParticleSpawner: triggerUnlock: emitters', emitters.length)

		utils.timers.setTimeout(() => {
			for (const emitter of emitters) stop(emitter)
		}, UNLOCK_EMIT_MS)

		utils.timers.setTimeout(() => {
			for (const emitter of emitters) removeEmitter(emitter)
			engine.removeEntity(root)
		}, UNLOCK_REMOVE_MS)
	}


	// MARK: unlockConfig
	function unlockConfig(
		color : Color4,
	): PBParticleSystem {
		return {
			active               : true,
			loop                 : true,
			rate                 : 22,
			lifetime             : UNLOCK_LIFETIME,
			maxParticles         : 40,
			gravity              : 2.2,
			blendMode            : PBParticleSystem_BlendMode.PSB_ADD,
			shape                : ParticleSystem.Shape.Cone({ angle: 18, radius: 0.15 }),
			initialVelocitySpeed : { start: 3.5, end: 6.5 },
			initialSize          : { start: 0.08, end: 0.18 },
			sizeOverTime         : { start: 1, end: 0.15 },
			initialColor         : { start: color, end: color },
			colorOverTime        : {
				start : Color4.create(color.r, color.g, color.b, 1),
				end   : Color4.create(color.r, color.g, color.b, 0),
			},
			billboard            : true,
			faceTravelDirection  : false,
			simulationSpace      : PBParticleSystem_SimulationSpace.PSS_WORLD,
			texture              : { src: PARTILCE_TEXTURES.SPARKLES },
			spriteSheet          : { tilesX: 6, tilesY: 6, framesPerSecond: 24 },
			playbackState        : PBParticleSystem_PlaybackState.PS_PLAYING,
		}
	}


	// MARK: removeEmitter
	function removeEmitter(
		entity : Entity,
	): void {
		ParticleSystem.deleteFrom(entity)
		engine.removeEntity(entity)
	}
}
