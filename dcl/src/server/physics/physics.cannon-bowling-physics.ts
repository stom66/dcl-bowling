import { CannonSim } from './physics.cannon-sim'
import type { OptimizationSettings, SimulationSettings } from './types'
import type { BowlingPhysicsSimulator, SimulationInput, SimulationRunResult } from './types'


/**
 * Cannon-es implementation of {@link BowlingPhysicsSimulator}.
 */
export class CannonBowlingPhysicsSimulator implements BowlingPhysicsSimulator {
	// MARK: simulateRoll
	/**
	 * Builds a {@link CannonSim} with `simulationSettings`, runs it for `input.duration`, and returns keyframes.
	 */
	simulateRoll(
		input                  : SimulationInput,
		simulationSettings     : SimulationSettings,
		_optimizationSettings  : OptimizationSettings,
	): SimulationRunResult {
		const sim = new CannonSim(
			input.position,
			input.direction,
			input.strength,
			input.spin,
			input.pinStates,
			simulationSettings,
		)
		return sim.simulate(input.duration)
	}
}
