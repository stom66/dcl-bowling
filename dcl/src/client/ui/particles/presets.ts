import { Color4 } from '@dcl/sdk/math'
import { getTheme } from '@stom66/dcl-ui-component-kit'

import { STARBURST_UVS, uiParticlesAtlas } from 'src/client/ui/particles/atlas'
import { getScreenCenter, getTicketChipTarget, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from 'src/client/ui/particles/screen'
import type { ParticleSim } from 'src/client/ui/particles/sim'
import type { SnowOpts, SpawnBurstOpts, SpawnHomingOpts, Vec2 } from 'src/client/ui/particles/types'
import { gameIconsAtlas } from 'src/client/ui/themes/bowling/atlases'


const MULTICOLOR: Color4[] = [
	Color4.create(1.00, 0.85, 0.25, 1),
	Color4.create(1.00, 0.45, 0.20, 1),
	Color4.create(1.00, 0.35, 0.65, 1),
	Color4.create(0.40, 0.75, 1.00, 1),
	Color4.create(0.55, 0.35, 1.00, 1),
	Color4.create(0.35, 1.00, 0.65, 1),
	Color4.create(1.00, 1.00, 1.00, 1),
]


// MARK: emitStarburst 
/**
 * Multicolor starburst / lens-flare burst from `origin` (default: screen
 * centre). Particles launch upward and outward, then rain down under gravity.
 */
export function emitStarburst(
	sim    : ParticleSim,
	origin?: Vec2,
): void {
	const o = origin ?? getScreenCenter()
	sim.spawnBurst({
		origin    : o,
		count     : 50,
		lifetime  : 1.8,
		gravity   : 5120,
		speed     : { min: 800, max: 2048 },
		coneDeg   : 45,
		aimDeg    : 0,
		size      : { min: 28, max: 56 },
		angularVel: { min: -220, max: 220 },
		colors    : MULTICOLOR,
		uvs       : STARBURST_UVS,
		src       : uiParticlesAtlas.source,
		drag      : 0.75,
	})
}


// MARK: emitExplosion 
/** Omnidirectional boom — firework stage 2 or a standalone on-screen blast. */
export function emitExplosion(
	sim   : ParticleSim,
	origin: Vec2,
	opts? : Partial<SpawnBurstOpts>,
): void {
	sim.spawnBurst({
		origin    : origin,
		count     : opts?.count ?? 28,
		lifetime  : opts?.lifetime ?? 1.5,
		gravity   : opts?.gravity ?? 850,
		speed     : opts?.speed ?? { min: 200, max: 480 },
		size      : opts?.size ?? { min: 22, max: 48 },
		angularVel: opts?.angularVel ?? { min: -260, max: 260 },
		colors    : opts?.colors ?? MULTICOLOR,
		uvs       : opts?.uvs ?? STARBURST_UVS,
		src       : opts?.src ?? uiParticlesAtlas.source,
		drag      : opts?.drag ?? 0.18,
	})
}


// MARK: emitFirework 
/**
 * Launches a single rising shell that detonates into {@link emitExplosion}
 * when its lifetime ends.
 */
export function emitFirework(
	sim    : ParticleSim,
	origin?: Vec2,
): void {
	const o = origin ?? {
		x: getScreenCenter().x + (Math.random() - 0.5) * 200,
		y: VIRTUAL_HEIGHT * 0.72,
	}
	const peakY = 180 + Math.random() * 120

	sim.spawnOne({
		origin     : o,
		vx         : (Math.random() - 0.5) * 60,
		vy         : -520 - Math.random() * 80,
		gravity    : 120,
		lifetime   : 0.95,
		size       : 36,
		angularVel : (Math.random() - 0.5) * 40,
		color      : Color4.create(1, 0.9, 0.5, 1),
		uvs        : uiParticlesAtlas.uv.flareWarm,
		src        : uiParticlesAtlas.source,
		onExpire   : {
			origin    : { x: o.x, y: peakY },
			count     : 32,
			lifetime  : 1.6,
			gravity   : 900,
			speed     : { min: 180, max: 460 },
			size      : { min: 20, max: 44 },
			angularVel: { min: -240, max: 240 },
			colors    : MULTICOLOR,
			uvs       : STARBURST_UVS,
			src       : uiParticlesAtlas.source,
			drag      : 0.2,
		},
	})
}


// MARK: emitSnow 
/**
 * Gentle snowfall from the top of the screen with light gravity and
 * sinusoidal side-to-side sway.
 */
export function emitSnow(
	sim : ParticleSim,
	opts: SnowOpts = {},
): void {
	const duration = opts.duration ?? 4
	const rate     = opts.rate ?? 14
	const total    = Math.max(1, Math.round(duration * rate))

	sim.scheduleEmitter(total, duration, () => {
		sim.spawnOne({
			origin     : {
				x: Math.random() * VIRTUAL_WIDTH,
				y: -20 - Math.random() * 40,
			},
			vx         : (Math.random() - 0.5) * 30,
			vy         : 40 + Math.random() * 50,
			gravity    : 35 + Math.random() * 40,
			lifetime   : 6 + Math.random() * 3,
			size       : 16 + Math.random() * 18,
			angularVel : (Math.random() - 0.5) * 40,
			angleDeg   : Math.random() * 360,
			color      : Color4.create(1, 1, 1, 0.9),
			uvs        : Math.random() < 0.5
				? uiParticlesAtlas.uv.snow
				: uiParticlesAtlas.uv.snowSoft,
			src        : uiParticlesAtlas.source,
			drag       : 0.05,
			swayAmp    : 25 + Math.random() * 35,
			swayFreq   : 0.35 + Math.random() * 0.45,
		})
	})
}


// MARK: emitTicketStream 
/**
 * Ticket glyphs launch up-and-left from screen centre, then steer toward the
 * ticket-balance chip. Homing steer ramps over life so the burst reads first.
 */
export function emitTicketStream(
	sim : ParticleSim,
	opts: Partial<SpawnHomingOpts> = {},
): void {
	const from = opts.from ?? getScreenCenter()
	const to   = opts.to   ?? getTicketChipTarget()

	sim.spawnHoming({
		from         : from,
		to           : to,
		count        : opts.count ?? 10,
		stagger      : opts.stagger ?? 0.05,
		lifetime     : opts.lifetime ?? 1.25,
		launchSpeed  : opts.launchSpeed ?? { min: 1024, max: 2048 },
		aimDeg       : opts.aimDeg ?? -75,
		coneDeg      : opts.coneDeg ?? 5,
		seekSpeed    : opts.seekSpeed ?? 2000,
		steer        : opts.steer ?? 9,
		arriveRadius : opts.arriveRadius ?? 4,
		scalePeak    : opts.scalePeak ?? 1.2,
		size         : opts.size ?? 64,
		src          : opts.src ?? gameIconsAtlas.source,
		uvs          : opts.uvs ?? gameIconsAtlas.uv.ticket,
		colors       : opts.colors,
		color        : opts.color ?? getTheme().colors.primary,
		angularVel   : opts.angularVel ?? { min: -60, max: 60 },
	})
}
