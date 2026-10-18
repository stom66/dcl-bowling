import { engine, Entity, LightSource, Material, MeshRenderer, Transform, Tween } from '@dcl/sdk/ecs'
import { Color3, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getPlatform, isMobile } from '@dcl/sdk/platform'

import { getRootPosition } from 'src/client/data/lanePositions'


const SHOW_LIGHT_MESH = true

/** Cubemap gobo (4×3 atlas) wrapped around point lights. */
const LOBBY_SHADOW_MASK = 'assets/images/spotlights/shadowmask-lobby.png'
const LANE_SHADOW_MASK  = 'assets/images/spotlights/shadowmask-lobby.png'

/** Candela for the two lights above the pin deck on desktop. */
const BACK_LIGHT_INTENSITY = 500000

/**
 * Mobile renders the same candela much brighter than desktop.
 * `isMobile()` stays false while `getPlatform()` is still null, including
 * during scene init, so this scale is applied only after the platform arrives.
 */
const MOBILE_BACK_LIGHT_SCALE = 0.1

const SPOTLIGHT_COLOR = Color3.fromHexString('#FFF29D')

/** Downward beam used when a spotlight does not pass its own rotation. */
const DEFAULT_SPOT_ROTATION = Quaternion.fromEulerDegrees(90, 0, 0)

/** Default continuous spin axis (world Y). */
const DEFAULT_ROTATE_AXIS = Quaternion.fromEulerDegrees(0, 1, 0)


type GafferLightConfig = {
	parent?            : Entity
	position           : Vector3
	rotation?          : Quaternion
	color?             : Color3
	intensity?         : number
	range?             : number
	innerAngle?        : number
	outerAngle?        : number
	shadowMaskTexture? : string
	type?              : 'point' | 'spot'
	/** Degrees per second. Omit or 0 to leave the light still. */
	rotateSpeed?       : number
	/** Spin axis as a unit Euler direction quaternion. Defaults to +Y. */
	rotateAxis?        : Quaternion
}


export namespace LightingGaffer {

	let isInitialized = false


	// MARK: init
	/**
	 * Spawns the alley lighting rig: lobby and pin-deck point lights with
	 * cubemap gobos, plus hall-of-fame and arcade spotlights.
	 * Pin-deck intensity is lowered on mobile once the explorer reports its platform.
	 */
	export function init(): void {
		if (isInitialized) return
		isInitialized = true

		const rootEntity = engine.addEntity()
		Transform.create(rootEntity, { position: getRootPosition() })

		const lobbyLight = spawnLight({
			parent           : rootEntity,
			position         : Vector3.create(0, 12, 0),
			intensity        : 500000,
			shadowMaskTexture: LOBBY_SHADOW_MASK,
			type             : 'point',
			rotateSpeed      : 8,
		})

		const pinDeckLeft = spawnLight({
			parent           : rootEntity,
			position         : Vector3.create(-12, 12, 50),
			intensity        : BACK_LIGHT_INTENSITY,
			shadowMaskTexture: LANE_SHADOW_MASK,
			type             : 'point',
			rotateSpeed      : 12,
		})

		const pinDeckRight = spawnLight({
			parent           : rootEntity,
			position         : Vector3.create(12, 12, 50),
			intensity        : BACK_LIGHT_INTENSITY,
			shadowMaskTexture: LANE_SHADOW_MASK,
			type             : 'point',
			rotateSpeed      : -12,
		})

		// Hall of fame boards are placed in world space, same as this spotlight.
		spawnLight({
			position         : Vector3.create(-14, 135, 12),
			shadowMaskTexture: LOBBY_SHADOW_MASK,
			intensity        : 250000,
		})

		// Arcade cabinets are placed in world space, same as this spotlight.
		spawnLight({
			position: Vector3.create(22, 138, 23),
		})

		applyMobileIntensityWhenReady([pinDeckLeft, pinDeckRight])
		console.log('LightingGaffer: init: lobby, pin-deck, hall-of-fame, and arcade lights ready')
	}


	// MARK: spawnLight
	/**
	 * Creates a light and returns its entity.
	 * Defaults to a downward spotlight. Pass `type: 'point'` for an omnidirectional light.
	 * `position` is local to `parent` when a parent is set, and world space otherwise.
	 * When `rotateSpeed` is non-zero, applies {@link Tween.setRotateContinuous}.
	 */
	function spawnLight({
		parent,
		position,
		rotation,
		color             = SPOTLIGHT_COLOR,
		intensity         = 250000,
		range             = 128,
		innerAngle        = 110,
		outerAngle        = 140,
		shadowMaskTexture,
		type              = 'spot',
		rotateSpeed       = 0,
		rotateAxis        = DEFAULT_ROTATE_AXIS,
	}: GafferLightConfig): Entity {
		const entity = engine.addEntity()
		Transform.create(entity, {
			parent  : parent,
			position: position,
			rotation: rotation ?? (type === 'spot' ? DEFAULT_SPOT_ROTATION : Quaternion.Identity()),
		})

		const lightType = type === 'point'
			? LightSource.Type.Point({})
			: LightSource.Type.Spot({
				innerAngle: innerAngle,
				outerAngle: outerAngle,
			})

		LightSource.create(entity, {
			active            : true,
			color             : color,
			intensity         : intensity,
			range             : range,
			shadowMaskTexture : shadowMaskTexture
				? Material.Texture.Common({ src: shadowMaskTexture })
				: undefined,
			type              : lightType,
		})
		if (SHOW_LIGHT_MESH) MeshRenderer.setSphere(entity)

		if (rotateSpeed !== 0) {
			Tween.setRotateContinuous(entity, rotateAxis, rotateSpeed)
		}

		return entity
	}


	// MARK: applyMobileIntensityWhenReady
	/**
	 * Applies {@link MOBILE_BACK_LIGHT_SCALE} once `getPlatform()` is non-null.
	 * A null platform is not desktop; `isMobile()` is false until the explorer reports in.
	 */
	function applyMobileIntensityWhenReady(lights: Entity[]): void {
		if (getPlatform() !== null) {
			applyMobileIntensity(lights)
			return
		}

		function sys_applyMobileLightIntensity(): void {
			if (getPlatform() === null) return
			engine.removeSystem(sys_applyMobileLightIntensity)
			applyMobileIntensity(lights)
		}

		engine.addSystem(sys_applyMobileLightIntensity)
	}


	// MARK: applyMobileIntensity
	/**
	 * Sets pin-deck light intensity to the mobile scale. No-op on desktop and web.
	 */
	function applyMobileIntensity(lights: Entity[]): void {
		if (!isMobile()) return

		const intensity = BACK_LIGHT_INTENSITY * MOBILE_BACK_LIGHT_SCALE
		for (const light of lights) {
			const source = LightSource.getMutableOrNull(light)
			if (!source) continue
			source.intensity = intensity
		}
		console.log('LightingGaffer: applyMobileIntensity: set back-alley intensity to', intensity)
	}
}
