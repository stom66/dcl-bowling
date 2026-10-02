import { Vector3 } from "@dcl/sdk/math";


const rootPosition = Vector3.create(0, 128, 0) // pivot point for the main platform

// Offset from rootPosition for each of the bowling lanes
const lanePositions = [
    Vector3.create(-12.5, 0, 43),
    Vector3.create(-7.5,  0, 43),
    Vector3.create(-2.5,  0, 43),
    Vector3.create(2.5,   0, 43),
    Vector3.create(7.5,   0, 43),
    Vector3.create(12.5,  0, 43),
	
]

// Offset from rootPosition for each of the lane screens
const laneScreenPositions = [
	Vector3.create(-12.5, 3.315, 41.819),
	Vector3.create(-7.5,  3.315, 41.819),
	Vector3.create(-2.5,  3.315, 41.819),
	Vector3.create(2.5,   3.315, 41.819),
	Vector3.create(7.5,   3.315, 41.819),
	Vector3.create(12.5,  3.315, 41.819),
]

const laneLobbyPositions = [
		Vector3.create(12.64,  0, 35.359),
		Vector3.create(8.126,  0, 37.081),
		Vector3.create(3.125,  0, 36.965),
		Vector3.create(-1.485, 0, 35.042),
		Vector3.create(-5.374, 0, 31.213),
		Vector3.create(-7.62,  0, 26.085),	
]

export function getRootPosition() {
	return rootPosition
}

export function getLanePosition(laneIndex: number) {
	laneIndex = laneIndex % lanePositions.length
	return Vector3.add(rootPosition, lanePositions[laneIndex])
}

export function getLaneScreenPosition(laneIndex: number) {
	laneIndex = laneIndex % lanePositions.length
	return Vector3.add(rootPosition, laneScreenPositions[laneIndex])
}

export function getLaneLobbyPosition(laneIndex: number) {
	laneIndex = laneIndex % lanePositions.length
	return Vector3.add(rootPosition, laneLobbyPositions[laneIndex])
}