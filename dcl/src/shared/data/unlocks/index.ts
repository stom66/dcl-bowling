import { balls } from "src/shared/data/unlocks/balls"
import { lanes } from "src/shared/data/unlocks/lanes"
import { pins } from "src/shared/data/unlocks/pins"
import { scoringAnimations } from "src/shared/data/unlocks/scoringAnimations"
import { spotlightColors } from "src/shared/data/unlocks/spotlightColors"
import { spotlightPatterns } from "src/shared/data/unlocks/spotlightPatterns"
import { trails } from "src/shared/data/unlocks/trails"
import { CatalogEntry, PlayerLoadoutState, ScoreKind, ScoringAnimationItem, UnlockMeta } from "src/shared/data/unlocks/types"


export const TICKETS_PER_COMPLETED_GAME = 5

export { balls } from "src/shared/data/unlocks/balls"
export { lanes } from "src/shared/data/unlocks/lanes"
export { pins } from "src/shared/data/unlocks/pins"
export { scoringAnimations } from "src/shared/data/unlocks/scoringAnimations"
export { spotlightColors } from "src/shared/data/unlocks/spotlightColors"
export { spotlightPatterns } from "src/shared/data/unlocks/spotlightPatterns"
export { trails } from "src/shared/data/unlocks/trails"
export type {
	BallItem,
	CatalogEntry,
	CatalogKind,
	LaneItem,
	PinItem,
	PlayerActivityState,
	PlayerLoadoutState,
	PlayerMatchSummary,
	PlayerStatsState,
	PlayerTicketsState,
	PlayerUnlocksState,
	ScoreKind,
	ScoringAnimationItem,
	SpotlightColorItem,
	SpotlightPatternItem,
	TrailItem,
	UnlockMeta,
} from "src/shared/data/unlocks/types"


const catalogs: Array<[CatalogEntry['kind'], Record<string, UnlockMeta>]> = [
	['ball',           balls],
	['pin',            pins],
	['lane',           lanes],
	['scoring',        scoringAnimations],
	['spotlight',      spotlightPatterns],
	['spotlightColor', spotlightColors],
	['trail',          trails],
]


assertUniqueIds()
assertDefaultFlags()


export const DEFAULT_BALL_ID             = firstDefaultEquippedId(balls)
export const DEFAULT_PIN_ID              = firstDefaultEquippedId(pins)
export const DEFAULT_LANE_ID             = firstDefaultEquippedId(lanes)
export const DEFAULT_TRAIL_ID            = firstDefaultEquippedId(trails)
export const DEFAULT_SPOTLIGHT_ID        = firstDefaultEquippedId(spotlightPatterns)
export const DEFAULT_SPOTLIGHT_COLOR_ID  = firstDefaultEquippedId(spotlightColors)


// MARK: firstDefaultEquippedId
/**
 * First catalog id with `defaultEquipped`, or the first key if none is marked.
 */
function firstDefaultEquippedId(catalog: Record<string, UnlockMeta>): string {
	for (const [id, item] of Object.entries(catalog)) {
		if (item.defaultEquipped) return id
	}

	const first = Object.keys(catalog)[0]
	if (!first) {
		console.error('unlocks: firstDefaultEquippedId: empty catalog')
		return ''
	}

	console.error('unlocks: firstDefaultEquippedId: no defaultEquipped, using', first)
	return first
}


// MARK: assertUniqueIds
function assertUniqueIds(): void {
	const seen = new Map<string, string>()
	for (const [kind, catalog] of catalogs) {
		for (const id of Object.keys(catalog)) {
			const previous = seen.get(id)
			if (previous) {
				console.error(`unlocks: assertUniqueIds: duplicate id "${id}" in ${kind} and ${previous}`)
			}
			seen.set(id, kind)
		}
	}
}


// MARK: assertDefaultFlags
/**
 * `defaultEquipped` requires `defaultUnlocked`. Ball, pin, lane, trail,
 * spotlight, and spotlightColor catalogs must mark exactly one starter item.
 */
function assertDefaultFlags(): void {
	for (const [kind, catalog] of catalogs) {
		const equippedIds: string[] = []
		for (const [id, item] of Object.entries(catalog)) {
			if (item.defaultEquipped && !item.defaultUnlocked) {
				console.error(`unlocks: assertDefaultFlags: "${id}" in ${kind} is defaultEquipped but not defaultUnlocked`)
			}
			if (item.defaultEquipped) equippedIds.push(id)
		}

		if (kind === 'scoring') {
			if (equippedIds.length === 0) {
				console.error('unlocks: assertDefaultFlags: scoring has no defaultEquipped item')
			}
			continue
		}

		if (equippedIds.length !== 1) {
			console.error(`unlocks: assertDefaultFlags: ${kind} needs exactly one defaultEquipped, found`, equippedIds)
		}
	}
}


// MARK: getCatalogEntry
/**
 * Looks up an unlock across all catalogs.
 */
export function getCatalogEntry(id: string): CatalogEntry | undefined {
	if (id in balls)              return { kind: 'ball',           item: balls[id]! }
	if (id in pins)               return { kind: 'pin',            item: pins[id]! }
	if (id in lanes)              return { kind: 'lane',           item: lanes[id]! }
	if (id in scoringAnimations)  return { kind: 'scoring',        item: scoringAnimations[id]! }
	if (id in spotlightPatterns)  return { kind: 'spotlight',      item: spotlightPatterns[id]! }
	if (id in spotlightColors)    return { kind: 'spotlightColor', item: spotlightColors[id]! }
	if (id in trails)             return { kind: 'trail',          item: trails[id]! }
	return undefined
}


export type CatalogEntryWithId = { id: string } & CatalogEntry


// MARK: getAllCatalogEntries
/**
 * Returns every catalog row paired with its id.
 */
export function getAllCatalogEntries(): CatalogEntryWithId[] {
	const entries: CatalogEntryWithId[] = []
	for (const [, catalog] of catalogs) {
		for (const id of Object.keys(catalog)) {
			const entry = getCatalogEntry(id)
			if (!entry) continue
			entries.push({ id, ...entry })
		}
	}
	return entries
}


// MARK: getDefaultUnlockedIds
/**
 * Returns every catalog id marked `defaultUnlocked`.
 */
export function getDefaultUnlockedIds(): string[] {
	const ids: string[] = []
	for (const [, catalog] of catalogs) {
		for (const [id, item] of Object.entries(catalog)) {
			if (item.defaultUnlocked) ids.push(id)
		}
	}
	return ids
}


// MARK: getDefaultScoringAnimIds
/**
 * Default equipped scoring animation ids (one per kind / pin-count).
 */
export function getDefaultScoringAnimIds(): string[] {
	const equipped = Object.entries(scoringAnimations)
		.filter(([, item]) => item.defaultEquipped)
		.map(([id]) => id)
	if (equipped.length > 0) return equipped

	return Object.entries(scoringAnimations)
		.filter(([, item]) => item.defaultUnlocked)
		.map(([id]) => id)
}


// MARK: getDefaultLoadout
/**
 * Starting loadout from each catalog's `defaultEquipped` rows.
 */
export function getDefaultLoadout(): PlayerLoadoutState {
	return {
		ballId           : DEFAULT_BALL_ID,
		pinId            : DEFAULT_PIN_ID,
		laneId           : DEFAULT_LANE_ID,
		trailId          : DEFAULT_TRAIL_ID,
		spotlightId      : DEFAULT_SPOTLIGHT_ID,
		spotlightColorId : DEFAULT_SPOTLIGHT_COLOR_ID,
		scoringAnimIds   : getDefaultScoringAnimIds(),
	}
}


// MARK: getBallModelSrc
/**
 * Resolves a ball GLTF path, falling back to the default ball.
 */
export function getBallModelSrc(ballId: string): string {
	return balls[ballId]?.modelSrc ?? balls[DEFAULT_BALL_ID]!.modelSrc
}


// MARK: getPinModelSrc
/**
 * Resolves a pin GLTF path, falling back to the default pin.
 */
export function getPinModelSrc(pinId: string): string {
	return pins[pinId]?.modelSrc ?? pins[DEFAULT_PIN_ID]!.modelSrc
}


// MARK: getLaneModelSrc
/**
 * Resolves a lane GLTF path, falling back to the default lane.
 */
export function getLaneModelSrc(laneId: string): string {
	return lanes[laneId]?.modelSrc ?? lanes[DEFAULT_LANE_ID]!.modelSrc
}


// MARK: getThumbSrc
/**
 * Resolves a catalog item's UI thumbnail path.
 */
export function getThumbSrc(itemId: string): string | undefined {
	return getCatalogEntry(itemId)?.item.thumbSrc
}


// MARK: scoringSlotKey
function scoringSlotKey(item: ScoringAnimationItem): string {
	if (item.scoreKind === 'number') return `number:${item.scoreValue ?? 0}`
	return item.scoreKind
}


// MARK: findScoringAnimation
/**
 * Picks an equipped scoring animation for a result, then catalog defaults.
 */
export function findScoringAnimation(
	scoringAnimIds: string[],
	scoreKind     : ScoreKind,
	scoreValue?   : number
): ScoringAnimationItem {
	const wantedKey = scoreKind === 'number' ? `number:${scoreValue ?? 0}` : scoreKind

	for (const id of scoringAnimIds) {
		const item = scoringAnimations[id]
		if (!item) continue
		if (scoringSlotKey(item) === wantedKey) return item
	}

	for (const item of Object.values(scoringAnimations)) {
		if (!item.defaultUnlocked) continue
		if (scoringSlotKey(item) === wantedKey) return item
	}

	return scoringAnimations['score-zero']!
}


// MARK: isItemOwned
/**
 * True when the id is unlocked or is a default-unlocked catalog row.
 */
export function isItemOwned(
	itemId      : string,
	unlockedIds : readonly string[]
): boolean {
	const entry = getCatalogEntry(itemId)
	if (!entry) return false
	if (entry.item.defaultUnlocked) return true
	return unlockedIds.includes(itemId)
}
