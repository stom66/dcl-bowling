import { QuaternionType, Vector3Type } from "@dcl/sdk/ecs"
import { Color3, Vector3 } from "@dcl/sdk/math"

import { LaneStatus } from "src/shared/enums"



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
	gameStartTime       : number,
	laneIndex           : number,
	laneStatus          : LaneStatus,
	players             : Map<string, string>,   // userId -> displayName
	frames              : Map<string, number[][]>, // userId -> scores
	//groupId             : string | undefined
	currentRound        : number
	currentTurnUserId   : string | undefined
	currentTurnStartTime: number | undefined
}

	// MARK: NotifyStatePayload
	export type NotifyLaneStatePayload = {
		//groupId              : string | undefined
		currentRound         : number
		currentTurnUserId?   : string
		currentTurnStartTime?: number
		gameStartTime        : number
		laneIndex            : number
		laneStatus           : string
		players              : {
			userId              : string
			displayName         : string	
		}[]
		sentAt               : number
		frames               : {
			userId              : string
			frames              : number[][]
		}[]
	}

export type PlayerGroup = {
	groundId: string
	laneIndex: number
	players  : Map<string, string> // userId -> displayName
}



export type NotifyJoinGamePayload = {
	laneIndex: number
	gameStartTime: number
}


/** Shared turn/replay body (matches `turnMessageBaseSchema` in room). */
export type TurnPayload = {
	frameIndex   : number
	pinStates    : boolean[]
	ballPositions: Vector3Type[]
	pinPositions : Vector3Type[][]
	pinRotations : QuaternionType[][]
	score        : number
	sentAt       : number
}

/** Client → server: same snapshot fields plus which frame is being submitted. */
export type RequestPlayTurnPayload = TurnPayload & {
}

/** Server → clients: replay plus acting player (no frameIndex on wire). */
export type NotifyPlayerTurnPayload = TurnPayload & {
	playerId: string
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
