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
 * (`leaderboard.3frame.weekly` under `leaderboard.3.root`; Hall of Fame
 * empties `hallOfFame.{3,6,10}frame` mark the top-centre of each column).
 * Position: GLTF (x, y, z) → DCL (x, y, -z).
 * Yaw: DCL Y = 180 - GLTF Y (matches the scene root's Y=180).
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
		rotation: Vector3.create(0, 230, 0),
	},
	{
		id      : 'alltime-6',
		position: Vector3.create(-17.2281, 128.7255, 9.4068),
		rotation: Vector3.create(0, 230, 0),
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
		position: Vector3.create(-20.4265, 130.5134, 18.1612),
		rotation: Vector3.create(0, 315, 0),
	},
	{
		id      : 'hallOfFame-6',
		position: Vector3.create(-19.3704, 130.5134, 19.2173),
		rotation: Vector3.create(0, 315, 0),
	},
	{
		id      : 'hallOfFame-10',
		position: Vector3.create(-18.3142, 130.5134, 20.2735),
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
