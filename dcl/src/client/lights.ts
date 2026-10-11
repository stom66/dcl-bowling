import { engine, Entity, LightSource, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs"
import { Color3, Quaternion, Vector3 } from "@dcl/sdk/math"
import { getPlatform, isMobile } from "@dcl/sdk/platform"

import { getRootPosition } from "src/client/data/lanePositions"


const SHOW_LIGHT_MESH = true

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


type SpawnLightConfig = {
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
}


// MARK: setupLights
/**
 * Adds the lobby point light, the two pin-deck lights, and the hall-of-fame spotlight.
 * Pin-deck intensity is lowered on mobile once the explorer reports its platform.
 */
export function setupLights() {
	const rootEntity = engine.addEntity()
	Transform.create(rootEntity, { position: getRootPosition() })

	const lobbyLight = spawnLight({
		parent           : rootEntity,
		position         : Vector3.create(0, 12, 0),
		intensity        : 500000,
		shadowMaskTexture: LOBBY_SHADOW_MASK,
		type             : 'point',
	})

	const pinDeckLeft = spawnLight({
		parent           : rootEntity,
		position         : Vector3.create(-12, 12, 50),
		intensity        : BACK_LIGHT_INTENSITY,
		shadowMaskTexture: LANE_SHADOW_MASK,
		type             : 'point',
	})

	const pinDeckRight = spawnLight({
		parent           : rootEntity,
		position         : Vector3.create(12, 12, 50),
		intensity        : BACK_LIGHT_INTENSITY,
		shadowMaskTexture: LANE_SHADOW_MASK,
		type             : 'point',
	})

	// Hall of fame boards are placed in world space, same as this spotlight.
	const hallOfFame = spawnLight({
		position: Vector3.create(-14, 135, 12),
		shadowMaskTexture: LOBBY_SHADOW_MASK,
		intensity: 250000,
	})

	// Hall of fame boards are placed in world space, same as this spotlight.
	const arcade = spawnLight({
		position: Vector3.create(22, 138, 23),
	})

	applyMobileIntensityWhenReady([pinDeckLeft, pinDeckRight])
}


// MARK: spawnLight
/**
 * Creates a light and returns its entity.
 * Defaults to a downward spotlight. Pass `type: 'point'` for an omnidirectional light.
 * `position` is local to `parent` when a parent is set, and world space otherwise.
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
}: SpawnLightConfig): Entity {
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
	console.log('Lights: applyMobileIntensity: set back-alley intensity to', intensity)
}
