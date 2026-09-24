import { ComponentStore } from "src/shared/components/componentStore"
import { PlayerLoadout } from "src/shared/components/definitions/shared.playerLoadout"
import { findScoringAnimation, getDefaultLoadout } from "src/shared/data/unlocks"
import { PlayerLoadoutState, ScoreKind, ScoringAnimationItem } from "src/shared/data/unlocks/types"


// MARK: resolvePlayerLoadout
/**
 * Reads the synced loadout for `userId`, or catalog defaults if the entity is not ready.
 */
export function resolvePlayerLoadout(userId: string): PlayerLoadoutState {
	const defaults = getDefaultLoadout()
	if (!userId) return defaults

	const data = ComponentStore.getOrNull(PlayerLoadout, { key: userId })
	if (!data) return defaults

	return {
		ballId           : data.ballId           || defaults.ballId,
		pinId            : data.pinId            || defaults.pinId,
		laneId           : data.laneId           || defaults.laneId,
		trailId          : data.trailId          || defaults.trailId,
		spotlightId      : data.spotlightId      || defaults.spotlightId,
		spotlightColorId : data.spotlightColorId || defaults.spotlightColorId,
		scoringAnimIds   : data.scoringAnimIds?.length ? [...data.scoringAnimIds] : defaults.scoringAnimIds,
	}
}


// MARK: resolveScoringAnimation
/**
 * Resolves the scoring GLTF for a roll result from the player's equipped anims.
 */
export function resolveScoringAnimation(
	userId     : string,
	scoreKind  : ScoreKind,
	scoreValue?: number
): ScoringAnimationItem {
	const loadout = resolvePlayerLoadout(userId)
	return findScoringAnimation(loadout.scoringAnimIds, scoreKind, scoreValue)
}
