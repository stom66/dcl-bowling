import { Leaderboard, LeaderboardEntry } from "src/shared/classes/leaderboard"
import { publishScoreboard } from "src/shared/classes/leaderboard.publish"


// MARK: LeaderboardAllTime
/**
 * All-time leaderboard. A score is only replaced when it beats that player's stored best.
 */
export class LeaderboardAllTime extends Leaderboard {
	constructor(storeName: string) {
		super(storeName)
	}


	// MARK: callback
	/**
	 * Publishes the cleaned all-time board onto the synced scene component.
	 */
	protected callback(entries: LeaderboardEntry[]): void {
		console.log(`LeaderboardAllTime: callback: wrote "${this.storeName}"`, entries)
		publishScoreboard(this.storeName, entries)
	}
}
