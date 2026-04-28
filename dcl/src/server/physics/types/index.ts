// We pull these in here and re-export them so the physics backend can use them without importing the whole library.
export type { QuaternionType, Vector3Type } from '@dcl/ecs'
export { Quaternion } from '@dcl/sdk/math'

export type {
	BowlingPhysicsSimulator,
	OptimizationSettings,
	SimObjectKeyframe,
	SimObjectKeyframes,
	SimulationInput,
	SimulationResult,
	SimulationRunResult,
	SimulationSettings,
} from './bowling-sim'
