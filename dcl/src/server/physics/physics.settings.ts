import type { OptimizationSettings, SimulationSettings } from './types'

export const GameSettings: SimulationSettings = {
	ballMass           : 15,
	ballFriction       : 0.05,
	ballRestitution    : 0.05,
	ballRadius         : 0.12,
	maxAngularVelocity : 10,   // rad/s
	bowlSpeedMax       : 20,
	bowlSpeedMin       : 4,
	decimalPlaces      : 2,    // decimal places to use for the simulation result
	idleFrameCap       : 10,   // stop the roll sampler after this many consecutive frames with no significant velocity
	pinMass            : 1.58,
	pinFriction        : 0.5,
	pinRestitution     : 0,
	laneBumpersEnabled : false,
	simDuration        : 10,
	simFrameRate       : 60,   // max frame rate of the returned simulation
	simSubSteps        : 4,    // extra frames used during the simulation to improve the accuracy
	velocityRestEpsilon: 0.02, // velocity rest epsilon
}

export const DefaultOptimizationSettings: OptimizationSettings = {
	keyframeOptimizationEnabled      : true,
	keyframeReductionEpsilon         : 0.02,
	keyframeRdpMaxPositionErrorM     : 0.015,
	keyframeRdpMaxRotationErrorDeg   : 5,    // Slerp comparison only; if too tight, every frame stays (union with position RDP then dense).
	keyframePrecontactMotionMinPosM  : 0.10, // Precontact: ignore sub-mm drift; first sample past this vs t=0 is “motion.”
	keyframePrecontactMotionMinRotDeg: 0.30,   // Precontact: ignore sub-degree quat wobble before real hit.
}
