import { engine, Entity, LightSource, Material, ParticleSystem, PBParticleSystem_PlaybackState, Transform } from "@dcl/sdk/ecs"
import { Color3, Quaternion, Vector3 } from "@dcl/sdk/math"

import { DEFAULT_SPOTLIGHT_COLOR_ID, DEFAULT_SPOTLIGHT_ID, DEFAULT_TRAIL_ID, spotlightColors, spotlightPatterns, trails } from "src/shared/data/unlocks"


const MAX_TRAIL_PARTICLES = 80



// MARK: applyBallTrail
/**
 * Attaches or clears a catalog particle trail on the ball. Caps `maxParticles`.
 * Call only when roll playback starts — not during aiming or countdown.
 */
export function applyBallTrail(
	ball    : Entity,
	trailId : string
): void {
	ParticleSystem.deleteFrom(ball)
	if (trailId === DEFAULT_TRAIL_ID) return

	const item = trails[trailId]
	if (!item?.emitter) return

	const emitter      = item.emitter as Record<string, unknown>
	const listedMax    = typeof emitter.maxParticles === 'number' ? emitter.maxParticles : MAX_TRAIL_PARTICLES
	const maxParticles = Math.min(listedMax, MAX_TRAIL_PARTICLES)

	ParticleSystem.create(ball, {
		...emitter,
		maxParticles,
		active        : true,
		playbackState : PBParticleSystem_PlaybackState.PS_PLAYING,
	} as Parameters<typeof ParticleSystem.create>[1])
}



// MARK: stopBallTrail
/**
 * Stops new trail particles so remaining ones fade out. No-op if none attached.
 */
export function stopBallTrail(
	ball : Entity
): void {
	const ps = ParticleSystem.getMutableOrNull(ball)
	if (!ps) return
	ps.active = false
}



// MARK: applyFollowSpotlight
/**
 * Replay follow-spot. Same spot setup as the working lobby test light.
 * Color and mask come from the equipped items.
 */
export function applyFollowSpotlight(
	spotlightId      : string,
	spotlightColorId : string,
	position         : Vector3,
): Entity {
	const pattern   = spotlightPatterns[spotlightId]
	const colorItem = spotlightColors[spotlightColorId] ?? spotlightColors[DEFAULT_SPOTLIGHT_COLOR_ID]
	const rgb       = colorItem?.color ?? pattern?.color ?? { r: 1, g: 1, b: 1 }
	const maskSrc   = spotlightId === DEFAULT_SPOTLIGHT_ID ? undefined : pattern?.maskSrc

	const light = engine.addEntity()
	Transform.create(light, {
		position,
		rotation: Quaternion.fromEulerDegrees(90, 0, 0),
	})
	LightSource.create(light, {
		type              : LightSource.Type.Spot({
			innerAngle: 10,
			outerAngle: 20,
		}),
		color             : Color3.create(rgb.r, rgb.g, rgb.b),
		intensity         : 5000000,
		shadowMaskTexture : maskSrc
			? Material.Texture.Common({ src: maskSrc })
			: undefined,
	})
	return light
}
