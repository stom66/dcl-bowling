import { engine, Entity, LightSource, Material, ParticleSystem, PBParticleSystem_PlaybackState, Transform } from "@dcl/sdk/ecs"
import { Color3, Quaternion, Vector3 } from "@dcl/sdk/math"

import { DEFAULT_SPOTLIGHT_COLOR_ID, DEFAULT_SPOTLIGHT_ID, DEFAULT_TRAIL_ID, spotlightColors, spotlightPatterns, trails } from "src/shared/data/unlocks"


const MAX_TRAIL_PARTICLES = 80

/** Rolls travel world +Z toward the pins. Wake emission is the opposite, world -Z. */
const TRAIL_WAKE_HORIZONTAL = Vector3.create(0, 0, -1)
const TRAIL_WAKE_ARC        = Vector3.create(0, 0.70710678, -0.70710678)



// MARK: trailEmitRotation
/**
 * Aims the trail cone. Rising trails shoot horizontally backward; falling
 * trails shoot 45 degrees up and back. Independent of ball spin.
 */
function trailEmitRotation(
	rises : boolean
): Quaternion {
	return Quaternion.lookRotation(
		rises ? TRAIL_WAKE_HORIZONTAL : TRAIL_WAKE_ARC,
		Vector3.Up(),
	)
}



// MARK: applyBallTrail
/**
 * Spawns an unparented trail emitter at the ball. Caps `maxParticles`.
 * Call only when roll playback starts — not during aiming or countdown.
 */
export function applyBallTrail(
	ball    : Entity,
	trailId : string
): Entity | undefined {
	ParticleSystem.deleteFrom(ball)
	if (trailId === DEFAULT_TRAIL_ID) return undefined

	const item = trails[trailId]
	if (!item?.emitter) return undefined

	const emitter       = item.emitter as Record<string, unknown>
	const listedMax     = typeof emitter.maxParticles === 'number' ? emitter.maxParticles : MAX_TRAIL_PARTICLES
	const maxParticles  = Math.min(listedMax, MAX_TRAIL_PARTICLES)
	const gravity       = typeof emitter.gravity === 'number' ? emitter.gravity : 0
	const ballTransform = Transform.getOrNull(ball)

	const trail = engine.addEntity()
	Transform.create(trail, {
		position: ballTransform?.position ?? Vector3.Zero(),
		rotation: trailEmitRotation(gravity < 0),
	})
	ParticleSystem.create(trail, {
		...emitter,
		maxParticles,
		active        : true,
		playbackState : PBParticleSystem_PlaybackState.PS_PLAYING,
	} as Parameters<typeof ParticleSystem.create>[1])
	return trail
}



// MARK: stopBallTrail
/**
 * Stops new trail particles so remaining ones fade out. No-op if none attached.
 */
export function stopBallTrail(
	emitter : Entity | undefined
): void {
	if (emitter === undefined) return
	const ps = ParticleSystem.getMutableOrNull(emitter)
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
