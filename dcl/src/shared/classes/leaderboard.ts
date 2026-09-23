import { ServerBackedState } from "src/shared/storage/server.storageBackedState"
import { userProfileCache } from "src/shared/utils/userProfileCache"


export type LeaderboardEntry = {
	userId     : string
	displayName: string
	score      : number
	lastUpdated: number
	rank       : number
}

export type LeaderboardScore = {
	userId         : string
	score          : number
	isNewHighscore?: boolean
}

export type ScoreboardKey =
	| 'alltime-3'
	| 'alltime-6'
	| 'alltime-10'
	| 'weekly-3'
	| 'weekly-6'
	| 'weekly-10'


// MARK: Leaderboard
/**
 * Personal-best ranked board backed by one scene storage key.
 */
export class Leaderboard {
	protected storeName  : string
	protected recordLimit: number = 10

	private readonly backed: ServerBackedState<LeaderboardEntry[]>
	private readonly ready : Promise<void>


	constructor(storeName: string) {
		this.storeName = storeName

		this.backed = new ServerBackedState<LeaderboardEntry[]>({
			key          : storeName,
			createDefault: () => [],
			normalize    : (raw) => {
				const entries = Array.isArray(raw) ? raw as LeaderboardEntry[] : []
				return this.cleanup(entries)
			},
			onPublish: (entries) => {
				this.callback(entries)
			},
		})

		this.ready = this.backed.init().catch((error) => {
			console.error(`Leaderboard: constructor: failed to hydrate "${this.storeName}"`, error)
		})
	}


	// MARK: read
	/**
	 * Returns the current in-memory leaderboard entries after initial hydration.
	 */
	public async read(): Promise<LeaderboardEntry[]> {
		await this.ready
		return this.backed.get()
	}


	// MARK: submitScores
	/**
	 * Applies each score if shouldReplace allows it, then writes the cleaned
	 * result back in one queued storage update.
	 */
	public async submitScores(
		scores: LeaderboardScore[]
	): Promise<void> {
		if (scores.length === 0) return

		await this.backed.updateAsync(async (entries) => {
			const next = entries.map((entry) => ({ ...entry }))

			for (const score of scores) {
				await this.applyScore(next, score)
			}

			return next
		})
	}


	// MARK: applyScore
	/**
	 * Applies one incoming score to the in-memory leaderboard entries.
	 * Replaces the player's stored row when the new score beats that player's
	 * personal best, not the board's highest score.
	 */
	private async applyScore(
		entries: LeaderboardEntry[],
		score  : LeaderboardScore
	): Promise<void> {
		const userIdKey   = score.userId.toLowerCase()
		const displayName = await userProfileCache.getDisplayName(score.userId)

		let existing: LeaderboardEntry | undefined
		for (const entry of entries) {
			if (entry.userId.toLowerCase() !== userIdKey) continue
			if (!existing || entry.score > existing.score) existing = entry
		}

		if (existing && !this.shouldReplace(existing, score.score)) return

		for (let i = entries.length - 1; i >= 0; i--) {
			if (entries[i].userId.toLowerCase() === userIdKey) {
				entries.splice(i, 1)
			}
		}

		entries.push({
			userId     : existing?.userId ?? score.userId,
			displayName: displayName,
			score      : score.score,
			lastUpdated: Date.now(),
			rank       : 0
		})
	}


	// MARK: callback
	/**
	 * Callback to be overridden by subclasses to perform additional actions when a score is
	 * submitted or data is read.
	 */
	protected callback(entries: LeaderboardEntry[]): void {
		console.log(`Leaderboard: callback: wrote "${this.storeName}"`, entries)
	}


	// MARK: cleanup
	/**
	 * Dedupes by userId (keeping that player's best score), then sorts high to
	 * low and caps to recordLimit. Run on every read and write so storage stays
	 * bounded. Override wholesale for boards with extra requirements (eg weekly
	 * dropping entries from previous weeks).
	 */
	protected cleanup(entries: LeaderboardEntry[]): LeaderboardEntry[] {
		const bestByUser = new Map<string, LeaderboardEntry>()

		for (const entry of entries) {
			const key     = entry.userId.toLowerCase()
			const current = bestByUser.get(key)

			if (
				!current
				|| entry.score > current.score
				|| (entry.score === current.score && (entry.lastUpdated ?? 0) > (current.lastUpdated ?? 0))
			) {
				bestByUser.set(key, entry)
			}
		}

		return Array.from(bestByUser.values())
			.sort((a, b) => b.score - a.score)
			.slice(0, this.recordLimit)
			.map((entry, index) => ({ ...entry, rank: index + 1 }))
	}


	// MARK: shouldReplace
	/**
	 * Whether an incoming score should replace the stored entry. Defaults to
	 * keeping the player's personal best, even when that is not first place.
	 */
	protected shouldReplace(
		existing: LeaderboardEntry,
		score   : number
	): boolean {
		return score > existing.score
	}
}
