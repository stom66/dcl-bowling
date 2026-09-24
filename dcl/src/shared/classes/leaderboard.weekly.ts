import { Leaderboard, LeaderboardEntry } from "src/shared/classes/leaderboard"
import { publishScoreboard } from "src/shared/classes/leaderboard.publish"


// MARK: LeaderboardWeekly
/**
 * Weekly leaderboard. Entries from previous ISO weeks are dropped on cleanup.
 */
export class LeaderboardWeekly extends Leaderboard {
	constructor(storeName: string) {
		super(storeName)
	}


	// MARK: cleanup
	/**
	 * Drops entries that were not set in the current week, then sorts and slices.
	 */
	protected cleanup(entries: LeaderboardEntry[]): LeaderboardEntry[] {
		const currentWeek  = this.weekKey(Date.now())
		const thisWeekOnly = entries.filter((entry) => this.weekKey(entry.lastUpdated) === currentWeek)

		return super.cleanup(thisWeekOnly)
	}


	// MARK: weekKey
	/**
	 * Returns a stable ISO 8601 week identifier ("<isoYear>-<week>") for a timestamp,
	 * so comparisons stay correct across month and year boundaries.
	 */
	private weekKey(timestamp: number): string {
		const target = new Date(Date.UTC(
			new Date(timestamp).getUTCFullYear(),
			new Date(timestamp).getUTCMonth(),
			new Date(timestamp).getUTCDate()
		))

		const dayOffset = (target.getUTCDay() + 6) % 7
		target.setUTCDate(target.getUTCDate() - dayOffset + 3)

		const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
		const firstOffset   = (firstThursday.getUTCDay() + 6) % 7
		firstThursday.setUTCDate(firstThursday.getUTCDate() - firstOffset + 3)

		const msPerWeek = 7 * 24 * 60 * 60 * 1000
		const week      = 1 + Math.round((target.getTime() - firstThursday.getTime()) / msPerWeek)

		return `${target.getUTCFullYear()}-${week}`
	}


	// MARK: callback
	/**
	 * Publishes the cleaned weekly board onto the synced scene component.
	 */
	protected callback(entries: LeaderboardEntry[]): void {
		console.log(`LeaderboardWeekly: callback: wrote "${this.storeName}"`, entries)
		publishScoreboard(this.storeName, entries)
	}
}
