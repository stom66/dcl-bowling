import { engine, Entity, Font, TextAlignMode, TextShape, Transform } from "@dcl/sdk/ecs"
import { Color3, Color4, Quaternion, Vector3 } from "@dcl/sdk/math"

import { LaneCurrentTurn, LaneGameData } from "src/shared/components/definitions/shared.lane"
import { LanePhase } from "src/shared/enums"
import { LaneStore } from "src/shared/laneStore"
import { userProfileCache } from "src/shared/utils/userProfileCache"

import { laneScreenPositions } from "src/client/data/lanePositions"


const DISPLAY_NAME_MAX_LENGTH = 16
const SCREEN_TEXT_WIDTH       = 1.15
const LANE_FONT_SIZE          = 1.45
const STATUS_FONT_SIZE_IDLE   = 2.8
const STATUS_FONT_SIZE_PLAY   = 1.65
const FRAME_FONT_SIZE         = 1.6
const NAME_FONT_SIZE          = 1.25
const LANE_OFFSET_Y           = 0.42
const STATUS_OFFSET_Y         = 0.14
const STATUS_OFFSET_Y_IDLE    = -0.04
const FRAME_OFFSET_Y          = -0.10
const NAME_OFFSET_Y           = -0.36


export class UiLaneScreen {
	private entity         : Entity
	private laneEntity     : Entity
	private statusEntity   : Entity
	private frameEntity    : Entity
	private nameEntity     : Entity
	private laneIndex      : number
	private lanePhase      : LanePhase = LanePhase.NONE
	private turnUserId     : string    = ''
	private turnDisplayName: string    = ''


	constructor(laneIndex: number) {
		this.laneIndex = laneIndex
		this.entity    = engine.addEntity()
		Transform.create(this.entity, {
			position: laneScreenPositions[this.laneIndex],
			rotation: Quaternion.fromEulerDegrees(-16, 0, 0),
		})

		this.laneEntity   = this.createTextEntity(LANE_OFFSET_Y,    LANE_FONT_SIZE)
		this.statusEntity = this.createTextEntity(STATUS_OFFSET_Y, STATUS_FONT_SIZE_PLAY)
		this.frameEntity  = this.createTextEntity(FRAME_OFFSET_Y,  FRAME_FONT_SIZE)
		this.nameEntity   = this.createTextEntity(NAME_OFFSET_Y,   NAME_FONT_SIZE)

		this.lanePhase = LaneStore.getPhase(this.laneIndex)
		this.applyTextShape()

		const syncedLane = LaneStore.getLaneEntity(this.laneIndex)

		LaneStore.subscribeLanePhase(this.laneIndex, (phase) => {
			this.lanePhase = phase
			this.refreshTurnDisplay()
			this.applyTextShape()
		})

		LaneGameData.onChange(syncedLane, () => {
			this.refreshTurnDisplay()
			this.applyTextShape()
		})

		LaneCurrentTurn.onChange(syncedLane, () => {
			this.refreshTurnDisplay()
			this.applyTextShape()
		})

		this.refreshTurnDisplay()
	}



	// MARK: createTextEntity
	/**
	 * Adds a centered TextShape child on the monitor, constrained to the screen width.
	 */
	private createTextEntity(
		offsetY : number,
		fontSize: number,
	): Entity {
		const entity = engine.addEntity()
		Transform.create(entity, {
			parent  : this.entity,
			position: Vector3.create(0, offsetY, 0),
		})
		TextShape.create(entity, {
			text        : '',
			font        : Font.F_SANS_SERIF,
			fontSize    : fontSize,
			textAlign   : TextAlignMode.TAM_MIDDLE_CENTER,
			textColor   : Color4.White(),
			width       : SCREEN_TEXT_WIDTH,
			textWrapping: true,
			outlineWidth: 0.12,
			outlineColor: Color3.Black(),
			shadowBlur  : 1,
		})
		return entity
	}



	// MARK: applyTextShape
	private applyTextShape(): void {
		const isIdle      = this.lanePhase === LanePhase.NONE
		const laneShape   = TextShape.getMutable(this.laneEntity)
		const statusShape = TextShape.getMutable(this.statusEntity)
		const frameShape  = TextShape.getMutable(this.frameEntity)
		const nameShape   = TextShape.getMutable(this.nameEntity)
		const statusTx    = Transform.getMutable(this.statusEntity)

		laneShape.text      = this.getLaneText()
		laneShape.textColor = Color4.White()

		statusShape.text      = this.getStatusText()
		statusShape.fontSize  = isIdle ? STATUS_FONT_SIZE_IDLE : STATUS_FONT_SIZE_PLAY
		statusShape.textColor = this.getStatusColor()
		statusTx.position     = Vector3.create(0, isIdle ? STATUS_OFFSET_Y_IDLE : STATUS_OFFSET_Y, 0)

		frameShape.text      = this.getFrameText()
		frameShape.textColor = Color4.White()

		nameShape.text      = this.getNameText()
		nameShape.textColor = Color4.White()
	}



	// MARK: refreshTurnDisplay
	/**
	 * Resolves the current turn player's display name when the user id changes.
	 */
	private refreshTurnDisplay(): void {
		const userId = LaneStore.getCurrentFrameUserId(this.laneIndex)
		if (userId === this.turnUserId) return

		this.turnUserId      = userId
		this.turnDisplayName = ''

		if (!userId) {
			this.applyTextShape()
			return
		}

		void userProfileCache.getDisplayName(userId).then((displayName) => {
			if (this.turnUserId !== userId) return
			this.turnDisplayName = this.truncateDisplayName(displayName)
			this.applyTextShape()
		})
	}



	// MARK: truncateDisplayName
	private truncateDisplayName(displayName: string): string {
		const name = displayName.trim()
		if (!name) return ''
		if (name.length <= DISPLAY_NAME_MAX_LENGTH) return name
		return `${name.slice(0, DISPLAY_NAME_MAX_LENGTH - 3)}...`
	}



	// MARK: getLaneText
	/**
	 * Top line: player-facing 1-based lane number, always visible.
	 */
	private getLaneText(): string {
		return `Lane ${this.laneIndex + 1}`
	}


	// MARK: getStatusText
	/**
	 * Status line: idle, starting countdown, or an active game.
	 */
	private getStatusText(): string {
		if (this.lanePhase === LanePhase.NONE)          return "Open"
		if (this.lanePhase === LanePhase.GAME_STARTING) return "Starting"
		return "Game in Progress"
	}



	// MARK: getFrameText
	/**
	 * Middle line: `Frame 1 of 6`. Empty while the lane is idle.
	 */
	private getFrameText(): string {
		if (this.lanePhase === LanePhase.NONE) return ''

		const frameCount = LaneStore.getFrameCount(this.laneIndex)
		if (frameCount <= 0) return ''

		const currentFrame = LaneStore.getCurrentFrameIndex(this.laneIndex) + 1
		return `Frame ${currentFrame} of ${frameCount}`
	}



	// MARK: getNameText
	/**
	 * Bottom line: the player currently bowling. Empty while idle or starting.
	 */
	private getNameText(): string {
		if (this.lanePhase === LanePhase.NONE)          return ''
		if (this.lanePhase === LanePhase.GAME_STARTING) return ''
		return this.turnDisplayName
	}



	// MARK: getStatusColor
	private getStatusColor(): Color4 {
		return this.lanePhase === LanePhase.NONE ? Color4.Green() : Color4.Red()
	}
}
