import { engine, Entity, GltfContainer, GltfContainerLoadingState, LoadingState } from '@dcl/sdk/ecs'


type PendingGltf = {
	entity    : Entity
	onFinished: () => void
	terminals : readonly LoadingState[]
}

const FINISHED_ONLY: readonly LoadingState[] = [LoadingState.FINISHED]

const pending : PendingGltf[] = []
let   watching = false



// MARK: whenGltfContainerFinished
/**
 * Runs `onFinished` once `entity`'s GLTF reaches one of `terminals`.
 *
 * `GltfContainerLoadingState.onChange` does not replay a state already stored
 * on the entity, so a cached model never delivers `FINISHED` to a new listener.
 * This reads the current state immediately, then polls until a later write
 * arrives. The poll system removes itself when nothing is waiting, and a
 * removed entity is dropped. No `onChange` callback is retained.
 */
export function whenGltfContainerFinished(
	entity    : Entity,
	onFinished: () => void,
	terminals : readonly LoadingState[] = FINISHED_ONLY,
): void {
	if (isTerminal(entity, terminals)) {
		onFinished()
		return
	}

	pending.push({ entity, onFinished, terminals })
	if (watching) return

	watching = true
	engine.addSystem(sys_watchGltfLoads)
}



// MARK: isTerminal
function isTerminal(
	entity   : Entity,
	terminals: readonly LoadingState[],
): boolean {
	const state = GltfContainerLoadingState.getOrNull(entity)?.currentState
	if (state === undefined) return false
	return terminals.indexOf(state) !== -1
}



// MARK: sys_watchGltfLoads
/**
 * Shared watcher for {@link whenGltfContainerFinished}. One system for every
 * in-flight model, removed when the list is empty.
 */
function sys_watchGltfLoads(): void {
	for (let i = pending.length - 1; i >= 0; i--) {
		const item = pending[i]!
		if (!GltfContainer.has(item.entity)) {
			pending.splice(i, 1)
			continue
		}
		if (!isTerminal(item.entity, item.terminals)) continue

		pending.splice(i, 1)
		item.onFinished()
	}

	if (pending.length > 0) return

	engine.removeSystem(sys_watchGltfLoads)
	watching = false
}
