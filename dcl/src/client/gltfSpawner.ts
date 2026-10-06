import { ColliderLayer, engine, Entity, executeTask, GltfContainer, GltfContainerLoadingState, GltfNodeModifiers, LoadingState, Material, TextureWrapMode, Transform } from '@dcl/sdk/ecs'
import { Color3, Quaternion, Vector2 } from '@dcl/sdk/math'
import { readFile } from '~system/Runtime'


const SCENE_MODEL_SRC       = 'assets/models/scene-new.gltf'
const NEON_GRADIENT_TEXTURE = 'assets/models/tex/neon-gradient.png'

/** UV units per second. Positive values slide neon-gradient sideways along X. */
const NEON_UV_SCROLL_SPEED = 0.1

/**
 * Patterns matched against full mesh node paths (parent names joined with "/")
 * in the scene GLTF. Matching meshes use only the neon-gradient material.
 */
const NEON_GRADIENT_NODE_PATTERNS: RegExp[] = [
	/(^|\/)neon-gradient\.\d+$/,
]

type GltfJsonNode = { name?: string, mesh?: number, children?: number[] }


export namespace GltfSpawner {

	/** True once the scene GLTF has finished loading. */
	export let isLoaded = false

	let hasSpawned  = false
	let sceneEntity : Entity | undefined
	/** Shared by every neon-gradient override. Mutated in place so the scroll does not allocate. */
	let neonOffset  : { x: number, y: number } | undefined


	// MARK: init
	/**
	 * Spawns the scene GLTF, watches it until loading finishes, and starts the
	 * neon-gradient UV marquee on every mesh matching
	 * {@link NEON_GRADIENT_NODE_PATTERNS}.
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
			src: SCENE_MODEL_SRC,
		})

		GltfContainerLoadingState.onChange(entity, (loadingState) => {
			noteLoadState(loadingState?.currentState)
		})
		noteLoadState(GltfContainerLoadingState.getOrNull(entity)?.currentState)

		executeTask(async () => {
			const paths = await resolveNodePaths(NEON_GRADIENT_NODE_PATTERNS)
			if (paths.length === 0) {
				console.error('GltfSpawner: init: no neon-gradient meshes matched in', SCENE_MODEL_SRC)
				return
			}

			GltfNodeModifiers.createOrReplace(entity, {
				modifiers: paths.map((path) => ({
					path,
					material: neonGradientMaterial(0),
				})),
			})
			neonOffset = shareNeonOffset(entity)
			engine.addSystem(sys_scrollNeonGradient)
			console.log('GltfSpawner: init: scrolling', paths.length, 'neon-gradient meshes')
		})
	}


	// MARK: getSceneEntity
	/**
	 * Scene GLTF root. In-world overlays parent here so they inherit the model's Y=180.
	 */
	export function getSceneEntity(): Entity | undefined {
		return sceneEntity
	}


	// MARK: resolveNodePaths
	/**
	 * Reads the scene GLTF JSON and returns the full path of every mesh node
	 * whose path matches at least one of the given patterns.
	 */
	async function resolveNodePaths(patterns: RegExp[]): Promise<string[]> {
		try {
			const file  = await readFile({ fileName: SCENE_MODEL_SRC })
			const gltf  = JSON.parse(bytesToString(file.content)) as { nodes?: GltfJsonNode[] }
			const nodes = gltf.nodes ?? []

			const parentOf = new Map<number, number>()
			nodes.forEach((node, index) => {
				for (const child of node.children ?? []) parentOf.set(child, index)
			})

			const pathOf = (index: number): string => {
				const name   = nodes[index].name ?? ''
				const parent = parentOf.get(index)
				return parent === undefined ? name : `${pathOf(parent)}/${name}`
			}

			const paths: string[] = []
			nodes.forEach((node, index) => {
				if (node.mesh === undefined) return
				const path = pathOf(index)
				if (patterns.some((pattern) => pattern.test(path))) paths.push(path)
			})
			return paths
		} catch (error) {
			console.error('GltfSpawner: resolveNodePaths: failed to read', SCENE_MODEL_SRC, error)
			return []
		}
	}


	// MARK: bytesToString
	function bytesToString(bytes: Uint8Array): string {
		const chunkSize = 0x8000
		let result      = ''
		for (let i = 0; i < bytes.length; i += chunkSize) {
			result += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
		}
		return result
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


	// MARK: sys_scrollNeonGradient
	/**
	 * Advances the shared UV offset. `getMutableOrNull` marks the override dirty
	 * so the renderer sees that one number; the offset object itself is not replaced.
	 */
	function sys_scrollNeonGradient(dt: number): void {
		if (neonOffset === undefined || sceneEntity === undefined) return
		if (!GltfNodeModifiers.getMutableOrNull(sceneEntity)) return

		neonOffset.x = wrapUnit(neonOffset.x + NEON_UV_SCROLL_SPEED * dt)
	}


	// MARK: wrapUnit
	function wrapUnit(value: number): number {
		return ((value % 1) + 1) % 1
	}
}
