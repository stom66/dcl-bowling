import { engine, Schemas } from "@dcl/sdk/ecs";
import { LanePhase } from "../enums";


export const LaneGameData = engine.defineComponent(
	'LaneGameData',
	{
		// Stable lane index. Used by the client to map synced entities back to
		// their slot in `ComponentManager.laneComponentEntities[]` — the client
		// doesn't call `engine.addEntity` / `syncEntity` itself in authoritative-
		// server mode, so it identifies lanes via this field on the synced data.
		laneIndex: Schemas.Int,
		startTime: Schemas.Int64,
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
