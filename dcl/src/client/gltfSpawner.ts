import { ColliderLayer, engine, Entity, GltfContainer, GltfContainerLoadingState, GltfNodeModifiers, LoadingState, Material, TextureWrapMode, Transform } from '@dcl/sdk/ecs'
import { Color3, Quaternion, Vector2 } from '@dcl/sdk/math'


const SCENE_MODEL_SRC       = 'assets/models/scene-new.gltf'
const NEON_GRADIENT_TEXTURE = 'assets/models/tex/neon-gradient.png'

/** UV units per second. Positive values slide neon-gradient sideways along X. */
const NEON_UV_SCROLL_SPEED = 0.1

/** Mesh nodes whose faces use only the neon-gradient material. */
const NEON_GRADIENT_NODE_PATHS = [
	'NurbsPath.001',
	'pins.root/neon.roofWires',
	'pins.root/neon.track.001',
	'pins.root/neon.track.002',
	'pins.root/neon.track.003',
	'pins.root/neon.track.004',
	'pins.root/neon.track.005',
	'pins.root/neon.track.006',
	'pins.root/neon.track.007',
	'pins.root.002/neon.wallTrack.001',
]


export namespace GltfSpawner {

	/** True once the scene GLTF has finished loading. */
	export let isLoaded = false

	let hasSpawned  = false
	let sceneEntity : Entity | undefined
	let neonOffsetX = 0


	// MARK: init
	/**
	 * Spawns the scene GLTF, watches it until loading finishes, and starts the
	 * neon-gradient UV marquee on every neon-only mesh listed in
	 * {@link NEON_GRADIENT_NODE_PATHS}.
	 * Sets {@link isLoaded} once the model reaches a terminal load state.
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
			src                       : SCENE_MODEL_SRC,
			visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS,
		})
		GltfNodeModifiers.create(entity, {
			modifiers: NEON_GRADIENT_NODE_PATHS.map((path) => ({
				path,
				material: neonGradientMaterial(0),
			})),
		})

		GltfContainerLoadingState.onChange(entity, (loadingState) => {
			noteLoadState(loadingState?.currentState)
		})
		noteLoadState(GltfContainerLoadingState.getOrNull(entity)?.currentState)

		engine.addSystem(sys_scrollNeonGradient)
		console.log('GltfSpawner: init: scrolling', NEON_GRADIENT_NODE_PATHS.length, 'neon-gradient meshes')
	}


	// MARK: noteLoadState
	function noteLoadState(state: LoadingState | undefined): void {
		if (isLoaded) return
		if (state !== LoadingState.FINISHED && state !== LoadingState.FINISHED_WITH_ERROR) return

		if (state === LoadingState.FINISHED_WITH_ERROR) {
			console.error('GltfSpawner: noteLoadState: model failed to load', SCENE_MODEL_SRC)
		}

		isLoaded = true
		console.log('GltfSpawner: noteLoadState: model finished loading')
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
	function sys_scrollNeonGradient(dt: number): void {
		if (sceneEntity === undefined) return

		neonOffsetX = wrapUnit(neonOffsetX + NEON_UV_SCROLL_SPEED * dt)

		const modifiers = GltfNodeModifiers.getMutableOrNull(sceneEntity)
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
