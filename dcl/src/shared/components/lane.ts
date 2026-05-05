import { engine, Schemas } from "@dcl/sdk/ecs";
import { LanePhase } from "../enums";

export const LaneIndex = engine.defineComponent(
	'LaneIndex',
	{
		index: Schemas.Int,
	}
)

export const LaneGameStartTime = engine.defineComponent(
	'LaneGameStartTime',
	{
		startTime: Schemas.Int64,
	}
)

export const LanePhaseEnum = engine.defineComponent(
	'LanePhase',
	{
		phase: Schemas.EnumString<LanePhase>(LanePhase, LanePhase.NONE),
	}
)

export const LanePlayers = engine.defineComponent(
	'LanePlayers',
	{
		players: Schemas.Optional(
			Schemas.Array(
				Schemas.Map({
					userId     : Schemas.String,
					displayName: Schemas.String,
				})
			)
		)
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
