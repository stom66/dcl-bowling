import { engine, LightSource, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs"
import { Color3, Quaternion, Vector3 } from "@dcl/sdk/math"
import { getRootPosition } from "./data/lanePositions"


const SHOW_LIGHT_MESH = true

const LOBBY_SHADOW_MASK = 'assets/images/spotlights/ColorGrid.png'
const LANE_SHADOW_MASK  = 'assets/images/spotlights/ColorGrid.png'

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
		type              : LightSource.Type.Point({}),
		color             : Color3.White(),
		intensity         : 500000,
		shadowMaskTexture : Material.Texture.Common({ src: LOBBY_SHADOW_MASK }),
	})
	if (SHOW_LIGHT_MESH) MeshRenderer.setSphere(light1)

	// Add a light at the back of the bowling alley
	const light2 = engine.addEntity()
	Transform.create(light2, { 	
		parent  : rootEntity,
		position: Vector3.create(-12, 20, 46) 
	})
	LightSource.create(light2, {
		type              : LightSource.Type.Point({}),
		color             : Color3.White(),
		intensity         : 2500000,
		shadowMaskTexture : Material.Texture.Common({ src: LANE_SHADOW_MASK }),
	})
	if (SHOW_LIGHT_MESH) MeshRenderer.setSphere(light2)

	// Add a light at the back of the bowling alley
	const light3 = engine.addEntity()
	Transform.create(light3, { 
		parent  : rootEntity,
		position: Vector3.create(12, 20, 46)
	})
	LightSource.create(light3, {
		type              : LightSource.Type.Point({}),
		color             : Color3.White(),
		intensity         : 2500000,
		shadowMaskTexture : Material.Texture.Common({ src: LANE_SHADOW_MASK }),
	})
	if (SHOW_LIGHT_MESH) MeshRenderer.setSphere(light3)


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
