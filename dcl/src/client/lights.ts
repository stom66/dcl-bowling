import { engine, Entity, LightSource, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs"
import { Color3, Quaternion, Vector3 } from "@dcl/sdk/math"
import { getPlatform, isMobile } from "@dcl/sdk/platform"

import { getRootPosition } from "src/client/data/lanePositions"
import { GameSettings } from "src/server/physics/physics.settings"


const SHOW_LIGHT_MESH = false

const LOBBY_SHADOW_MASK = 'assets/images/spotlights/shadowmask-lobby.png'
const LANE_SHADOW_MASK  = 'assets/images/spotlights/shadowmask-lobby.png'

/** Candela for the two lights above the pin deck on desktop. */
const BACK_LIGHT_INTENSITY = 125000

/**
 * Mobile renders the same candela much brighter than desktop.
 * `isMobile()` stays false while `getPlatform()` is still null, including
 * during scene init, so this scale is applied only after the platform arrives.
 */
const MOBILE_BACK_LIGHT_SCALE = 0.1


// MARK: setupLights
/**
 * Adds the lobby point light and the two pin-deck lights.
 * Pin-deck intensity is lowered on mobile once the explorer reports its platform.
 */
export function setupLights() {
	const rootEntity = engine.addEntity()
	Transform.create(rootEntity, { position: getRootPosition() })

	// Add a light above the front desk
	const light1 = engine.addEntity()
	Transform.create(light1, {
		parent  : rootEntity,
		position: Vector3.create(0, 12, 0)
	})
	LightSource.create(light1, {
		active            : true,
		color             : Color3.White(),
		intensity         : 500000,
		range             : 128,
		shadowMaskTexture : Material.Texture.Common({ src: LOBBY_SHADOW_MASK }),
		type              : LightSource.Type.Point({}),
	})
	if (SHOW_LIGHT_MESH) MeshRenderer.setSphere(light1)

	// Add a light at the back of the bowling alley
	const light2 = engine.addEntity()
	Transform.create(light2, {
		parent  : rootEntity,
		position: Vector3.create(-12, 20, 46)
	})
	LightSource.create(light2, {
		active            : true,
		color             : Color3.White(),
		intensity         : BACK_LIGHT_INTENSITY,
		range             : 128,
		shadowMaskTexture : Material.Texture.Common({ src: LANE_SHADOW_MASK }),
		type              : LightSource.Type.Point({}),
	})
	if (SHOW_LIGHT_MESH) MeshRenderer.setSphere(light2)

	// Add a light at the back of the bowling alley
	const light3 = engine.addEntity()
	Transform.create(light3, {
		parent  : rootEntity,
		position: Vector3.create(12, 20, 46)
	})
	LightSource.create(light3, {
		active            : true,
		color             : Color3.White(),
		intensity         : BACK_LIGHT_INTENSITY,
		range             : 128,
		shadowMaskTexture : Material.Texture.Common({ src: LANE_SHADOW_MASK }),
		type              : LightSource.Type.Point({}),
	})
	if (SHOW_LIGHT_MESH) MeshRenderer.setSphere(light3)


	const hallOfFame = engine.addEntity()
	Transform.create(hallOfFame, {
		position            : Vector3.create(-14, 135, 12),
		rotation            : Quaternion.fromEulerDegrees(90, 0, 0)
	 })
	LightSource.create(hallOfFame, {
		type                : LightSource.Type.Spot({
			innerAngle         : 110,
			outerAngle         : 140,
		}),
		color               : Color3.fromHexString('#FFF29D'),
		intensity           : 150000
	})
	if (SHOW_LIGHT_MESH) MeshRenderer.setSphere(hallOfFame)

	applyMobileIntensityWhenReady([light2, light3])

	// Add a light at the back of the bowling alley
/* 	const testLight = engine.addEntity()
	Transform.create(testLight, {
		position: Vector3.create(16, 5, 9),
		rotation: Quaternion.fromEulerDegrees(90, 0, 0)
	 })
	LightSource.create(testLight, {
		type: LightSource.Type.Spot({
			innerAngle: 10,
			outerAngle: 20,
		}),
		color: Color3.White(),
		intensity: 5000000,
		// use one of the unlocked spotlight masks
		shadowMaskTexture: Material.Texture.Common({
			src: 'assets/images/unlocks/spotlights/spotlight-arrowBurst.png'
		})
	})
	MeshRenderer.setSphere(testLight) */
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
