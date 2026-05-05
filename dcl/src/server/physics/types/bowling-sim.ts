import type { Vector3Type } from '@dcl/ecs'

/**
 * Single sample on a track; used by physics output and the keyframe optimizer.
 * Position: `Schemas.Vector3`. `rotation`: Euler **degrees (x, y, z)**, not a quaternion — same convention as
 * `Quaternion.toEulerAngles` / `fromEulerDegrees` in `@dcl/ecs-math` (three scalars on the wire).
 */
export type SimObjectKeyframe = {
	time     : number
	position?: Vector3Type
	rotation?: Vector3Type
}

export type SimObjectKeyframes = {
	index    : number
	label    : string
	keyframes: SimObjectKeyframe[]
}

export type SimulationInput = {
	direction: Vector3Type
	duration : number
	pinStates: boolean[]
	position : Vector3Type
	spin     : number /** −1…+1, scaled by {@link SimulationSettings.maxAngularVelocity} for initial angular velocity about +Y (rad/s). */
	strength : number	
}

/** One physics or compression path: ball + pin keyframes, final pin states, timing. */
export type SimulationRunResult = {
	ballKeyframes : SimObjectKeyframes
	duration      : number
	pinsKeyframes : SimObjectKeyframes[]
	finalPinStates: boolean[]
	gutterBall    : boolean
	/** Wall time for this stage physics in `BowlingPhysicsSimulator.simulateRoll`, or compression in `compressSimulationResult`. */
	computeTimeMs : number
}

/** Return of `getSimulationResults`: raw and optional keyframe-reduced tracks plus pin bookkeeping. */
export type SimulationResult = {
	original         : SimulationRunResult
	compressed       : SimulationRunResult
	duration         : number
	gutterBall       : boolean
	finalPinStates   : boolean[]
	startingPinStates: boolean[]
}

/** Keyframe optimizer only; not used by physics integration (see `SimulationSettings.velocityRestEpsilon` for sim early-stop). */
export type OptimizationSettings = {
	/**
	 * When false, the keyframe reduction pipeline is skipped and `getSimulationResults` uses the same
	 * `SimulationRunResult` for both `original` and `compressed`. Physically ignored by the simulator; host-only.
	 */
	keyframeOptimizationEnabled      : boolean
	/** Meters. Flat dedup: middle keyframe dropped if prev/mid/next equal for position, or equal for rotation (Euler) via quaternion round-trip. */
	keyframeReductionEpsilon         : number
	/**
	 * R–D–P: max **position** error (m) vs linear-in-time interpolation between segment endpoints — same metric as
	 * playback lerp. Non-finite or negative (e.g. `-1`) disables the position term; rotation can still drive simplification.
	 */
	keyframeRdpMaxPositionErrorM     : number
	/**
	 * R–D–P: max **rotation** error vs slerp in time (°), shortest quat path. Use `-1` (or `Infinity`) to skip rotation RDP.
	 */
	keyframeRdpMaxRotationErrorDeg   : number
	/**
	 * Precontact anchor: min **horizontal (XZ)** position delta (m) from t=0 on pin tracks to count as “motion.” Use `-1`
	 * to ignore position (use rotation only if that is not also `-1`).
	 */
	keyframePrecontactMotionMinPosM  : number
	/**
	 * Precontact anchor: min geodesic rotation (°) from t=0. Values under ~1–2° often match solver noise and fire the
	 * anchor too early (compressed playback then lerps/slerps before the real hit). `-1` = ignore rotation (position only).
	 * If **both** this and {@link keyframePrecontactMotionMinPosM} are `-1`, the precontact anchor pass is skipped.
	 */
	keyframePrecontactMotionMinRotDeg: number
}

/** Physics backends and per-step recording (frame rate, masses, early-stop, etc.). */
export type SimulationSettings = {
	decimalPlaces                   : number
	/** Squared linear velocity threshold for “at rest”; sim stops early after N quiet frames (see Cannon loop). */
	velocityRestEpsilon             : number
	simFrameRate                    : number
	simSubSteps                     : number
	simDuration                     : number
	/** Stop sampling after this many consecutive frames with no significant body velocity. */
	idleFrameCap                     : number
	ballAngularDamping              : number
	ballFriction                    : number
	ballLinearDamping               : number
	ballMass                        : number
	ballRadius                      : number
	ballRestitution                 : number
	/**
	 * Magnitude of initial ball angular velocity about +Y (rad/s) when `spin` is ±1. Scales linearly: ωy = `spin` × this.
	 */
	ballMaxAngularVelocity          : number
	bowlSpeedMin                    : number
	bowlSpeedMax                    : number
	/** Overrides pin cylinder mass from collider data in the Cannon sim. */
	pinAngularDamping               : number
	pinMass                         : number
	pinFriction                     : number
	pinLinearDamping                : number
	pinRestitution                  : number
	
	/**
	 * When true, static box colliders from `physics/colliders/bumper-colliders.json` are added to the Cannon world (gutter bumpers).
	 */
	laneBumpersEnabled              : boolean
}

/**
 * Produces a full `SimulationRunResult` (ball + pin keyframes, final pin states) for one roll.
 * Implement with Cannon-es, Rapier, etc. `optimizationSettings` is passed through so callers keep one pipeline shape;
 * engines may ignore it if they do not apply optimizer tunables during sampling.
 */
export interface BowlingPhysicsSimulator {
	simulateRoll(
		input               : SimulationInput,
		simulationSettings  : SimulationSettings,
		optimizationSettings: OptimizationSettings,
	): SimulationRunResult
}
