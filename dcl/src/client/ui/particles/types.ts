import { Color4 } from '@dcl/sdk/math'
import type { EasingFn } from '@stom66/dcl-ui-component-kit'


/** Motion integrator used by a live particle. */
export type ParticleMotionMode = 'physics' | 'path' | 'homing'

/** Mutable RGBA used as a stable `Icon.iconColor` reference. */
export type MutableColor4 = { r: number, g: number, b: number, a: number }


// MARK: Vec2
/** Screen-space point in virtual-canvas pixels. */
export type Vec2 = {
	x: number
	y: number
}


// MARK: SpawnBurstOpts
/**
 * Options for a physics burst. Used by presets and by `onExpire` chains
 * (e.g. a rising firework that detonates into an explosion).
 */
export type SpawnBurstOpts = {
	origin       : Vec2
	count?       : number
	/** Base lifetime in seconds; each particle gets a small random jitter. */
	lifetime?    : number
	/** Downward acceleration in px/s² (positive pulls toward the bottom). */
	gravity?     : number
	/** Speed range in px/s sampled per particle. */
	speed?       : { min: number, max: number }
	/**
	 * Cone aimed up the screen. `0` = straight up (−Y), positive = clockwise
	 * degrees of half-spread. Omit for a full 360° burst.
	 */
	coneDeg?     : number
	/** Optional fixed aim for the cone centre in degrees (0 = up). */
	aimDeg?      : number
	size?        : { min: number, max: number }
	angularVel?  : { min: number, max: number }
	colors?      : Color4[]
	uvs?         : number[][]
	src?         : string
	drag?        : number
	swayAmp?     : number
	swayFreq?    : number
	/** Child burst fired at this particle’s death position. */
	onExpire?    : SpawnBurstOpts
}


// MARK: SpawnParticleOpts
/** Options for a single physics particle (e.g. a rising firework shell). */
export type SpawnParticleOpts = {
	origin      : Vec2
	vx?         : number
	vy?         : number
	gravity?    : number
	lifetime?   : number
	size?       : number
	angularVel? : number
	angleDeg?   : number
	color?      : Color4
	uvs?        : number[]
	src?        : string
	drag?       : number
	swayAmp?    : number
	swayFreq?   : number
	onExpire?   : SpawnBurstOpts
}


// MARK: SpawnStreamOpts
/**
 * Path-mode stream: particles ease from `from` toward `to` along a quadratic
 * arc with a per-particle perpendicular offset.
 */
export type SpawnStreamOpts = {
	from        : Vec2
	to          : Vec2
	count?      : number
	/** Total flight time per particle in seconds. */
	duration?   : number
	/** Stagger between successive spawns in seconds. */
	stagger?    : number
	/** Max perpendicular offset from the mid-point control (px). */
	arcSpread?  : number
	easing?     : EasingFn
	/** Peak scale at mid-flight; start/end scale toward ~0. */
	scalePeak?  : number
	size?       : number
	color?      : Color4
	colors?     : Color4[]
	uvs?        : number[]
	uvChoices?  : number[][]
	src?        : string
	angularVel? : { min: number, max: number }
}


// MARK: SpawnHomingOpts
/**
 * Homing stream: launch with an initial velocity, then steer toward `to`.
 * Steer strength ramps over life so the burst reads as ballistic first, then
 * curls into the target — cheap per particle (a few muls, no path fitting).
 */
export type SpawnHomingOpts = {
	from         : Vec2
	to           : Vec2
	count?       : number
	stagger?     : number
	/** Max flight time; particles also die on arrive. */
	lifetime?    : number
	/** Launch speed in px/s. */
	launchSpeed? : { min: number, max: number }
	/**
	 * Launch aim in degrees (0 = up, positive clockwise). Tickets default to
	 * a leftward-up cone so they fly out before curling to the chip.
	 */
	aimDeg?      : number
	coneDeg?     : number
	/** Cruise speed while seeking, px/s. */
	seekSpeed?   : number
	/** Velocity blend rate toward the seek direction (1/s). */
	steer?       : number
	/** Snap / expire when within this many px of `to`. */
	arriveRadius?: number
	scalePeak?   : number
	size?        : number
	color?       : Color4
	colors?      : Color4[]
	uvs?         : number[]
	uvChoices?   : number[][]
	src?         : string
	angularVel?  : { min: number, max: number }
}


// MARK: SnowOpts
/** Continuous / timed snowfall from the top of the screen. */
export type SnowOpts = {
	/** How long to keep emitting, in seconds. */
	duration? : number
	/** Particles spawned per second while emitting. */
	rate?     : number
}


// MARK: ParticleState
/** One pooled particle slot. Inactive slots have `alive === false`. */
export type ParticleState = {
	alive       : boolean
	mode        : ParticleMotionMode
	x           : number
	y           : number
	vx          : number
	vy          : number
	gravity     : number
	drag        : number
	angleDeg    : number
	angularVel  : number
	baseSize    : number
	scale       : number
	opacity     : number
	color       : Color4
	life        : number
	maxLife     : number
	src         : string
	baseUvs     : number[]
	swayAmp     : number
	swayFreq    : number
	swayPhase   : number
	/** Path mode: origin. */
	pathFromX   : number
	pathFromY   : number
	/** Path mode: control point. */
	pathCtrlX   : number
	pathCtrlY   : number
	/** Path mode: destination. */
	pathToX     : number
	pathToY     : number
	pathT       : number
	pathDuration: number
	pathEasing  : EasingFn | undefined
	scalePeak   : number
	/** Homing: seek cruise speed (px/s). */
	seekSpeed   : number
	/** Homing: velocity blend rate toward target (1/s). */
	steerRate   : number
	/** Homing: arrive / expire distance (px). */
	arriveRadius: number
	onExpire    : SpawnBurstOpts | undefined
	/**
	 * Stable Icon tint object. Mutated in place each frame while alive so the
	 * UI layer does not allocate a new Color4 (which was thrashing React-ECS
	 * updates across the whole pool, including idle slots).
	 */
	renderTint  : MutableColor4
	/** Stable absolute position bag for the Icon (`top` / `left`). */
	renderPos   : { top: number, left: number }
	/** Last drawn pixel size; kept stable while idle. */
	renderSize  : number
	/** Last drawn UV rotation in whole degrees. */
	renderRotate: number
}
