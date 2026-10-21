import { Animator, ColliderLayer, engine, Entity, GltfContainer, GltfContainerLoadingState, GltfNodeModifiers, LoadingState, Material, TextureWrapMode, Transform } from '@dcl/sdk/ecs'
import { Color3, Quaternion, Vector2 } from '@dcl/sdk/math'

import { whenGltfContainerFinished } from 'src/client/gltfLoading'


const SCENE_MODEL_SRC       = 'assets/models/scene-new.gltf'
const NEONS_MODEL_SRC       = 'assets/models/neons-animated.gltf'
const NEON_GRADIENT_TEXTURE = 'assets/models/tex/neon-gradient.png'

/** Clip on {@link SCENE_MODEL_SRC} that should loop by default. */
const SCENE_ANIMATION_CLIP = 'ArmatureAction'

/** UV units per second. Positive values slide neon-gradient sideways along X. */
const NEON_UV_SCROLL_SPEED = 0.1


export namespace GltfSpawner {

	/** True once the scene GLTF has finished loading. */
	export let isLoaded = false

	let hasSpawned  = false
	let sceneEntity : Entity | undefined
	let neonEntity  : Entity | undefined
	/** Shared by every neon albedo/emissive override. Mutated in place so the scroll does not allocate. */
	let neonOffset  : { x: number, y: number } | undefined


	// MARK: init
	/**
	 * Spawns the scene GLTF and the neon-only GLTF, then scrolls the neon mesh
	 * via {@link GltfNodeModifiers}. Sets {@link isLoaded} once the scene model
	 * reaches a terminal load state.
	 */
	export function init(): void {
		if (hasSpawned) return
		hasSpawned = true

		const entity = engine.addEntity()
		sceneEntity  = entity
		Transform.create(entity, {
			rotation: Quaternion.fromEulerDegrees(0, 180, 0),
		})
		GltfContainer.create(entity, {
			src: SCENE_MODEL_SRC,
		})
		Animator.create(entity, {
			states: [{
				clip   : SCENE_ANIMATION_CLIP,
				playing: true,
				loop   : true,
			}],
		})

		whenGltfContainerFinished(entity, () => {
			noteLoadState(GltfContainerLoadingState.getOrNull(entity)?.currentState)
		}, [
			LoadingState.FINISHED,
			LoadingState.FINISHED_WITH_ERROR,
			LoadingState.NOT_FOUND,
		])

		spawnNeonMarquee(entity)
	}


	// MARK: getSceneEntity
	/**
	 * Scene GLTF root. In-world overlays parent here so they inherit the model's Y=180.
	 */
	export function getSceneEntity(): Entity | undefined {
		return sceneEntity
	}


	// MARK: spawnNeonMarquee
	/**
	 * Applies the scrolling material to the whole neon-only model, avoiding
	 * root-node path lookup.
	 */
	function spawnNeonMarquee(parent: Entity): void {
		const entity = engine.addEntity()
		neonEntity   = entity
		Transform.create(entity, { parent })
		GltfContainer.create(entity, {
			src                         : NEONS_MODEL_SRC,
			visibleMeshesCollisionMask  : ColliderLayer.CL_NONE,
			invisibleMeshesCollisionMask: ColliderLayer.CL_NONE,
		})
		GltfNodeModifiers.create(entity, {
			modifiers: [{
				path    : '',
				material: neonGradientMaterial(0),
			}],
		})
		neonOffset = shareNeonOffset(entity)
		if (!neonOffset) {
			console.error('GltfSpawner: spawnNeonMarquee: failed to share neon offset')
			return
		}
		engine.addSystem(sys_scrollNeonGradient)
	}


	// MARK: shareNeonOffset
	/**
	 * Points every neon albedo and emissive texture at one offset object.
	 */
	function shareNeonOffset(entity: Entity): { x: number, y: number } | undefined {
		const modifiers = GltfNodeModifiers.getMutableOrNull(entity)
		if (!modifiers) return undefined

		let shared: { x: number, y: number } | undefined
		for (const modifier of modifiers.modifiers) {
			const material = modifier.material?.material
			if (material?.$case !== 'pbr') continue

			const albedo   = material.pbr.texture
			const emissive = material.pbr.emissiveTexture
			if (albedo?.tex?.$case !== 'texture' || !albedo.tex.texture.offset) continue

			if (!shared) shared = albedo.tex.texture.offset
			else albedo.tex.texture.offset = shared

			if (emissive?.tex?.$case === 'texture') {
				emissive.tex.texture.offset = shared
			}
		}
		return shared
	}


	// MARK: noteLoadState
	function noteLoadState(state: LoadingState | undefined): void {
		if (isLoaded) return
		if (state !== LoadingState.FINISHED && state !== LoadingState.FINISHED_WITH_ERROR) return

		if (state === LoadingState.FINISHED_WITH_ERROR) {
			console.error('GltfSpawner: noteLoadState: model failed to load', SCENE_MODEL_SRC)
		}

		isLoaded = true
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


	// MARK: sys_scrollNeonGradient
	/**
	 * Advances the shared UV offset. `getMutableOrNull` marks the override dirty
	 * so the renderer sees that one number; the offset object itself is not replaced.
	 */
	function sys_scrollNeonGradient(dt: number): void {
		if (neonOffset === undefined || neonEntity === undefined) return
		if (!GltfNodeModifiers.getMutableOrNull(neonEntity)) return

		neonOffset.x = wrapUnit(neonOffset.x + NEON_UV_SCROLL_SPEED * dt)
	}


	// MARK: wrapUnit
	function wrapUnit(value: number): number {
		return ((value % 1) + 1) % 1
	}
}
