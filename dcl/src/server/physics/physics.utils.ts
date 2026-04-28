/**
 * Engine-agnostic helpers shared by physics backends and the keyframe pipeline (vectors, rounding, wire-format rotation).
 */
import { Quaternion } from '@dcl/sdk/math'

import type { QuaternionType, Vector3Type } from './types'


// MARK: lengthSquared
/**
 * Squared Euclidean length of a 3-vector (avoids `sqrt` when comparing thresholds).
 */
export function lengthSquared(vector: Vector3Type): number {
	return vector.x ** 2 + vector.y ** 2 + vector.z ** 2
}


// MARK: roundVec3
/**
 * Rounds each XYZ component to `decimalPlaces` decimal places.
 */
export function roundVec3(
	vector        : Vector3Type,
	decimalPlaces : number,
): Vector3Type {
	const factor = 10 ** decimalPlaces
	return {
		x: Math.round(vector.x * factor) / factor,
		y: Math.round(vector.y * factor) / factor,
		z: Math.round(vector.z * factor) / factor,
	}
}


/**
 * `SimObjectKeyframe.rotation` wire format: **Euler angle degrees** in **(x, y, z)** — the values returned by
 * `Quaternion.toEulerAngles` and accepted by `Quaternion.fromEulerDegrees` in `@dcl/ecs-math` / DCL runtime.
 * Three floats on the wire instead of a quaternion.
 *
 * `Quaternion.toEulerAngles(Identity)` — default forward-filled rotation when a track has no `rotation` key.
 */
export const DEFAULT_STORED_ROTATION: Vector3Type = (() => {
	const e = Quaternion.toEulerAngles(Quaternion.Identity())
	return { x: e.x, y: e.y, z: e.z }
})()


// MARK: quaternionToStoredRotation
/**
 * Engine quaternion (e.g. Cannon or Three.js) to storable Euler (degrees) for keyframes / wire format.
 */
export function quaternionToStoredRotation(quaternion: QuaternionType): Vector3Type {
	const n = Quaternion.normalize(quaternion)
	const e = Quaternion.toEulerAngles(n)
	return { x: e.x, y: e.y, z: e.z }
}


// MARK: storedRotationToQuaternion
/**
 * Storable Euler (degrees) to engine quaternion, for simulation / RDP / playback.
 */
export function storedRotationToQuaternion(rotation: Vector3Type): QuaternionType {
	return Quaternion.fromEulerDegrees(rotation.x, rotation.y, rotation.z)
}
