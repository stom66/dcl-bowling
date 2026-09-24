/**
 * Pin index neighbors in the rack. Index 0 is the head pin (pin 1).
 * Two pins are adjacent when they touch:
 * 1-2, 1-3, 2-3, 2-4, 2-5, 3-5, 3-6, 4-5, 4-7, 4-8, 5-6, 5-8, 5-9,
 * 6-9, 6-10, 7-8, 8-9, 9-10.
 */
const PIN_ADJACENCY: readonly (readonly number[])[] = [
	[1, 2],
	[0, 2, 3, 4],
	[0, 1, 4, 5],
	[1, 4, 6, 7],
	[1, 2, 3, 5, 7, 8],
	[2, 4, 8, 9],
	[3, 7],
	[3, 4, 6, 8],
	[4, 5, 7, 9],
	[5, 8],
]

const PIN_COUNT = PIN_ADJACENCY.length

/** Pins 4, 6, 7, and 10. */
const BIG_FOUR_LEAVE = leaveFromPinNumbers([4, 6, 7, 10])



// MARK: pinStatesToLeaveBitmask
/**
 * Encodes standing pins as a bitmask. Bit `n` means pin `n + 1` is standing.
 */
export function pinStatesToLeaveBitmask(pinStanding: boolean[]): number {
	let leave   = 0
	const count = Math.min(pinStanding.length, PIN_COUNT)
	for (let index = 0; index < count; index++) {
		if (pinStanding[index]) leave |= 1 << index
	}
	return leave
}



// MARK: isSplitLeave
/**
 * True when the head pin is down and the standing pins form two or more
 * groups that do not touch. A missing or all-down leave is not a split.
 */
export function isSplitLeave(leave: number): boolean {
	if ((leave & 1) !== 0) return false

	const standing = standingPinIndexes(leave)
	if (standing.length < 2) return false

	return countGroups(standing) >= 2
}



// MARK: splitLabel
/**
 * A short name for a split leave. The big four is named; every other split
 * is the standing pin numbers, such as "7-10". Undefined when the leave is not a split.
 */
export function splitLabel(leave: number): string | undefined {
	if (!isSplitLeave(leave)) return undefined
	if (leave === BIG_FOUR_LEAVE) return 'big four'
	return standingPinIndexes(leave).map((index) => index + 1).join('-')
}



// MARK: leaveFromPinNumbers
/**
 * Bitmask for 1-based pin numbers.
 */
function leaveFromPinNumbers(pinNumbers: readonly number[]): number {
	let leave = 0
	for (const pinNumber of pinNumbers) {
		leave |= 1 << (pinNumber - 1)
	}
	return leave
}



// MARK: standingPinIndexes
/**
 * Standing pin indexes (0-based) in rack order.
 */
function standingPinIndexes(leave: number): number[] {
	const pins: number[] = []
	for (let index = 0; index < PIN_COUNT; index++) {
		if ((leave & (1 << index)) !== 0) pins.push(index)
	}
	return pins
}



// MARK: countGroups
/**
 * Connected components among standing pins, using {@link PIN_ADJACENCY}.
 */
function countGroups(standing: readonly number[]): number {
	const standingSet = new Set(standing)
	const seen        = new Set<number>()
	let groups        = 0

	for (const start of standing) {
		if (seen.has(start)) continue
		groups += 1
		const stack = [start]
		seen.add(start)

		while (stack.length > 0) {
			const pin = stack.pop()
			if (pin === undefined) break
			const neighbors = PIN_ADJACENCY[pin]
			if (!neighbors) continue
			for (const neighbor of neighbors) {
				if (!standingSet.has(neighbor) || seen.has(neighbor)) continue
				seen.add(neighbor)
				stack.push(neighbor)
			}
		}
	}

	return groups
}
