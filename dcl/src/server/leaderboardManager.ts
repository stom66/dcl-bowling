import { Leaderboard, LeaderboardScore, ScoreboardKey } from "src/shared/classes/leaderboard"
import { LeaderboardAllTime } from "src/shared/classes/leaderboard.allTime"
import { LeaderboardWeekly } from "src/shared/classes/leaderboard.weekly"
import { GameFrameCount, normalizeFrameCount } from "src/shared/settings"

import { PerfectGameWall } from "src/server/perfectGameWall"


const SCOREBOARD_KEYS: ScoreboardKey[] = [
	'alltime-3',
	'alltime-6',
	'alltime-10',
	'weekly-3',
	'weekly-6',
	'weekly-10',
]


// MARK: LeaderboardManager
/**
 * Owns the six ranked boards and the perfect-game wall. Submit game totals here on endGame.
 */
export namespace LeaderboardManager {

	const leaderboards: { [key: string]: Leaderboard } = {}


	// MARK: init
	/**
	 * Hydrates all ranked boards and the perfect-game wall. Call after ComponentStore.init.
	 */
	export function init(): void {
		console.log('LeaderboardManager: init')

		for (const key of SCOREBOARD_KEYS) {
			leaderboards[key] = key.startsWith('weekly')
				? new LeaderboardWeekly(key)
				: new LeaderboardAllTime(key)
		}

		PerfectGameWall.init()
	}


	// MARK: submitScores
	/**
	 * Writes scores to one named board.
	 */
	export async function submitScores(
		boardName: string,
		scores   : LeaderboardScore[]
	): Promise<void> {
		const board = leaderboards[boardName]
		if (!board) {
			console.error(`LeaderboardManager: submitScores: unknown board "${boardName}"`)
			return
		}

		await board.submitScores(scores)
	}


	// MARK: submitGameResults
	/**
	 * Submits each player's total to the all-time and weekly boards for this game's
	 * length, and appends perfect games to the wall.
	 */
	export async function submitGameResults(
		frameCount: GameFrameCount,
		scores    : LeaderboardScore[]
	): Promise<void> {
		if (scores.length === 0) return

		const count = normalizeFrameCount(frameCount)
		console.log('LeaderboardManager: submitGameResults: frameCount', count, 'players', scores.length)

		await Promise.all([
			submitScores(`alltime-${count}`, scores),
			submitScores(`weekly-${count}`, scores),
			PerfectGameWall.tryRecordMany(count, scores),
		])
	}
}
