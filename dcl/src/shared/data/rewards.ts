import { getSpecialPlayerName, isPlaytester } from "src/shared/data/playerGroups"
import { PlayerActivityState, PlayerStatsState, PlayerTicketsState, PlayerUnlocksState } from "src/shared/data/unlocks/types"
import { VERSION } from "src/shared/data/version"


/** Open-ended rewards use this end date. Year 4000. */
export const REWARD_ENDS_OPEN = Date.UTC(4000, 0, 1)

export const DEFAULT_REWARD_BUTTON_LABEL = 'Yes! I won!'

const STREAK_DAY_FIRST           = 2
const STREAK_DAY_LAST            = 100
const STREAK_REWARD_PREFIX       = 'streak-day-'
const WELCOME_TICKETS            = 20
const UPDATE_TICKETS             = 5
const PLAYTESTER_SPECIAL_TICKETS = 10
const SPECIAL_PLAYER_TICKETS     = 25


export type RewardPlayerContext = {
	userId   : string
	now      : number
	activity : PlayerActivityState
	visit    : PlayerActivityState
	stats    : PlayerStatsState
	tickets  : PlayerTicketsState
	unlocks  : PlayerUnlocksState
	version  : string
}


export type RewardGrant =
	| { type: 'tickets', amount: number }
	| { type: 'ticketsPerPriorGame', perGame: number, minimum: number }
	| { type: 'unlock', itemId: string }


export type RewardDefinition = {
	id           : string
	title        : string
	/** Optional body copy. Omit for unlock popups that only need a title and grant. */
	message?     : string
	buttonLabel? : string
	startsAt     : number
	endsAt       : number
	isEligible   : (player: RewardPlayerContext) => boolean
	reward       : RewardGrant | ((player: RewardPlayerContext) => RewardGrant)
}


export type PendingRewardOffer = {
	id          : string
	title       : string
	message?    : string
	buttonLabel : string
	kind        : 'tickets' | 'unlock'
	tickets     : number
	itemId      : string
}


export type PlayerRewardsState = {
	redeemedIds : string[]
	pending     : PendingRewardOffer[]
}


export const REWARDS: RewardDefinition[] = [
	{
		id         : 'welcome-to-fastlane',
		title      : 'Welcome to Fastlane!',
		message    : 'Congrats on your first visit! Here are {tickets} tickets to get you going.',
		startsAt   : 0,
		endsAt     : REWARD_ENDS_OPEN,
		isEligible : (player) => player.activity.firstPlayedAt === 0,
		reward     : { type: 'tickets', amount: WELCOME_TICKETS },
		buttonLabel: 'Let\'s bowl!',
	},
	{
		id         : 'longterm-player-special',
		title      : 'The {name} Special',
		message    : '{Name}, you\'ve been here since the beginning. As a reward, you get bonus tickets!',
		startsAt   : 0,
		endsAt     : REWARD_ENDS_OPEN,
		isEligible : (player) => getSpecialPlayerName(player.userId) !== undefined,
		reward     : { type: 'tickets', amount: SPECIAL_PLAYER_TICKETS },
		buttonLabel: 'I deserve this!',
	},
	{
		id         : 'playtester-special',
		title      : 'Playtester Special',
		message    : 'Thanks for playtesting! You\'ve been gifted {tickets} tickets.',
		startsAt   : 0,
		endsAt     : REWARD_ENDS_OPEN,
		isEligible : (player) => isPlaytester(player.userId),
		reward     : { type: 'tickets', amount: PLAYTESTER_SPECIAL_TICKETS },
		buttonLabel: 'I helped!',
	},
	{
		id         : `update-${VERSION}`,
		title      : 'There\'s been an update!',
		message    : 'Welcome back! The game has been updated since your last visit. To celebrate, you\'ve been gifted {tickets} tickets!',
		startsAt   : 0,
		endsAt     : REWARD_ENDS_OPEN,
		isEligible : (player) => player.activity.lastPlayedAt > 0 && player.activity.lastPlayedVersion !== player.version,
		reward     : { type: 'tickets', amount: UPDATE_TICKETS },
		buttonLabel: 'I love updates!',
	},
	...streakDayRewards(),
]



// MARK: streakDayRewards
/**
 * One ticket per streak day, from day 2 through day 100.
 * Day 100 tells the player that login rewards stop until the streak resets.
 */
function streakDayRewards(): RewardDefinition[] {
	const rewards: RewardDefinition[] = []
	for (let day = STREAK_DAY_FIRST; day <= STREAK_DAY_LAST; day++) {
		const isLastDay = day === STREAK_DAY_LAST
		rewards.push({
			id         : `${STREAK_REWARD_PREFIX}${day}`,
			title      : `${day}-Day Streak!`,
			message    : isLastDay
				? `You came back ${day} days in a row! That's earned you another {tickets} tickets. \n\nThat's it. No more tickets. You'll get no more for logging in until you take a break to reset your streak.`
				: `You came back ${day} days in a row! That's earned you another {tickets} tickets.`,
			startsAt   : 0,
			endsAt     : REWARD_ENDS_OPEN,
			isEligible : (player) => player.visit.currentStreak === day,
			reward     : { type: 'tickets', amount: day },
			buttonLabel: 'I\'m on a streak!',
		})
	}
	return rewards
}



// MARK: isStreakRewardId
/**
 * True for a streak-day reward id. Those can be earned again after a streak reset.
 */
export function isStreakRewardId(id: string): boolean {
	return id.startsWith(STREAK_REWARD_PREFIX)
}



// MARK: isRewardInWindow
/**
 * True when `now` is inside the reward's start and end dates.
 */
export function isRewardInWindow(
	reward : RewardDefinition,
	now    : number,
): boolean {
	return now >= reward.startsAt && now <= reward.endsAt
}



// MARK: resolveRewardOffer
/**
 * Freezes a catalog reward into the offer stored on the player.
 * `{tickets}`, `{games}`, `{name}`, `{Name}`, and `{NAME}` in the title and message are replaced here.
 * `{name}` is lowercase, `{Name}` is PascalCase, `{NAME}` is uppercase.
 * Stored names and profile display names are not changed.
 */
export function resolveRewardOffer(
	reward : RewardDefinition,
	player : RewardPlayerContext,
): PendingRewardOffer {
	const games = Math.max(0, player.activity.gamesPlayed, player.stats.gamesPlayed)
	const name  = getSpecialPlayerName(player.userId) ?? ''
	const grant = typeof reward.reward === 'function' ? reward.reward(player) : reward.reward
	const resolved = resolveGrant(grant, games)

	const offer: PendingRewardOffer = {
		id          : reward.id,
		title       : fillRewardMessage(reward.title, resolved.tickets, games, name),
		buttonLabel : reward.buttonLabel ?? DEFAULT_REWARD_BUTTON_LABEL,
		kind        : resolved.kind,
		tickets     : resolved.tickets,
		itemId      : resolved.itemId,
	}
	if (reward.message) {
		offer.message = fillRewardMessage(reward.message, resolved.tickets, games, name)
	}
	return offer
}



// MARK: resolveGrant
function resolveGrant(
	grant : RewardGrant,
	games : number,
): Pick<PendingRewardOffer, 'kind' | 'tickets' | 'itemId'> {
	if (grant.type === 'unlock') {
		return {
			kind    : 'unlock',
			tickets : 0,
			itemId  : grant.itemId,
		}
	}

	if (grant.type === 'ticketsPerPriorGame') {
		const perGame = Math.max(0, Math.floor(grant.perGame))
		const minimum = Math.max(0, Math.floor(grant.minimum))
		return {
			kind    : 'tickets',
			tickets : Math.max(minimum, games * perGame),
			itemId  : '',
		}
	}

	return {
		kind    : 'tickets',
		tickets : Math.max(0, Math.floor(grant.amount)),
		itemId  : '',
	}
}



// MARK: fillRewardMessage
function fillRewardMessage(
	template : string,
	tickets  : number,
	games    : number,
	name     : string,
): string {
	const lower  = name.toLowerCase()
	const pascal = name === '' ? '' : lower.charAt(0).toUpperCase() + lower.slice(1)
	const upper  = name.toUpperCase()
	return template
		.split('{tickets}')
		.join(String(tickets))
		.split('{games}')
		.join(String(games))
		.split('{NAME}')
		.join(upper)
		.split('{Name}')
		.join(pascal)
		.split('{name}')
		.join(lower)
}
