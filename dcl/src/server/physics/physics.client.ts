import { CannonBowlingPhysicsSimulator } from './physics.cannon-bowling-physics'
import { compressSimulationResult } from './physics.keyframe-optimization'
import { PIN_LANE_LOCAL_POSITIONS } from './physics.pin-layout'
import { DefaultOptimizationSettings, GameSettings } from './physics.settings'
import type {
	BowlingPhysicsSimulator,
	OptimizationSettings,
	SimulationInput,
	SimulationResult,
	SimulationSettings,
} from './types'


export const DEFAULT_SIMULATION_INPUT: SimulationInput = {
	position : { x: 0, y: 0.12, z: 0.8 },
	direction: { x: 0, y: 0, z: 1 },
	strength : 0.85,
	spin     : 0,
	duration : GameSettings.simDuration,
	pinStates: Array(PIN_LANE_LOCAL_POSITIONS.length).fill(true),
}


// MARK: getSimulationResults
/**
 * Runs one roll through the physics simulator, optionally compresses keyframes, and returns a {@link SimulationResult}.
 *
 * @param input Roll parameters.
 * @param simulationOverrides Merged on top of {@link GameSettings}.
 * @param optimizationOverrides Merged on top of {@link DefaultOptimizationSettings}. Set `keyframeOptimizationEnabled`
 *   to `false` in overrides to return identical original/compressed keyframes (compression skipped).
 * @param physics Optional backend; a new {@link CannonBowlingPhysicsSimulator} is used on each call when omitted.
 */
export function getSimulationResults(
	input                 : SimulationInput,
	simulationOverrides?  : Partial<SimulationSettings>,
	optimizationOverrides?: Partial<OptimizationSettings>,
	physics               : BowlingPhysicsSimulator = new CannonBowlingPhysicsSimulator(),
): SimulationResult {
	const simSettings  = resolveSimulationSettings(simulationOverrides ?? {})
	const optSettings  = resolveOptimizationSettings(optimizationOverrides ?? {})
	const original     = physics.simulateRoll(input, simSettings, optSettings)
	const compressed   = optSettings.keyframeOptimizationEnabled
		? compressSimulationResult(original, optSettings)
		: original

	return {
		original         : original,
		compressed       : compressed,
		duration         : compressed.duration,
		gutterBall       : compressed.gutterBall,
		finalPinStates   : [...compressed.finalPinStates],
		startingPinStates: Array.from(
			{ length: PIN_LANE_LOCAL_POSITIONS.length },
			(_, index) => input.pinStates[index] ?? true,
		),
	}
}


// MARK: resolveSimulationSettings
/**
 * Returns {@link GameSettings} merged with `overrides`.
 */
export function resolveSimulationSettings(overrides: Partial<SimulationSettings> = {}): SimulationSettings {
	return {
		...GameSettings,
		...overrides,
	}
}


// MARK: resolveOptimizationSettings
/**
 * Returns {@link DefaultOptimizationSettings} merged with `overrides`.
 */
export function resolveOptimizationSettings(overrides: Partial<OptimizationSettings> = {}): OptimizationSettings {
	return {
		...DefaultOptimizationSettings,
		...overrides,
	}
}
