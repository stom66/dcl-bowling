import { LeaderboardEntry, ScoreboardKey } from "src/shared/classes/leaderboard"
import { ComponentStore } from "src/shared/components/componentStore"
import { SceneScoreboards } from "src/shared/components/definitions/shared.scoreboards"
import { LeaderboardScoreRow } from "src/shared/types/shared-types"


type SceneScoreboardsValue = {
	alltime3 : LeaderboardScoreRow[]
	alltime6 : LeaderboardScoreRow[]
	alltime10: LeaderboardScoreRow[]
	weekly3  : LeaderboardScoreRow[]
	weekly6  : LeaderboardScoreRow[]
	weekly10 : LeaderboardScoreRow[]
}


// MARK: emptySceneScoreboards
/**
 * Empty six-board payload used when the synced component is missing.
 */
function emptySceneScoreboards(): SceneScoreboardsValue {
	return {
		alltime3 : [],
		alltime6 : [],
		alltime10: [],
		weekly3  : [],
		weekly6  : [],
		weekly10 : [],
	}
}


// MARK: toScoreRows
/**
 * Drops storage-only fields before publishing to the synced component.
 */
function toScoreRows(entries: LeaderboardEntry[]): LeaderboardScoreRow[] {
	return entries.map((entry) => ({
		userId     : entry.userId,
		displayName: entry.displayName,
		score      : entry.score,
		rank       : entry.rank,
	}))
}


// MARK: assignBoard
/**
 * Writes one board's rows onto the scene scoreboard payload.
 */
function assignBoard(
	target   : SceneScoreboardsValue,
	storeName: string,
	rows     : LeaderboardScoreRow[]
): void {
	switch (storeName as ScoreboardKey) {
		case 'alltime-3':  target.alltime3  = rows; break
		case 'alltime-6':  target.alltime6  = rows; break
		case 'alltime-10': target.alltime10 = rows; break
		case 'weekly-3':   target.weekly3   = rows; break
		case 'weekly-6':   target.weekly6   = rows; break
		case 'weekly-10':  target.weekly10  = rows; break
		default:
			console.error(`leaderboard.publish: assignBoard: unknown storeName "${storeName}"`)
	}
}


// MARK: publishScoreboard
/**
 * Copies one ranked board onto the synced `SceneScoreboards` component.
 */
export function publishScoreboard(
	storeName: string,
	entries  : LeaderboardEntry[]
): void {
	const rows    = toScoreRows(entries)
	const mutable = ComponentStore.getMutableOrNull(SceneScoreboards)

	if (mutable) {
		assignBoard(mutable, storeName, rows)
		return
	}

	const next = emptySceneScoreboards()
	assignBoard(next, storeName, rows)
	ComponentStore.createOrReplace(SceneScoreboards, next)
}
