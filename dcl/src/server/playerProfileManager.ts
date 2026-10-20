import { ComponentManager } from "src/shared/components/componentManager"
import { ComponentStore } from "src/shared/components/componentStore"
import { PlayerActivity } from "src/shared/components/definitions/shared.playerActivity"
import { PlayerLoadout } from "src/shared/components/definitions/shared.playerLoadout"
import { PlayerPreferences, PlayerPreferencesState } from "src/shared/components/definitions/shared.playerPreferences"
import { PlayerRewards } from "src/shared/components/definitions/shared.playerRewards"
import { PlayerStats } from "src/shared/components/definitions/shared.playerStats"
import { PlayerTickets } from "src/shared/components/definitions/shared.playerTickets"
import { PlayerUnlocks } from "src/shared/components/definitions/shared.playerUnlocks"
import { PLAYERS_GROUP_ID } from "src/shared/components/registry"
import { normalizeEntityKey } from "src/shared/components/types"
import { buildGameTicketLines, sumTicketLines } from "src/shared/data/gameTickets"
import { DEFAULT_REWARD_BUTTON_LABEL, isRewardInWindow, isStreakRewardId, PendingRewardOffer, PlayerRewardsState, REWARDS, resolveRewardOffer, RewardPlayerContext } from "src/shared/data/rewards"
import {
	type CatalogKind,
	getCatalogEntry,
	getCatalogKindUnlockLabel,
	getDefaultLoadout,
	getDefaultScoringAnimIds,
	getDefaultUnlockedIds,
	isClawTicketCost,
	isItemOwned,
	isPurchasableRarity,
	pickClawReward,
} from "src/shared/data/unlocks"
import {
	PlayerActivityState,
	PlayerLoadoutState,
	PlayerMatchSummary,
	PlayerStatsState,
	PlayerTicketsState,
	PlayerUnlocksState,
	GameTicketLine,
	ScoringAnimationItem,
} from "src/shared/data/unlocks/types"
import { VERSION } from "src/shared/data/version"
import { canUsePlaytestDebug, getPerfectScore, isLocalDev, normalizeFrameCount } from "src/shared/settings"
import { PlayerBackedState } from "src/shared/storage/player.storageBackedState"
import { eventBus, ServerEvents } from "src/shared/utils/eventBus"


type PlayerSession = {
	userId       : string
	activity     : PlayerBackedState<PlayerActivityState>
	stats        : PlayerBackedState<PlayerStatsState>
	tickets      : PlayerBackedState<PlayerTicketsState>
	unlocks      : PlayerBackedState<PlayerUnlocksState>
	loadout      : PlayerBackedState<PlayerLoadoutState>
	preferences  : PlayerBackedState<PlayerPreferencesState>
	rewards      : PlayerBackedState<PlayerRewardsState>
}


export type PlayerGameCompleteResult = {
	userId         : string
	startedAt      : number
	durationMs     : number
	frameCount     : number
	score          : number
	won            : boolean
	strikeCount    : number
	spareCount     : number
	sharesTopScore : boolean
}


export type PlayerRollStatUpdate = {
	pins       : number
	isStrike   : boolean
	isSpare    : boolean
	gutterBall : boolean
}


const MS_PER_DAY        = 24 * 60 * 60 * 1000
const MATCH_HISTORY_CAP = 20


// MARK: sessionKey
/**
 * Case-folds player ids so net `context.from` matches `onEnterScene` wallets.
 */
function sessionKey(userId: string): string {
	return normalizeEntityKey(userId)
}


/**
 * Hydrates per-player storage into the `players` keyed group and handles
 * ticket / unlock / loadout / career-stat writes. Live state is ECS; storage is a checkpoint.
 */
export namespace PlayerProfileManager {

	const sessions = new Map<string, PlayerSession>()


	// MARK: getSession
	/**
	 * Finds a live session. Keys are case-folded so net `context.from`
	 * matches `onEnterScene` wallet casing.
	 */
	function getSession(userId: string): PlayerSession | undefined {
		if (!userId) return undefined
		return sessions.get(sessionKey(userId))
	}


	// MARK: init
	/**
	 * Subscribes to scene enter/leave. Call after ComponentStore.init.
	 */
	export function init(): void {
		console.log('PlayerProfileManager: init')

		eventBus.on(ServerEvents.PLAYER_SCENE_ENTER, (data: { player: { userId: string } }) => {
			void onEnter(data.player.userId)
		})
		eventBus.on(ServerEvents.PLAYER_SCENE_LEAVE, (data: { userId: string }) => {
			void onLeave(data.userId)
		})
	}


	// MARK: onEnter
	/**
	 * Creates the player entity, hydrates storage, and records an activity visit.
	 */
	export async function onEnter(userId: string): Promise<void> {
		if (!userId || getSession(userId)) return

		console.log('PlayerProfileManager: onEnter: userId', userId)

		ComponentManager.createGroupEntity(PLAYERS_GROUP_ID, userId)

		const session = createSession(userId)
		sessions.set(sessionKey(userId), session)

		await Promise.all([
			session.activity.init(),
			session.stats.init(),
			session.tickets.init(),
			session.unlocks.init(),
			session.preferences.init(),
			session.rewards.init(),
		])
		await session.loadout.init()

		seedGamesPlayedFromActivity(session)

		const now      = Date.now()
		const activity = session.activity.get()
		const visit    = applyVisit(activity, now)
		offerRewards(session, {
			userId  : session.userId,
			now,
			activity,
			visit,
			stats   : session.stats.get(),
			tickets : session.tickets.get(),
			unlocks : session.unlocks.get(),
			version : VERSION,
		})
		session.activity.update(() => visit)
		await session.activity.persist()
		await session.stats.persist()
		await session.rewards.persist()
	}


	// MARK: onLeave
	/**
	 * Persists dirty keys, then removes the synced player entity.
	 */
	export async function onLeave(userId: string): Promise<void> {
		const session = getSession(userId)
		if (!session) return

		console.log('PlayerProfileManager: onLeave: userId', userId)

		await Promise.all([
			session.activity.persist(),
			session.stats.persist(),
			session.tickets.persist(),
			session.unlocks.persist(),
			session.loadout.persist(),
			session.preferences.persist(),
			session.rewards.persist(),
		])

		ComponentManager.removeGroupEntity(PLAYERS_GROUP_ID, userId)
		sessions.delete(sessionKey(userId))
	}


	// MARK: recordRoll
	/**
	 * Increments career roll counters in memory. Persist on game complete or leave.
	 */
	export function recordRoll(
		userId : string,
		roll   : PlayerRollStatUpdate
	): void {
		const session = getSession(userId)
		if (!session) return

		const pins = Math.max(0, Math.floor(roll.pins))
		session.stats.update((state) => ({
			...state,
			rolledBalls       : state.rolledBalls + 1,
			pinsKnockedDown   : state.pinsKnockedDown + pins,
			rolledStrikes     : state.rolledStrikes + (roll.isStrike ? 1 : 0),
			rolledSpares      : state.rolledSpares + (roll.isSpare ? 1 : 0),
			rolledGutterBalls : state.rolledGutterBalls + (roll.gutterBall ? 1 : 0),
		}))
	}


	// MARK: recordGameCreated
	/**
	 * Increments gamesCreated and persists. Call when a player starts a new lane.
	 */
	export function recordGameCreated(userId: string): void {
		const session = getSession(userId)
		if (!session) return

		session.stats.update((state) => ({
			...state,
			gamesCreated: state.gamesCreated + 1,
		}))
		void session.stats.persist()
	}


	// MARK: recordLeaveEarly
	/**
	 * Increments gamesLeftEarly and persists. Call when a player leaves a live game.
	 */
	export function recordLeaveEarly(userId: string): void {
		const session = getSession(userId)
		if (!session) return

		session.stats.update((state) => ({
			...state,
			gamesLeftEarly: state.gamesLeftEarly + 1,
		}))
		void session.stats.persist()
	}


	// MARK: onGameComplete
	/**
	 * Records completed-game career stats, tickets, and activity. Call from lane endGame only.
	 */
	export function onGameComplete(results: PlayerGameCompleteResult[]): void {
		const today = utcDay(Date.now())

		for (const result of results) {
			const session = getSession(result.userId)
			if (!session) continue

			const firstGameToday = !session.stats.get().matches.some((match) => utcDay(match.startedAt) === today)
			const lines          = buildGameTicketLines({
				frameCount     : result.frameCount,
				sharesTopScore : result.sharesTopScore,
				strikeCount    : result.strikeCount,
				spareCount     : result.spareCount,
				firstGameToday : firstGameToday,
			})
			const total = sumTicketLines(lines)

			session.activity.update((state) => ({
				...state,
				gamesPlayed: state.gamesPlayed + 1,
			}))
			session.tickets.update((state) => ({
				...state,
				balance             : state.balance + total,
				lastPayoutStartedAt : result.startedAt,
				lastPayoutTotal     : total,
				lastPayoutLines     : lines,
			}))
			session.stats.update((state) => applyGameComplete(state, result))

			void session.activity.persist()
			void session.tickets.persist()
			void session.stats.persist()
			console.log('PlayerProfileManager: onGameComplete: userId', result.userId, 'tickets', total)
		}
	}


	// MARK: requestUnlockItem
	/**
	 * Spends tickets to unlock a catalog item the player does not already own,
	 * then equips that item.
	 */
	export async function requestUnlockItem(
		userId : string,
		itemId : string
	): Promise<void> {
		const session = getSession(userId)
		if (!session) {
			console.log('PlayerProfileManager: requestUnlockItem: no session', userId)
			return
		}

		const entry = getCatalogEntry(itemId)
		if (!entry) {
			console.log('PlayerProfileManager: requestUnlockItem: unknown item', itemId)
			return
		}

		if (entry.item.disabled) {
			console.log('PlayerProfileManager: requestUnlockItem: disabled item', itemId)
			return
		}

		if (!isPurchasableRarity(entry.item.rarity)) {
			console.log('PlayerProfileManager: requestUnlockItem: rarity not purchasable', itemId, entry.item.rarity)
			return
		}

		const unlocks = session.unlocks.get()
		if (isItemOwned(itemId, unlocks.unlockedItemIds)) {
			console.log('PlayerProfileManager: requestUnlockItem: already owned', itemId)
			return
		}

		const cost = entry.item.ticketCost
		if (session.tickets.get().balance < cost) {
			console.log('PlayerProfileManager: requestUnlockItem: not enough tickets', itemId, 'cost', cost)
			return
		}

		session.tickets.update((state) => ({
			...state,
			balance: state.balance - cost,
		}))

		try {
			await session.unlocks.updateAsync(async (state) => ({
				unlockedItemIds: [...state.unlockedItemIds, itemId],
			}))
		} catch (error) {
			void session.tickets.persist()
			console.error('PlayerProfileManager: requestUnlockItem: failed to unlock', itemId, 'for', userId, error)
			return
		}

		const scoring = entry.kind === 'scoring' ? entry.item : undefined
		session.loadout.update((state) => applyEquip(state, entry.kind, itemId, scoring))

		void session.tickets.persist()
		void session.unlocks.persist()
		void session.loadout.persist()
		console.log('PlayerProfileManager: requestUnlockItem: unlocked and equipped', itemId, 'for', userId)
	}


	// MARK: requestClawPlay
	/**
	 * Spends claw-machine tickets, rolls a weighted unowned unlock, and queues a reward popup.
	 * Refunds when the player already owns every claw-pool item.
	 */
	export function requestClawPlay(
		userId     : string,
		ticketCost : number,
	): { ok: boolean, ticketCost: number, itemId?: string, refunded?: boolean } {
		const session = getSession(userId)
		if (!session) {
			console.log('PlayerProfileManager: requestClawPlay: no session', userId)
			return { ok: false, ticketCost }
		}

		if (!isClawTicketCost(ticketCost)) {
			console.log('PlayerProfileManager: requestClawPlay: invalid ticketCost', ticketCost)
			return { ok: false, ticketCost }
		}

		const balance = session.tickets.get().balance
		if (balance < ticketCost) {
			console.log('PlayerProfileManager: requestClawPlay: not enough tickets', balance, ticketCost)
			return { ok: false, ticketCost }
		}

		session.tickets.update((state) => ({
			...state,
			balance: state.balance - ticketCost,
		}))

		const owned = session.unlocks.get().unlockedItemIds
		const pick  = pickClawReward(owned, ticketCost)
		if ('refund' in pick) {
			session.tickets.update((state) => ({
				...state,
				balance: state.balance + ticketCost,
			}))
			void session.tickets.persist()
			console.log('PlayerProfileManager: requestClawPlay: pool empty, refunded', userId, ticketCost)
			return { ok: true, ticketCost, refunded: true }
		}

		grantRewardUnlock(session, pick.itemId)

		const entry = getCatalogEntry(pick.itemId)
		const label = entry ? getCatalogKindUnlockLabel(entry.kind) : 'item'
		const offer: PendingRewardOffer = {
			id          : `claw-${Date.now()}-${pick.itemId}`,
			title       : 'You won a prize!',
			message     : `You unlocked a new ${label}!`,
			buttonLabel : DEFAULT_REWARD_BUTTON_LABEL,
			kind        : 'unlock',
			tickets     : 0,
			itemId      : pick.itemId,
		}

		session.rewards.update((state) => ({
			...state,
			pending: [...state.pending, offer],
		}))

		void session.tickets.persist()
		void session.unlocks.persist()
		void session.rewards.persist()
		console.log('PlayerProfileManager: requestClawPlay: won', pick.itemId, 'for', userId, 'cost', ticketCost)
		return { ok: true, ticketCost, itemId: pick.itemId }
	}


	// MARK: requestEquipItem
	/**
	 * Equips an owned catalog item onto the player's loadout.
	 */
	export function requestEquipItem(
		userId : string,
		itemId : string
	): void {
		const session = getSession(userId)
		if (!session) {
			console.log('PlayerProfileManager: requestEquipItem: no session', userId)
			return
		}

		const entry = getCatalogEntry(itemId)
		if (!entry) {
			console.log('PlayerProfileManager: requestEquipItem: unknown item', itemId)
			return
		}

		if (entry.item.disabled) {
			console.log('PlayerProfileManager: requestEquipItem: disabled item', itemId)
			return
		}

		if (!isItemOwned(itemId, session.unlocks.get().unlockedItemIds)) {
			console.log('PlayerProfileManager: requestEquipItem: not owned', itemId)
			return
		}

		const scoring = entry.kind === 'scoring' ? entry.item : undefined
		session.loadout.update((state) => applyEquip(state, entry.kind, itemId, scoring))
		void session.loadout.persist()
		console.log('PlayerProfileManager: requestEquipItem: equipped', itemId, 'for', userId)
	}


	// MARK: requestSetPreferences
	/**
	 * Merges client-sent preference fields into storage. Unknown or invalid
	 * fields are ignored so new settings can be added later without a migration.
	 */
	export function requestSetPreferences(
		userId       : string,
		preferences  : Partial<PlayerPreferencesState>
	): void {
		const session = getSession(userId)
		if (!session) {
			console.log('PlayerProfileManager: requestSetPreferences: no session', userId)
			return
		}

		session.preferences.update((state) => ({
			...state,
			bgmMuted       : typeof preferences.bgmMuted === 'boolean' ? preferences.bgmMuted : state.bgmMuted,
			bumpersEnabled : typeof preferences.bumpersEnabled === 'boolean' ? preferences.bumpersEnabled : state.bumpersEnabled,
		}))
		void session.preferences.persist()
		console.log('PlayerProfileManager: requestSetPreferences: bgmMuted', preferences.bgmMuted, 'bumpersEnabled', preferences.bumpersEnabled, 'for', userId)
	}


	// MARK: requestResetUnlocks
	/**
	 * Relocks purchased items and snaps the loadout back to defaults.
	 * Admins can always do this. Other players can when the playtest panel is on.
	 */
	export function requestResetUnlocks(userId: string): void {
		if (!canUsePlaytestDebug(userId)) {
			console.log('PlayerProfileManager: requestResetUnlocks: playtest debug disabled and not an admin', userId)
			return
		}

		const session = getSession(userId)
		if (!session) {
			console.log('PlayerProfileManager: requestResetUnlocks: no session', userId)
			return
		}

		const unlockedItemIds = getDefaultUnlockedIds()
		session.unlocks.update(() => ({ unlockedItemIds }))
		session.loadout.update((state) => normalizeLoadout(state, unlockedItemIds))

		void session.unlocks.persist()
		void session.loadout.persist()
		console.log('PlayerProfileManager: requestResetUnlocks: reset unlocks for', userId)
	}


	// MARK: requestAddTickets
	/**
	 * Applies `amount` to the player's balance. Negative amounts subtract.
	 * The balance cannot fall below zero.
	 * Admins can always do this. Other players can when the playtest panel is on.
	 */
	export function requestAddTickets(
		userId : string,
		amount : number
	): void {
		if (!canUsePlaytestDebug(userId)) {
			console.log('PlayerProfileManager: requestAddTickets: playtest debug disabled and not an admin', userId)
			return
		}

		const session = getSession(userId)
		if (!session) {
			console.log('PlayerProfileManager: requestAddTickets: no session', userId)
			return
		}

		const delta = Math.floor(amount)
		if (delta === 0) {
			console.log('PlayerProfileManager: requestAddTickets: invalid amount', amount)
			return
		}

		session.tickets.update((state) => ({
			...state,
			balance: Math.max(0, state.balance + delta),
		}))
		void session.tickets.persist()
		console.log('PlayerProfileManager: requestAddTickets: applied', delta, 'for', userId)
	}


	// MARK: requestClaimReward
	/**
	 * Grants the pending offer at the head of the queue when `rewardId` matches it.
	 * Tickets use the frozen amount. An unlock is added without equipping it.
	 */
	export function requestClaimReward(
		userId   : string,
		rewardId : string,
	): void {
		const session = getSession(userId)
		if (!session) {
			console.log('PlayerProfileManager: requestClaimReward: no session', userId)
			return
		}

		if (!rewardId) {
			console.log('PlayerProfileManager: requestClaimReward: missing rewardId', userId)
			return
		}

		session.rewards.update((state) => claimHeadOffer(session, state, rewardId))
		void session.rewards.persist()
	}


	// MARK: requestResetRewards
	/**
	 * Clears this player's saved rewards and builds the current offers again.
	 * Local development only. Also forgets the last played version so the
	 * version reward can be offered again.
	 */
	export function requestResetRewards(userId: string): void {
		if (!isLocalDev()) {
			console.log('PlayerProfileManager: requestResetRewards: not local dev', userId)
			return
		}

		const session = getSession(userId)
		if (!session) {
			console.log('PlayerProfileManager: requestResetRewards: no session', userId)
			return
		}

		const activity: PlayerActivityState = {
			...session.activity.get(),
			lastPlayedVersion: '',
		}
		session.activity.update(() => activity)
		session.rewards.update(() => createEmptyRewards())
		offerRewards(session, {
			userId  : session.userId,
			now     : Date.now(),
			activity,
			visit   : activity,
			stats   : session.stats.get(),
			tickets : session.tickets.get(),
			unlocks : session.unlocks.get(),
			version : VERSION,
		})
		void session.activity.persist()
		void session.rewards.persist()
		console.log('PlayerProfileManager: requestResetRewards: reset rewards for', userId)
	}


	// MARK: createSession
	function createSession(userId: string): PlayerSession {
		return {
			userId,
			activity: new PlayerBackedState<PlayerActivityState>({
				userId,
				key           : 'activity',
				legacyKey     : 'calendar',
				writeOnUpdate : false,
				createDefault : createEmptyActivity,
				normalize     : normalizeActivity,
				onPublish     : (state) => {
					ComponentStore.createOrReplace(PlayerActivity, state, { key: userId })
				},
			}),
			stats: new PlayerBackedState<PlayerStatsState>({
				userId,
				key           : 'stats',
				writeOnUpdate : false,
				createDefault : createEmptyStats,
				normalize     : normalizeStats,
				onPublish     : (state) => {
					ComponentStore.createOrReplace(PlayerStats, {
						...state,
						matches: state.matches.map((match) => ({ ...match })),
					}, { key: userId })
				},
			}),
			tickets: new PlayerBackedState<PlayerTicketsState>({
				userId,
				key           : 'tickets',
				writeOnUpdate : false,
				createDefault : createEmptyTickets,
				normalize     : normalizeTickets,
				onPublish     : (state) => {
					ComponentStore.createOrReplace(PlayerTickets, {
						...state,
						lastPayoutLines: state.lastPayoutLines.map((line) => ({ ...line })),
					}, { key: userId })
				},
			}),
			unlocks: new PlayerBackedState<PlayerUnlocksState>({
				userId,
				key           : 'unlocks',
				writeOnUpdate : false,
				createDefault : () => ({ unlockedItemIds: getDefaultUnlockedIds() }),
				normalize     : normalizeUnlocks,
				onPublish     : (state) => {
					ComponentStore.createOrReplace(PlayerUnlocks, {
						unlockedItemIds: [...state.unlockedItemIds],
					}, { key: userId })
				},
			}),
			loadout: new PlayerBackedState<PlayerLoadoutState>({
				userId,
				key           : 'loadout',
				writeOnUpdate : false,
				createDefault : getDefaultLoadout,
				normalize     : (raw) => normalizeLoadout(raw, getSession(userId)?.unlocks.get().unlockedItemIds),
				onPublish     : (state) => {
					ComponentStore.createOrReplace(PlayerLoadout, {
						...state,
						scoringAnimIds: [...state.scoringAnimIds],
					}, { key: userId })
				},
			}),
			preferences: new PlayerBackedState<PlayerPreferencesState>({
				userId,
				key           : 'preferences',
				writeOnUpdate : false,
				createDefault : createEmptyPreferences,
				normalize     : normalizePreferences,
				onPublish     : (state) => {
					ComponentStore.createOrReplace(PlayerPreferences, state, { key: userId })
				},
			}),
			rewards: new PlayerBackedState<PlayerRewardsState>({
				userId,
				key           : 'rewards',
				writeOnUpdate : false,
				createDefault : createEmptyRewards,
				normalize     : normalizeRewards,
				onPublish     : (state) => {
					ComponentStore.createOrReplace(PlayerRewards, {
						redeemedIds : [...state.redeemedIds],
						pending     : state.pending.map((offer) => ({
							...offer,
							message: offer.message ?? '',
						})),
					}, { key: userId })
				},
			}),
		}
	}
}


// MARK: createEmptyActivity
function createEmptyActivity(): PlayerActivityState {
	return {
		firstPlayedAt     : 0,
		lastPlayedAt      : 0,
		lastPlayedVersion : '',
		currentStreak     : 0,
		maxStreak         : 0,
		sessions          : 0,
		gamesPlayed       : 0,
	}
}


// MARK: createEmptyStats
function createEmptyStats(): PlayerStatsState {
	return {
		gamesCreated      : 0,
		gamesPlayed       : 0,
		gamesWon          : 0,
		gamesLost         : 0,
		gamesLeftEarly    : 0,
		rolledBalls       : 0,
		rolledStrikes     : 0,
		rolledSpares      : 0,
		rolledGutterBalls : 0,
		pinsKnockedDown   : 0,
		perfectGames      : 0,
		matches           : [],
	}
}


// MARK: createEmptyTickets
function createEmptyTickets(): PlayerTicketsState {
	return {
		balance             : 0,
		lastPayoutStartedAt : 0,
		lastPayoutTotal     : 0,
		lastPayoutLines     : [],
	}
}



// MARK: createEmptyPreferences
function createEmptyPreferences(): PlayerPreferencesState {
	return {
		bgmMuted       : false,
		bumpersEnabled : false,
	}
}



// MARK: createEmptyRewards
function createEmptyRewards(): PlayerRewardsState {
	return {
		redeemedIds : [],
		pending     : [],
	}
}


// MARK: seedGamesPlayedFromActivity
/**
 * Copies activity.gamesPlayed onto empty career stats so completed-game count is not reset.
 */
function seedGamesPlayedFromActivity(session: PlayerSession): void {
	const stats    = session.stats.get()
	const activity = session.activity.get()
	if (stats.gamesPlayed !== 0 || activity.gamesPlayed <= 0) return
	if (!isEmptyCareerCounters(stats)) return

	session.stats.update((state) => ({
		...state,
		gamesPlayed: activity.gamesPlayed,
	}))
}


// MARK: isEmptyCareerCounters
function isEmptyCareerCounters(state: PlayerStatsState): boolean {
	return (
		state.gamesCreated         === 0
		&& state.gamesPlayed       === 0
		&& state.gamesWon          === 0
		&& state.gamesLost         === 0
		&& state.gamesLeftEarly    === 0
		&& state.rolledBalls       === 0
		&& state.rolledStrikes     === 0
		&& state.rolledSpares      === 0
		&& state.rolledGutterBalls === 0
		&& state.pinsKnockedDown   === 0
		&& state.perfectGames      === 0
		&& state.matches.length    === 0
	)
}


// MARK: applyGameComplete
function applyGameComplete(
	state  : PlayerStatsState,
	result : PlayerGameCompleteResult
): PlayerStatsState {
	const frameCount = normalizeFrameCount(result.frameCount)
	const score      = Math.max(0, Math.floor(result.score))
	const perfect    = score === getPerfectScore(frameCount)
	const match: PlayerMatchSummary = {
		startedAt  : result.startedAt,
		durationMs : Math.max(0, Math.floor(result.durationMs)),
		frameCount : frameCount,
		score      : score,
		won        : result.won,
	}

	return {
		...state,
		gamesPlayed  : state.gamesPlayed + 1,
		gamesWon     : state.gamesWon + (result.won ? 1 : 0),
		gamesLost    : state.gamesLost + (result.won ? 0 : 1),
		perfectGames : state.perfectGames + (perfect ? 1 : 0),
		matches      : [match, ...state.matches].slice(0, MATCH_HISTORY_CAP),
	}
}


// MARK: utcDay
function utcDay(ms: number): number {
	return Math.floor(ms / MS_PER_DAY)
}


// MARK: applyVisit
function applyVisit(
	state : PlayerActivityState,
	now   : number
): PlayerActivityState {
	const next: PlayerActivityState = {
		...state,
		sessions          : state.sessions + 1,
		lastPlayedVersion : VERSION,
	}

	if (!state.firstPlayedAt) {
		next.firstPlayedAt = now
		next.currentStreak = 1
		next.maxStreak     = 1
		next.lastPlayedAt  = now
		return next
	}

	const today   = utcDay(now)
	const lastDay = utcDay(state.lastPlayedAt)
	if (today === lastDay) {
		next.lastPlayedAt = now
		return next
	}

	next.currentStreak = today === lastDay + 1 ? state.currentStreak + 1 : 1
	next.maxStreak     = Math.max(state.maxStreak, next.currentStreak)
	next.lastPlayedAt  = now
	return next
}


// MARK: asRecord
function asRecord(raw: unknown): Record<string, unknown> {
	if (raw && typeof raw === 'object') return raw as Record<string, unknown>
	return {}
}


// MARK: asNumber
function asNumber(
	value    : unknown,
	fallback : number
): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}


// MARK: asString
function asString(
	value    : unknown,
	fallback : string
): string {
	return typeof value === 'string' && value !== '' ? value : fallback
}


// MARK: asBoolean
function asBoolean(
	value    : unknown,
	fallback : boolean
): boolean {
	return typeof value === 'boolean' ? value : fallback
}


// MARK: asStringArray
function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value.filter((entry): entry is string => typeof entry === 'string' && entry !== '')
}


// MARK: normalizeActivity
function normalizeActivity(raw: unknown): PlayerActivityState {
	const data         = asRecord(raw)
	const lastPlayedAt = asNumber(data.lastPlayedAt, 0)
	const hasSessions  = typeof data.sessions === 'number' && Number.isFinite(data.sessions)
	let sessions       = hasSessions ? Math.max(0, Math.floor(data.sessions as number)) : 0
	if (!hasSessions && lastPlayedAt > 0) sessions = 1

	return {
		firstPlayedAt     : asNumber(data.firstPlayedAt, 0),
		lastPlayedAt      : lastPlayedAt,
		lastPlayedVersion : typeof data.lastPlayedVersion === 'string' ? data.lastPlayedVersion : '',
		currentStreak     : asNumber(data.currentStreak, 0),
		maxStreak         : asNumber(data.maxStreak, 0),
		sessions          : sessions,
		gamesPlayed       : asNumber(data.gamesPlayed, 0),
	}
}


// MARK: normalizeStats
function normalizeStats(raw: unknown): PlayerStatsState {
	const data = asRecord(raw)
	return {
		gamesCreated      : Math.max(0, Math.floor(asNumber(data.gamesCreated, 0))),
		gamesPlayed       : Math.max(0, Math.floor(asNumber(data.gamesPlayed, 0))),
		gamesWon          : Math.max(0, Math.floor(asNumber(data.gamesWon, 0))),
		gamesLost         : Math.max(0, Math.floor(asNumber(data.gamesLost, 0))),
		gamesLeftEarly    : Math.max(0, Math.floor(asNumber(data.gamesLeftEarly, 0))),
		rolledBalls       : Math.max(0, Math.floor(asNumber(data.rolledBalls, 0))),
		rolledStrikes     : Math.max(0, Math.floor(asNumber(data.rolledStrikes, 0))),
		rolledSpares      : Math.max(0, Math.floor(asNumber(data.rolledSpares, 0))),
		rolledGutterBalls : Math.max(0, Math.floor(asNumber(data.rolledGutterBalls, 0))),
		pinsKnockedDown   : Math.max(0, Math.floor(asNumber(data.pinsKnockedDown, 0))),
		perfectGames      : Math.max(0, Math.floor(asNumber(data.perfectGames, 0))),
		matches           : normalizeMatches(data.matches),
	}
}


// MARK: normalizeMatches
function normalizeMatches(value: unknown): PlayerMatchSummary[] {
	if (!Array.isArray(value)) return []

	const matches: PlayerMatchSummary[] = []
	for (const entry of value) {
		const data = asRecord(entry)
		matches.push({
			startedAt  : asNumber(data.startedAt, 0),
			durationMs : Math.max(0, Math.floor(asNumber(data.durationMs, 0))),
			frameCount : Math.max(0, Math.floor(asNumber(data.frameCount, 0))),
			score      : Math.max(0, Math.floor(asNumber(data.score, 0))),
			won        : asBoolean(data.won, false),
		})
		if (matches.length >= MATCH_HISTORY_CAP) break
	}
	return matches
}


// MARK: normalizeTickets
function normalizeTickets(raw: unknown): PlayerTicketsState {
	const data = asRecord(raw)
	return {
		balance             : Math.max(0, Math.floor(asNumber(data.balance, 0))),
		lastPayoutStartedAt : asNumber(data.lastPayoutStartedAt, 0),
		lastPayoutTotal     : Math.max(0, Math.floor(asNumber(data.lastPayoutTotal, 0))),
		lastPayoutLines     : normalizeTicketLines(data.lastPayoutLines),
	}
}



// MARK: normalizeTicketLines
function normalizeTicketLines(value: unknown): GameTicketLine[] {
	if (!Array.isArray(value)) return []

	const lines: GameTicketLine[] = []
	for (const entry of value) {
		const data  = asRecord(entry)
		const label = typeof data.label === 'string' ? data.label : ''
		if (!label) continue
		lines.push({
			label,
			count   : Math.max(0, Math.floor(asNumber(data.count, 0))),
			tickets : Math.max(0, Math.floor(asNumber(data.tickets, 0))),
		})
	}
	return lines
}



// MARK: normalizeRewards
function normalizeRewards(raw: unknown): PlayerRewardsState {
	const data = asRecord(raw)
	return {
		redeemedIds : asStringArray(data.redeemedIds),
		pending     : normalizePendingOffers(data.pending),
	}
}



// MARK: normalizePendingOffers
function normalizePendingOffers(value: unknown): PendingRewardOffer[] {
	if (!Array.isArray(value)) return []

	const offers: PendingRewardOffer[] = []
	for (const entry of value) {
		const data = asRecord(entry)
		const id   = typeof data.id === 'string' ? data.id : ''
		if (!id) continue
		const message = typeof data.message === 'string' ? data.message : ''
		const offer: PendingRewardOffer = {
			id,
			title       : typeof data.title === 'string' ? data.title : '',
			buttonLabel : typeof data.buttonLabel === 'string' && data.buttonLabel !== ''
				? data.buttonLabel
				: 'Thanks!',
			kind        : data.kind === 'unlock' ? 'unlock' : 'tickets',
			tickets     : Math.max(0, Math.floor(asNumber(data.tickets, 0))),
			itemId      : typeof data.itemId === 'string' ? data.itemId : '',
		}
		if (message !== '') offer.message = message
		offers.push(offer)
	}
	return offers
}



// MARK: offerRewards
/**
 * Drops pending offers that left the catalog, then appends newly eligible ones.
 * A missed day clears redeemed streak rewards so that climb can pay again.
 */
function offerRewards(
	session : PlayerSession,
	player  : RewardPlayerContext,
): void {
	const streakReset = player.activity.firstPlayedAt > 0
		&& player.visit.currentStreak === 1
		&& utcDay(player.now) !== utcDay(player.activity.lastPlayedAt)

	session.rewards.update((state) => {
		const catalogIds  = new Set(REWARDS.map((reward) => reward.id))
		const pending     = state.pending.filter((offer) => catalogIds.has(offer.id))
		const pendingIds  = new Set(pending.map((offer) => offer.id))
		const redeemedIds = streakReset
			? state.redeemedIds.filter((id) => !isStreakRewardId(id))
			: state.redeemedIds
		const redeemed    = new Set(redeemedIds)

		for (let i = 0; i < pending.length; i++) {
			const reward = REWARDS.find((entry) => entry.id === pending[i].id)
			if (!reward) continue
			const fresh = resolveRewardOffer(reward, player)
			pending[i] = {
				...pending[i],
				title       : fresh.title,
				message     : fresh.message,
				buttonLabel : fresh.buttonLabel,
			}
		}

		for (const reward of REWARDS) {
			if (redeemed.has(reward.id) || pendingIds.has(reward.id)) continue
			if (!isRewardInWindow(reward, player.now)) continue
			if (!reward.isEligible(player)) continue

			pending.push(resolveRewardOffer(reward, player))
			pendingIds.add(reward.id)
		}

		return {
			redeemedIds,
			pending,
		}
	})
}



// MARK: claimHeadOffer
/**
 * Grants `rewardId` only when it is the first pending offer.
 */
function claimHeadOffer(
	session  : PlayerSession,
	state    : PlayerRewardsState,
	rewardId : string,
): PlayerRewardsState {
	const head = state.pending[0]
	if (!head || head.id !== rewardId) {
		console.log('PlayerProfileManager: requestClaimReward: not the pending offer', rewardId)
		return state
	}

	if (head.kind === 'tickets') {
		const amount = Math.max(0, Math.floor(head.tickets))
		session.tickets.update((tickets) => ({
			...tickets,
			balance: tickets.balance + amount,
		}))
		void session.tickets.persist()
	}

	if (head.kind === 'unlock' && head.itemId) {
		grantRewardUnlock(session, head.itemId)
	}

	console.log('PlayerProfileManager: requestClaimReward: claimed', head.id, 'for', session.userId)
	return {
		redeemedIds : state.redeemedIds.includes(head.id) ? state.redeemedIds : [...state.redeemedIds, head.id],
		pending     : state.pending.slice(1),
	}
}



// MARK: grantRewardUnlock
/**
 * Adds a catalog item from a reward without equipping it.
 */
function grantRewardUnlock(
	session : PlayerSession,
	itemId  : string,
): void {
	const entry = getCatalogEntry(itemId)
	if (!entry) {
		console.log('PlayerProfileManager: requestClaimReward: unknown unlock', itemId)
		return
	}

	if (isItemOwned(itemId, session.unlocks.get().unlockedItemIds)) {
		console.log('PlayerProfileManager: requestClaimReward: already owned', itemId)
		return
	}

	session.unlocks.update((state) => ({
		unlockedItemIds: [...state.unlockedItemIds, itemId],
	}))
	void session.unlocks.persist()
}


// MARK: normalizePreferences
function normalizePreferences(raw: unknown): PlayerPreferencesState {
	const data = asRecord(raw)
	return {
		bgmMuted       : asBoolean(data.bgmMuted, false),
		bumpersEnabled : asBoolean(data.bumpersEnabled, false),
	}
}


// MARK: normalizeUnlocks
function normalizeUnlocks(raw: unknown): PlayerUnlocksState {
	const data   = asRecord(raw)
	const stored = asStringArray(data.unlockedItemIds)
	const merged = new Set<string>(getDefaultUnlockedIds())
	for (const id of stored) {
		if (getCatalogEntry(id)) merged.add(id)
	}
	return { unlockedItemIds: [...merged] }
}


// MARK: normalizeLoadout
function normalizeLoadout(
	raw          : unknown,
	unlockedIds? : string[]
): PlayerLoadoutState {
	const defaults = getDefaultLoadout()
	const data     = asRecord(raw)
	const owned    = unlockedIds ?? getDefaultUnlockedIds()

	return {
		ballId           : pickOwnedId(asString(data.ballId, defaults.ballId), owned, defaults.ballId),
		pinId            : pickOwnedId(asString(data.pinId, defaults.pinId), owned, defaults.pinId),
		laneId           : pickOwnedId(asString(data.laneId, defaults.laneId), owned, defaults.laneId),
		trailId          : pickOwnedId(asString(data.trailId, defaults.trailId), owned, defaults.trailId),
		spotlightId      : pickOwnedId(asString(data.spotlightId, defaults.spotlightId), owned, defaults.spotlightId),
		spotlightColorId : pickOwnedId(asString(data.spotlightColorId, defaults.spotlightColorId), owned, defaults.spotlightColorId),
		scoringAnimIds   : normalizeScoringAnimIds(asStringArray(data.scoringAnimIds), owned),
	}
}


// MARK: pickOwnedId
function pickOwnedId(
	id       : string,
	owned    : string[],
	fallback : string
): string {
	if (getCatalogEntry(id) && isItemOwned(id, owned)) return id
	return fallback
}


// MARK: normalizeScoringAnimIds
function normalizeScoringAnimIds(
	stored : string[],
	owned  : string[]
): string[] {
	const bySlot = new Map<string, string>()
	for (const id of getDefaultScoringAnimIds()) {
		const entry = getCatalogEntry(id)
		if (entry?.kind !== 'scoring') continue
		bySlot.set(scoringSlotKey(entry.item), id)
	}
	for (const id of stored) {
		const entry = getCatalogEntry(id)
		if (entry?.kind !== 'scoring') continue
		if (!isItemOwned(id, owned)) continue
		bySlot.set(scoringSlotKey(entry.item), id)
	}
	return [...bySlot.values()]
}


// MARK: scoringSlotKey
function scoringSlotKey(item: ScoringAnimationItem): string {
	if (item.scoreKind === 'number') return `number:${item.scoreValue ?? 0}`
	return item.scoreKind
}


// MARK: applyEquip
function applyEquip(
	state    : PlayerLoadoutState,
	kind     : CatalogKind,
	itemId   : string,
	scoring? : ScoringAnimationItem
): PlayerLoadoutState {
	if (kind === 'ball')           return { ...state, ballId: itemId }
	if (kind === 'pin')            return { ...state, pinId: itemId }
	if (kind === 'lane')           return { ...state, laneId: itemId }
	if (kind === 'trail')          return { ...state, trailId: itemId }
	if (kind === 'spotlight')      return { ...state, spotlightId: itemId }
	if (kind === 'spotlightColor') return { ...state, spotlightColorId: itemId }
	if (kind === 'scoring' && scoring) {
		const slot = scoringSlotKey(scoring)
		const next = state.scoringAnimIds.filter((id) => {
			const entry = getCatalogEntry(id)
			if (entry?.kind !== 'scoring') return true
			return scoringSlotKey(entry.item) !== slot
		})
		next.push(itemId)
		return { ...state, scoringAnimIds: next }
	}
	return state
}
