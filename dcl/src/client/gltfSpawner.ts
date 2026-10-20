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
	let neonOffsetX = 0


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
		engine.addSystem(sys_scrollNeonGradient)
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
	/** Advances {@link neonOffsetX} and writes a new Vector2 onto each texture offset. */
	function sys_scrollNeonGradient(dt: number): void {
		if (neonEntity === undefined) return

		neonOffsetX = wrapUnit(neonOffsetX + NEON_UV_SCROLL_SPEED * dt)

		const modifiers = GltfNodeModifiers.getMutableOrNull(neonEntity)
		if (!modifiers) return

		for (const modifier of modifiers.modifiers) {
			const material = modifier.material?.material
			if (material?.$case !== 'pbr') continue

			const albedo   = material.pbr.texture
			const emissive = material.pbr.emissiveTexture
			if (albedo?.tex?.$case === 'texture') {
				albedo.tex.texture.offset = Vector2.create(neonOffsetX, 0)
			}
			if (emissive?.tex?.$case === 'texture') {
				emissive.tex.texture.offset = Vector2.create(neonOffsetX, 0)
			}
		}
	}


	// MARK: wrapUnit
	function wrapUnit(value: number): number {
		return ((value % 1) + 1) % 1
	}
}
