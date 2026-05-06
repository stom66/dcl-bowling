import { QuaternionType, Vector3Type } from "@dcl/sdk/ecs"
import { Color3, Vector3 } from "@dcl/sdk/math"

import { LanePhase } from "src/shared/enums"



// MARK: Outfit
export type Outfit = {
	userId   : string
	wearables: string[]
	bodyShape: string
	hairColor: Color3
	skinColor: Color3
}


// MARK: ClientState
export type ClientState = {
	userId           : string
	displayName      : string
	enrolledInGame   : boolean
	laneState        : LaneState | undefined
}


// MARK: ServerState
export type ServerState = {
	lanes: LaneState[]
	groups: PlayerGroup[]
}

export type LaneState = {
	currentFrameIndex       : number
	currentFramePlayerIndex : number
	currentFrameUserId?     : string
	currentRollIndex        : number
	currentRollStartTime?   : number | undefined
	frames                  : Map<string, number[][]>, // userId -> scores
	gameStartTime           : number,
	laneIndex               : number,
	//laneStatus              : LaneStatus
	phase                   : LanePhase
	players                 : Map<string, string>,     // userId -> displayName
	//groupId                 :  string | undefined
}

// MARK: LaneComponents

export type LaneScores = {
	userId: string
	frames: number[][]
}
export type LanePlayers = {
	userId     : string
	displayName: string
}
export type LaneCurrentTurn = {
	currentFrameIndex      : number
	currentFramePlayerIndex: number
	currentFrameUserId     : string
	currentRollIndex       : number
	currentRollStartTime   : number
}

// MARK: NotifyLaneStatePayload (wire format — arrays, not Maps)
export type NotifyLaneStatePayload = {
	currentFrameIndex?      : number
	currentFramePlayerIndex?: number
	currentFrameUserId?     : string
	currentRollIndex?       : number
	currentRollStartTime?   : number
	frames                  : { userId: string, frames: number[][] }[]
	gameStartTime           : number
	laneIndex               : number
	phase                   : string
	players                 : { userId: string, displayName: string }[]
	sentAt                  : number
}

export type NotifyPlayerRollStartPayload = {
	userId: string
	pinStanding: boolean[]
	rollStartTimestamp: number
}

export type PlayerGroup = {
	groundId : string
	laneIndex: number
	players  : Map<string, string> // userId -> displayName
}



export type NotifyJoinGamePayload = {
	laneIndex: number
	gameStartTime: number
}


/** Shared roll/replay body (matches `rollMessageBaseSchema` in room). */
export type SimObjectKeyframe = {
	time    : number
	position?: Vector3Type
	rotation?: Vector3Type
}

export type SimObjectKeyframes = {
	index    : number
	keyframes: SimObjectKeyframe[]
}

export type RollPayload = {
	duration         : number
	frameIndex       : number
	rollIndex        : number
	startingPinStates: boolean[]
	finalPinStates   : boolean[]
	gutterBall       : boolean
	ballKeyframes    : SimObjectKeyframes
	pinsKeyframes    : SimObjectKeyframes[]
	score            : number
	sentAt           : number
}

/** Client → server: roll snapshot. */
export type RequestPlayRollPayload = {
	position : Vector3Type
	direction: Vector3Type
	power    : number
	spin     : number
}

/** Server → clients: roll replay plus acting player. */
export type NotifyPlayerRollPayload = RollPayload & {
	userId: string
}



// MARK: LambdasProfileColor
/** RGBA components 0–1 as returned on profile payloads */
export type LambdasProfileColor = {
	r: number
	g: number
	b: number
	a: number
}


// MARK: LambdasProfileAvatarSnapshots
/** Snapshot URLs when the catalyst has generated them; often `{}` until available. */
export type LambdasProfileAvatarSnapshots = {
	face256?: string
	face128?: string
	body?   : string
}


// MARK: LambdasProfileAvatar
export type LambdasProfileAvatar = {
	bodyShape  : string
	wearables  : string[]
	forceRender: string[]
	emotes     : unknown[]
	eyes?      : { color?: LambdasProfileColor }
	hair?      : { color?: LambdasProfileColor }
	skin?      : { color?: LambdasProfileColor }
	snapshots? : LambdasProfileAvatarSnapshots
}


// MARK: LambdasProfileAvatarRecord
/**
 * One element of the root `avatars` array: account-level fields plus nested `avatar` appearance.
 * Optional fields may be missing on older or sparse profiles.
 */
export type LambdasProfileAvatarRecord = {
	userId             : string
	avatar             : LambdasProfileAvatar
	hasClaimedName?    : boolean
	description?       : string
	tutorialStep?      : number
	name?              : string
	email?             : string
	ethAddress?        : string
	version?           : number
	unclaimedName?     : string
	hasConnectedWeb3?  : boolean
	country?           : string
	gender?            : string
	pronouns?          : string
	relationshipStatus?: string
	sexualOrientation? : string
	language?          : string
	employmentStatus?  : string
	profession?        : string
	realName?          : string
	hobbies?           : string
	birthDate?         : number
	links?             : unknown[]
	blocked?           : unknown[]
	interests?         : string[]
	nameColor?         : LambdasProfileColor
}


// MARK: DecentralandProfile
/** JSON body from GET https://peer.decentraland.org/lambdas/profiles/{address} */
export type DecentralandProfile = {
	/** Present on current catalyst responses; omit if using a minimal client. */
	timestamp?: number
	avatars   : LambdasProfileAvatarRecord[]
}
