import { LeaderboardScore } from "src/shared/classes/leaderboard"
import { ComponentStore } from "src/shared/components/componentStore"
import { PerfectGames } from "src/shared/components/definitions/shared.scoreboards"
import { GameFrameCount, getPerfectScore, isGameFrameCount } from "src/shared/settings"
import { ServerBackedState } from "src/shared/storage/server.storageBackedState"
import { PerfectGameEntry } from "src/shared/types/shared-types"
import { userProfileCache } from "src/shared/utils/userProfileCache"


type PerfectGamesState = {
	entries: PerfectGameEntry[]
}


// MARK: isPerfectGameEntry
/**
 * True when a storage row has the fields needed to show on the wall.
 */
function isPerfectGameEntry(value: unknown): value is PerfectGameEntry {
	if (!value || typeof value !== 'object') return false

	const row = value as PerfectGameEntry
	return (
		typeof row.displayName === 'string'
		&& typeof row.userId === 'string'
		&& typeof row.achievedAt === 'number'
		&& isGameFrameCount(row.frameCount)
	)
}


// MARK: normalizeState
/**
 * Accepts `{ entries }` or a legacy bare array and keeps valid rows in order.
 */
function normalizeState(raw: unknown): PerfectGamesState {
	if (Array.isArray(raw)) {
		return { entries: raw.filter(isPerfectGameEntry) }
	}

	if (raw && typeof raw === 'object' && Array.isArray((raw as PerfectGamesState).entries)) {
		return { entries: (raw as PerfectGamesState).entries.filter(isPerfectGameEntry) }
	}

	return { entries: [] }
}


// MARK: toComponentEntries
/**
 * Copies wall rows into a new array so the synced component marks dirty.
 */
function toComponentEntries(entries: PerfectGameEntry[]): PerfectGameEntry[] {
	return entries.map((entry) => ({
		displayName: entry.displayName,
		userId     : entry.userId,
		achievedAt : entry.achievedAt,
		frameCount : entry.frameCount,
	}))
}


// MARK: PerfectGameWall
/**
 * Append-only scene list of perfect games. First entry stays first; later ones append.
 */
export namespace PerfectGameWall {

	let backed: ServerBackedState<PerfectGamesState> | undefined
	let ready : Promise<void> | undefined


	// MARK: init
	/**
	 * Hydrates `perfectGames` storage and publishes the wall to the main entity.
	 */
	export function init(): void {
		console.log('PerfectGameWall: init')

		backed = new ServerBackedState<PerfectGamesState>({
			key          : 'perfectGames',
			createDefault: () => ({ entries: [] }),
			normalize    : normalizeState,
			onPublish    : (state) => {
				const entries = toComponentEntries(state.entries)
				const mutable = ComponentStore.getMutableOrNull(PerfectGames)
				if (mutable) {
					mutable.entries = entries
					return
				}
				ComponentStore.createOrReplace(PerfectGames, { entries })
			},
		})

		ready = backed.init().catch((error) => {
			console.error('PerfectGameWall: init: failed to hydrate', error)
		})
	}


	// MARK: tryRecordMany
	/**
	 * Appends a wall row for each score that matches the perfect total for `frameCount`.
	 */
	export async function tryRecordMany(
		frameCount: GameFrameCount,
		scores    : LeaderboardScore[]
	): Promise<void> {
		if (!backed || !ready) {
			console.error('PerfectGameWall: tryRecordMany: not initialised')
			return
		}

		const perfectScore = getPerfectScore(frameCount)
		const matches      = scores.filter((score) => score.score === perfectScore)
		if (matches.length === 0) return

		await ready

		await backed.updateAsync(async (state) => {
			const next = state.entries.map((entry) => ({ ...entry }))

			for (const score of matches) {
				const displayName = await userProfileCache.getDisplayName(score.userId)
				next.push({
					displayName: displayName,
					userId     : score.userId,
					achievedAt : Date.now(),
					frameCount : frameCount,
				})
			}

			return { entries: next }
		})
	}
}
