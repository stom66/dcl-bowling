import { Quaternion, Vector3 } from '@dcl/sdk/math'
import {
	Body,
	Box,
	Cylinder,
	Material,
	Quaternion as CannonQuaternion,
	Sphere,
	Vec3,
	World
} from 'cannon-es'
import collidersData from './data/lane-colliders.json'
import pinColliderData from './data/pin-colliders.json'

export type CannonSimObjectState = {
	position: Vector3
	rotation: Quaternion
}

export type CannonSimAdvanceResult = {
	ball: CannonSimObjectState
	pins: CannonSimObjectState[]
}

interface LaneColliderEntry {
	obj_name: string
	position: [number, number, number]
	type: string
	shape: string
	friction: number
	restitution: number
	mass: number
	dimensions: [number, number, number]
	rotation: [number, number, number, number]
}

/** Matches `pin-colliders.json`; `resolveJsonModule` infers tuples as `number[]` / `number[][]`. */
interface PinColliderFile {
	_comment?: string
	cylinder: {
		radiusTop: number
		radiusBottom: number
		height: number
		numSegments: number
		friction: number
		restitution: number
		mass: number
	}
	positions: number[][]
}

const collidersJson = collidersData as LaneColliderEntry[]
const pinCfg = pinColliderData as PinColliderFile

const BALL_MASS = 15
const BOWL_SPEED_MIN = 5
const BOWL_SPEED_MAX = 20

/** Cylinder height axis = body +Y (Cannon default upright). */
function pinBodyQuaternion(): CannonQuaternion {
	return new CannonQuaternion(0, 0, 0, 1)
}

/** Lane-local pin rest positions (same order as simulation bodies). */
export const PIN_LANE_LOCAL_POSITIONS: ReadonlyArray<ReadonlyArray<number>> = pinCfg.positions

export class CannonSim {
	private world: World
	private ballBody: Body
	private pinBodies: Body[]

	constructor(position: Vector3, direction: Vector3, strength: number) {
		this.world = new World({
			gravity: new Vec3(0, -9.82, 0)
		})

		for (const c of collidersJson) {
			if (c.shape !== 'BOX') continue

			const halfExtents = new Vec3(
				c.dimensions[0] * 0.5,
				c.dimensions[1] * 0.5,
				c.dimensions[2] * 0.5
			)
			const shapeMat = new Material({
				friction: c.friction,
				restitution: c.restitution
			})
			const shape = new Box(halfExtents)
			shape.material = shapeMat

			const body = new Body({
				type: Body.STATIC,
				material: shapeMat,
				position: new Vec3(c.position[0], c.position[1], c.position[2]),
				quaternion: new CannonQuaternion(c.rotation[0], c.rotation[1], c.rotation[2], c.rotation[3])
			})
			body.addShape(shape)
			this.world.addBody(body)
		}

		const pc = pinCfg.cylinder
		const pinShapeMat = new Material({
			friction: pc.friction,
			restitution: pc.restitution
		})
		const pinMass = pc.mass
		this.pinBodies = []
		for (const pos of pinCfg.positions) {
			const px = pos[0]!
			const py = pos[1]!
			const pz = pos[2]!
			const cyl = new Cylinder(
				pc.radiusTop,
				pc.radiusBottom,
				pc.height,
				pc.numSegments
			)
			cyl.material = pinShapeMat
			const pinBody = new Body({
				mass: pinMass,
				position: new Vec3(px, py, pz),
				quaternion: pinBodyQuaternion(),
				linearDamping: 0.05,
				angularDamping: 0.2
			})
			pinBody.addShape(cyl)
			this.world.addBody(pinBody)
			this.pinBodies.push(pinBody)
		}

		const ballRadius = 0.1
		const ballShape = new Sphere(ballRadius)
		this.ballBody = new Body({
			mass: BALL_MASS,
			position: new Vec3(position.x, position.y, position.z),
			linearDamping: 0.01,
			angularDamping: 0.02,
			material: new Material({ friction: 0.2, restitution: 0.05 })
		})
		this.ballBody.addShape(ballShape)
		this.world.addBody(this.ballBody)

		const dx = direction.x
		const dy = direction.y
		const dz = direction.z
		const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (len > 1e-6) {
			const t = Math.max(0, Math.min(1, strength))
			const speed = BOWL_SPEED_MIN + t * (BOWL_SPEED_MAX - BOWL_SPEED_MIN)
			const impulseMag = BALL_MASS * speed
			const s = impulseMag / len
			this.ballBody.applyImpulse(new Vec3(dx * s, dy * s, dz * s))
		}
	}

	dispose(): void {}

	advance(dt: number): CannonSimAdvanceResult {
		this.world.fixedStep(dt)
		return {
			ball: this.snapshotBody(this.ballBody),
			pins: this.pinBodies.map((b) => this.snapshotBody(b))
		}
	}

	private snapshotBody(body: Body): CannonSimObjectState {
		const p = body.position
		const q = body.quaternion
		return {
			position: Vector3.create(p.x, p.y, p.z),
			rotation: Quaternion.create(q.x, q.y, q.z, q.w)
		}
	}
}
