import pinCollidersData from './colliders/pin-colliders.json'


/**
 * Shape of `colliders/pin-colliders.json`: rest positions for the pin rack and shared cylinder authoring.
 */
export type PinColliderFile = {
	_comment? : string
	cylinder  : {
		radiusTop   : number
		radiusBottom: number
		height      : number
		numSegments : number
		friction    : number
		restitution : number
		mass        : number
	}
	positions : number[][]
}

/**
 * Authoring data from `colliders/pin-colliders.json`. Not tied to a specific physics engine; any backend that
 * simulates this lane should use the same rest layout and collider dimensions.
 */
export const pinCollidersConfig = pinCollidersData as PinColliderFile

/**
 * Pin rack rest positions in lane-local space; same source as {@link pinCollidersConfig}.
 */
export const PIN_LANE_LOCAL_POSITIONS: ReadonlyArray<ReadonlyArray<number>> = pinCollidersConfig.positions
