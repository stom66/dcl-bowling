import { LaneStore } from 'src/shared/laneStore'
import { LanePhase, PlayerStatus } from 'src/shared/enums'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { LaneWatcher } from 'src/client/laneWatcher'


// MARK: ClientStore
/**
 * Client-only store. Holds the local player's identity and the index of the lane
 * they're currently enrolled in (if any). Lane state itself lives on synced
 * components; the getters below act as adapters that read through `LaneStore`
 * so existing call sites keep working without each having to know about the
 * component layer.
 */
export class ClientStore {
	private static instance: ClientStore | undefined

	private userId     : string             = ""
	private displayName: string             = ""
	private laneIndex  : number | undefined = undefined

	private constructor() {
		console.log('ClientStore: constructor')
	}


	// MARK: Init
	async init(): Promise<void> {
		console.log('ClientStore: init')
		const data = await userProfileCache.getUserProfile()
		if (!data) {
			console.error('ClientStore: init: no profile data')
			return
		}
		const record = data.avatars?.[0]
		if (!record || !record.name || !record.userId) {
			console.error('ClientStore: init: no record/name/userId')
			return
		}
		this.setUserId(record.userId)
		this.setDisplayName(record.name)

		console.log('ClientStore: init: success. userId:', this.getUserId(), 'displayName:', this.getDisplayName())
	}


	// MARK: Instance
	static getInstance(): ClientStore {
		if (!ClientStore.instance) ClientStore.instance = new ClientStore()
		return ClientStore.instance
	}


	// MARK: Identity
	setUserId(value: string) {
		this.userId = value
	}
		getUserId(): string {
			return this.userId
		}

	setDisplayName(value: string) {
		this.displayName = value
	}
		getDisplayName(): string {
			return this.displayName
		}


	// MARK: LaneIndex
	/**
	 * Sets the lane this player is enrolled in (or `undefined` to leave). Notifies
	 * `MyLane` so it can swap which lane it watches and emit a fresh snapshot.
	 */
	setLaneIndex(value: number | undefined) {
		if (this.laneIndex === value) return
		this.laneIndex = value
		LaneWatcher.onMyLaneIndexChanged(value)
	}
		getLaneIndex(): number | undefined {
			return this.laneIndex
		}


	// MARK: PlayerStatus (derived)
	/**
	 * Player status is derived from the current lane index and the lane's synced
	 * components. There's no setter — change the underlying state and the result
	 * follows.
	 */
	getPlayerStatus(): PlayerStatus {
		if (this.laneIndex === undefined) return PlayerStatus.IDLE

		const phase  = LaneStore.getPhase(this.laneIndex)
		const turnId = LaneStore.getCurrentFrameUserId(this.laneIndex)

		if (phase === LanePhase.NONE || phase === LanePhase.GAME_STARTING) return PlayerStatus.WAITING_FOR_GAME_START

		const turnPhases = (
			phase === LanePhase.FRAME_START ||
			phase === LanePhase.ROLL_AWAITING ||
			phase === LanePhase.ROLL_PROCESSING ||
			phase === LanePhase.ROLL_PLAYBACK
		)
		if (turnPhases && turnId === this.userId) return PlayerStatus.IN_GAME_PLAYING

		return PlayerStatus.IN_GAME_WAITING
	}


	// MARK: LaneSnapshot adapters
	/**
	 * The remaining getters are read-through adapters into `LaneStore`. They
	 * exist so existing call sites (e.g. debug UI, scores UI, clientMessaging) don't
	 * each have to know about the component layer. All return `undefined` when the
	 * player isn't on a lane.
	 */

	getLanePhase(): LanePhase {
		if (this.laneIndex === undefined) return LanePhase.NONE
		return LaneStore.getPhase(this.laneIndex)
	}

	getCurrentFrameIndex(): number | undefined {
		if (this.laneIndex === undefined) return undefined
		return LaneStore.getCurrentFrameIndex(this.laneIndex)
	}

	getCurrentFramePlayerIndex(): number | undefined {
		if (this.laneIndex === undefined) return undefined
		return LaneStore.getCurrentFramePlayerIndex(this.laneIndex)
	}

	getCurrentFrameUserId(): string | undefined {
		if (this.laneIndex === undefined) return undefined
		return LaneStore.getCurrentFrameUserId(this.laneIndex)
	}

	getCurrentRollIndex(): number | undefined {
		if (this.laneIndex === undefined) return undefined
		return LaneStore.getCurrentRollIndex(this.laneIndex)
	}

	getCurrentRollStartTime(): number | undefined {
		if (this.laneIndex === undefined) return undefined
		return LaneStore.getCurrentRollStartTime(this.laneIndex)
	}

	getFrames(): Map<string, number[][]> | undefined {
		if (this.laneIndex === undefined) return undefined
		return LaneStore.getScoresMap(this.laneIndex)
	}

	getGameStartTime(): number {
		if (this.laneIndex === undefined) return 0
		return LaneStore.getGameStartTime(this.laneIndex)
	}

	getPlayers(): string[] | undefined {
		if (this.laneIndex === undefined) return undefined
		return LaneStore.getPlayers(this.laneIndex)
	}
}
