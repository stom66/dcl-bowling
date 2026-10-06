import { Vector3 } from '@dcl/sdk/math'

import { GameFrameCount } from 'src/shared/settings'


export type RankedLeaderboardPeriod = 'weekly' | 'alltime'

export type RankedLeaderboardAnchorId =
	| 'weekly-3'
	| 'weekly-6'
	| 'weekly-10'
	| 'alltime-3'
	| 'alltime-6'
	| 'alltime-10'

export type HallOfFameAnchorId =
	| 'hallOfFame-3'
	| 'hallOfFame-6'
	| 'hallOfFame-10'

export type LeaderboardAnchorId = RankedLeaderboardAnchorId | HallOfFameAnchorId

export type LeaderboardAnchor = {
	id      : LeaderboardAnchorId
	position: Vector3
	rotation: Vector3
}


/**
 * World-space roots from composed `scene-new.gltf` node transforms
 * (`leaderboard.3frame.weekly` under `leaderboard.3.root`, Hall of Fame under `pins.root`).
 * GLTF world (x, y, z) → DCL (x, y, -z). Rotation is Euler degrees applied as-is.
 */
export const leaderboardAnchors: LeaderboardAnchor[] = [
	{
		id      : 'weekly-3',
		position: Vector3.create(-12.1524, 130.6739, 6.7987),
		rotation: Vector3.create(0, 198.75, 0),
	},
	{
		id      : 'alltime-3',
		position: Vector3.create(-12.1524, 128.7255, 6.7987),
		rotation: Vector3.create(0, 198.75, 0),
	},
	{
		id      : 'weekly-6',
		position: Vector3.create(-17.2281, 130.6739, 9.4068),
		rotation: Vector3.create(0, 225, 0),
	},
	{
		id      : 'alltime-6',
		position: Vector3.create(-17.2281, 128.7255, 9.4068),
		rotation: Vector3.create(0, 225, 0),
	},
	{
		id      : 'weekly-10',
		position: Vector3.create(-19.6169, 130.6385, 14.2604),
		rotation: Vector3.create(0, 255, 0),
	},
	{
		id      : 'alltime-10',
		position: Vector3.create(-19.6169, 128.6901, 14.2604),
		rotation: Vector3.create(0, 255, 0),
	},
	{
		id      : 'hallOfFame-3',
		position: Vector3.create(-21.0414, 128.7252, 18.6640),
		rotation: Vector3.create(0, 315, 0),
	},
	{
		id      : 'hallOfFame-6',
		position: Vector3.create(-19.9266, 128.7252, 19.7788),
		rotation: Vector3.create(0, 315, 0),
	},
	{
		id      : 'hallOfFame-10',
		position: Vector3.create(-18.8126, 128.7252, 20.8927),
		rotation: Vector3.create(0, 315, 0),
	},
]



// MARK: isHallOfFameAnchor
/**
 * True when the anchor is one of the three Hall of Fame boards.
 */
export function isHallOfFameAnchor(id: LeaderboardAnchorId): id is HallOfFameAnchorId {
	return id.startsWith('hallOfFame-')
}



// MARK: getAnchorFrameCount
/**
 * Game length encoded in the anchor id.
 */
export function getAnchorFrameCount(id: LeaderboardAnchorId): GameFrameCount {
	if (id.endsWith('-10')) return 10
	if (id.endsWith('-6'))  return 6
	return 3
}



// MARK: getAnchorPeriod
/**
 * Weekly or all-time for a ranked board. Undefined for Hall of Fame.
 */
export function getAnchorPeriod(id: LeaderboardAnchorId): RankedLeaderboardPeriod | undefined {
	if (isHallOfFameAnchor(id)) return undefined
	return id.startsWith('weekly-') ? 'weekly' : 'alltime'
}
