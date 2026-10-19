import { balls } from 'src/shared/data/unlocks/balls'
import { lanes } from 'src/shared/data/unlocks/lanes'
import { pins } from 'src/shared/data/unlocks/pins'
import { scoringAnimations } from 'src/shared/data/unlocks/scoringAnimations'
import { spotlightColors } from 'src/shared/data/unlocks/spotlightColors'
import { spotlightPatterns } from 'src/shared/data/unlocks/spotlightPatterns'
import { trails } from 'src/shared/data/unlocks/trails'
import { ItemRarity, UnlockMeta } from 'src/shared/data/unlocks/types'


/** Claw machine ticket prices. */
export const CLAW_TICKET_COSTS = [5, 10, 25, 100] as const

export type ClawTicketCost = typeof CLAW_TICKET_COSTS[number]


/** Store / display ticket cost by rarity. Defaults stay free via `defaultUnlocked`. */
export const RARITY_TICKET_COST: Record<ItemRarity, number> = {
	0: 10,
	1: 25,
	2: 50,
	3: 250,
}


/** Max rarity that can be bought from the customization screen. */
export const MAX_PURCHASABLE_RARITY: ItemRarity = 1


/**
 * Relative rarity weights per claw machine price.
 * Any machine can roll any rarity; higher prices skew toward higher rarities.
 */
export const CLAW_RARITY_WEIGHTS: Record<ClawTicketCost, Record<ItemRarity, number>> = {
	5  : { 0: 70, 1: 20, 2: 8,  3: 2  },
	10 : { 0: 45, 1: 35, 2: 15, 3: 5  },
	25 : { 0: 20, 1: 30, 2: 35, 3: 15 },
	100: { 0: 5,  1: 15, 2: 30, 3: 50 },
}


export type ClawPickResult =
	| { itemId: string }
	| { refund: true }


const CATALOGS: Record<string, UnlockMeta>[] = [
	balls,
	pins,
	lanes,
	scoringAnimations,
	spotlightPatterns,
	spotlightColors,
	trails,
]


// MARK: isClawTicketCost
/** True when `cost` is a valid claw machine price. */
export function isClawTicketCost(cost: number): cost is ClawTicketCost {
	return (CLAW_TICKET_COSTS as readonly number[]).includes(cost)
}


// MARK: isPurchasableRarity
/** True when the rarity can be bought from the customization screen. */
export function isPurchasableRarity(rarity: ItemRarity): boolean {
	return rarity <= MAX_PURCHASABLE_RARITY
}


// MARK: ticketCostForItem
/**
 * Store price for an item. Default-unlocked items are free; others use rarity cost.
 */
export function ticketCostForItem(
	rarity          : ItemRarity,
	defaultUnlocked : boolean,
): number {
	if (defaultUnlocked) return 0
	return RARITY_TICKET_COST[rarity]
}


// MARK: isOwnedInPool
function isOwnedInPool(
	id           : string,
	item         : UnlockMeta,
	ownedIds     : readonly string[],
): boolean {
	if (item.defaultUnlocked) return true
	return ownedIds.includes(id)
}


// MARK: getClawPoolEntries
/**
 * Enabled, non-default catalog rows eligible for claw rewards.
 */
export function getClawPoolEntries(): { id: string, rarity: ItemRarity }[] {
	const pool: { id: string, rarity: ItemRarity }[] = []
	for (const catalog of CATALOGS) {
		for (const [id, item] of Object.entries(catalog)) {
			if (item.disabled) continue
			if (item.defaultUnlocked) continue
			pool.push({ id, rarity: item.rarity })
		}
	}
	return pool
}


// MARK: pickWeightedRarity
/**
 * Samples a rarity from `weights`, skipping rarities with weight 0 or missing from `available`.
 */
function pickWeightedRarity(
	weights   : Record<ItemRarity, number>,
	available : ReadonlySet<ItemRarity>,
): ItemRarity | undefined {
	const rarities = ([0, 1, 2, 3] as ItemRarity[]).filter((r) => available.has(r) && weights[r] > 0)
	if (rarities.length === 0) return undefined

	let total = 0
	for (const r of rarities) total += weights[r]
	if (total <= 0) return undefined

	let roll = Math.random() * total
	for (const r of rarities) {
		roll -= weights[r]
		if (roll <= 0) return r
	}
	return rarities[rarities.length - 1]
}


// MARK: pickClawReward
/**
 * Picks an unowned claw-pool item using the machine's rarity weights.
 * Returns `{ refund: true }` when the player already owns the entire pool.
 */
export function pickClawReward(
	ownedIds   : readonly string[],
	ticketCost : ClawTicketCost,
): ClawPickResult {
	const unowned: { id: string, rarity: ItemRarity }[] = []
	for (const catalog of CATALOGS) {
		for (const [id, item] of Object.entries(catalog)) {
			if (item.disabled) continue
			if (item.defaultUnlocked) continue
			if (isOwnedInPool(id, item, ownedIds)) continue
			unowned.push({ id, rarity: item.rarity })
		}
	}
	if (unowned.length === 0) return { refund: true }

	const byRarity = new Map<ItemRarity, string[]>()
	for (const entry of unowned) {
		const list = byRarity.get(entry.rarity) ?? []
		list.push(entry.id)
		byRarity.set(entry.rarity, list)
	}

	const rarity = pickWeightedRarity(CLAW_RARITY_WEIGHTS[ticketCost], new Set(byRarity.keys()))
	if (rarity === undefined) return { refund: true }

	const ids = byRarity.get(rarity)
	if (!ids || ids.length === 0) return { refund: true }

	const index = Math.floor(Math.random() * ids.length)
	return { itemId: ids[index]! }
}
