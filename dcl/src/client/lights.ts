import { engine, LightSource, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs"
import { Color3, Quaternion, Vector3 } from "@dcl/sdk/math"


export function setupLights() {
// Add a light above the front desk
/* 	const light1 = engine.addEntity()
	Transform.create(light1, { position: Vector3.create(16, 7, 12) })
	LightSource.create(light1, {
		type: LightSource.Type.Point({}),
		color: Color3.White(),
		intensity: 300000
	})
	MeshRenderer.setSphere(light1) */

	// Add a light at the back of the bowling alley
	const light2 = engine.addEntity()
	Transform.create(light2, { position: Vector3.create(8, 5, 32) })
	LightSource.create(light2, {
		type: LightSource.Type.Point({}),
		color: Color3.White(),
		intensity: 300000
	})
	MeshRenderer.setSphere(light2)

	// Add a light at the back of the bowling alley
	const light3 = engine.addEntity()
	Transform.create(light3, { position: Vector3.create(24, 5, 32) })
	LightSource.create(light3, {
		type: LightSource.Type.Point({}),
		color: Color3.White(),
		intensity: 300000
	})
	MeshRenderer.setSphere(light3)


	// Add a light at the back of the bowling alley
	const testLight = engine.addEntity()
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
	MeshRenderer.setSphere(testLight)
}
