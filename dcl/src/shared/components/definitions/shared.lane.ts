import { engine, Schemas } from "@dcl/sdk/ecs"

import { LanePhase } from "src/shared/enums"


export const LaneGameData = engine.defineComponent(
	'LaneGameData',
	{
		// Stable lane index. Identity field for the `lanes` keyed group.
		laneIndex : Schemas.Int,
		startTime : Schemas.Int64,
		frameCount: Schemas.Int,
		players   : Schemas.Optional(
			Schemas.Array(Schemas.String)
		)
	}
)


export const LanePhaseEnum = engine.defineComponent(
	'LanePhase',
	{
		phase: Schemas.EnumString<LanePhase>(LanePhase, LanePhase.NONE),
	}
)


export const LaneCurrentTurn = engine.defineComponent(
	'LaneCurrentTurn',
	{
		currentFrameIndex      : Schemas.Int,
		currentFramePlayerIndex: Schemas.Int,
		currentFrameUserId     : Schemas.String,
		currentRollIndex       : Schemas.Int,
		currentRollStartTime   : Schemas.Int64,
	}
)


export const LaneScores = engine.defineComponent(
	'LaneScores',
	{
		scores: Schemas.Optional(
			Schemas.Array(
				Schemas.Map({
					userId: Schemas.String,
					frames: Schemas.Array(Schemas.Array(Schemas.Int)),
				})
			)
		)
	}
)


export const LaneBumpers = engine.defineComponent(
	'LaneBumpers',
	{
		enabled: Schemas.Boolean,
	}
)
