/**
 * Shared catalog meta. The object key in each catalog file is the item id.
 * `defaultUnlocked` grants the item at start. `defaultEquipped` puts it on
 * the starting loadout (one per kind, except scoring which uses one per slot).
 * `disabled` hides the item from customization and blocks new unlocks/equips.
 */
export type UnlockMeta = {
	name            : string
	description     : string
	ticketCost      : number
	defaultUnlocked : boolean
	defaultEquipped : boolean
	disabled?       : boolean
	thumbSrc        : string
}


/**
 * Scoring celebration kind. `number` is pins-down 1..9 (`scoreValue`).
 */
export type ScoreKind = 'strike' | 'spare' | 'gutter' | 'zero' | 'split' | 'badger' | 'number'


export type BallItem = UnlockMeta & {
	modelSrc: string
}


export type PinItem = UnlockMeta & {
	modelSrc: string
}


export type LaneItem = UnlockMeta & {
	modelSrc: string
}


export type ScoringAnimationItem = UnlockMeta & {
	scoreKind : ScoreKind
	modelSrc  : string
	clipName  : string
	scoreValue?: number
}


export type SpotlightPatternItem = UnlockMeta & {
	maskSrc?   : string
	color      : { r: number, g: number, b: number }
	intensity  : number
	innerAngle : number
	outerAngle : number
	range?     : number
	shadow     : boolean
}


export type SpotlightColorItem = UnlockMeta & {
	color: { r: number, g: number, b: number }
}


export type TrailItem = UnlockMeta & {
	emitter?: object
}


export type CatalogKind = 'ball' | 'pin' | 'lane' | 'scoring' | 'spotlight' | 'spotlightColor' | 'trail'


export type CatalogEntry =
	| { kind: 'ball',           item: BallItem }
	| { kind: 'pin',            item: PinItem }
	| { kind: 'lane',           item: LaneItem }
	| { kind: 'scoring',        item: ScoringAnimationItem }
	| { kind: 'spotlight',      item: SpotlightPatternItem }
	| { kind: 'spotlightColor', item: SpotlightColorItem }
	| { kind: 'trail',          item: TrailItem }


export type PlayerLoadoutState = {
	ballId           : string
	pinId            : string
	laneId           : string
	trailId          : string
	spotlightId      : string
	spotlightColorId : string
	scoringAnimIds   : string[]
}


export type PlayerActivityState = {
	firstPlayedAt : number
	lastPlayedAt  : number
	currentStreak : number
	maxStreak     : number
	gamesPlayed   : number
}


export type PlayerMatchSummary = {
	startedAt  : number
	durationMs : number
	frameCount : number
	score      : number
	won        : boolean
}


export type PlayerStatsState = {
	gamesCreated      : number
	gamesPlayed       : number
	gamesWon          : number
	gamesLost         : number
	gamesLeftEarly    : number
	rolledBalls       : number
	rolledStrikes     : number
	rolledSpares      : number
	rolledGutterBalls : number
	pinsKnockedDown   : number
	perfectGames      : number
	matches           : PlayerMatchSummary[]
}


export type PlayerTicketsState = {
	balance: number
}


export type PlayerUnlocksState = {
	unlockedItemIds: string[]
}
