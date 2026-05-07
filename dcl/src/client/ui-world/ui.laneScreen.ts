import { engine, Entity, TextShape, Transform } from "@dcl/sdk/ecs"
import { Color4, Quaternion } from "@dcl/sdk/math"

import { laneScreenPositions } from "src/client/data/lanePositions"
import { LanePhase } from "src/shared/enums"
import { LaneStore } from "src/shared/laneStore"


export class UiLaneScreen {
	private entity   : Entity
	private laneIndex: number

	private lanePhase: LanePhase = LanePhase.NONE


	constructor(laneIndex: number) {
		this.laneIndex = laneIndex
		this.entity    = engine.addEntity()
		Transform.create(this.entity, {
			position: laneScreenPositions[this.laneIndex],
			rotation: Quaternion.fromEulerDegrees(-16, 0, 0),
		})

		this.lanePhase = LaneStore.getPhase(this.laneIndex)

		TextShape.create(this.entity, {
			text      : this.getTextValue(),
			textColor : this.getTextColor(),
			fontSize  : 7,
			shadowBlur: 1,
		})

		LaneStore.subscribeLanePhase(this.laneIndex, (phase) => {
			this.lanePhase = phase
			this.applyTextShape()
		})
	}



	// MARK: applyTextShape
	private applyTextShape(): void {
		const textShape = TextShape.getMutable(this.entity)
		textShape.text      = this.getTextValue()
		textShape.textColor = this.getTextColor()
	}


	getTextValue(): string {
		return this.lanePhase === LanePhase.NONE ? "Open" : "Game"
	}

	getTextColor(): Color4 {
		return this.lanePhase === LanePhase.NONE ? Color4.Green() : Color4.Red()
	}
}
