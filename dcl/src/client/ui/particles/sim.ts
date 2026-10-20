import { Color4 } from '@dcl/sdk/math'
import { easingFunctions, type EasingFn } from '@stom66/dcl-ui-component-kit'

import { uiParticlesAtlas } from 'src/client/ui/particles/atlas'
import type {
	ParticleState,
	SpawnBurstOpts,
	SpawnHomingOpts,
	SpawnParticleOpts,
	SpawnStreamOpts,
	Vec2,
} from 'src/client/ui/particles/types'


export const PARTICLE_POOL_SIZE = 80

const DEFAULT_SRC = uiParticlesAtlas.source
const DEFAULT_UVS = uiParticlesAtlas.uv.starburstGold
const WHITE       = Color4.create(1, 1, 1, 1)

/** Pending delayed spawns (streams / snow drip). */
type PendingSpawn = {
	remaining : number
	interval  : number
	elapsed   : number
	spawn     : () => void
}


// MARK: randRange
/** Random float in `[min, max]`. */
function randRange(
	min: number,
	max: number,
): number {
	return min + Math.random() * (max - min)
}


// MARK: pick
/** Picks a random element from a non-empty array. */
function pick<T>(
	items: T[],
): T {
	return items[Math.floor(Math.random() * items.length)]
}


// MARK: bezier2
/** Quadratic Bezier point at `t` in `[0, 1]`. */
function bezier2(
	ax: number,
	ay: number,
	bx: number,
	by: number,
	cx: number,
	cy: number,
	t : number,
): Vec2 {
	const u  = 1 - t
	const uu = u * u
	const tt = t * t
	return {
		x: uu * ax + 2 * u * t * bx + tt * cx,
		y: uu * ay + 2 * u * t * by + tt * cy,
	}
}


// MARK: scaleEnvelope
/**
 * Scale rises from near-zero to `peak` at mid-flight, then falls back.
 * `t` is eased progress in `[0, 1]`.
 */
function scaleEnvelope(
	t   : number,
	peak: number,
): number {
	const envelope = t < 0.5 ? t * 2 : (1 - t) * 2
	return Math.max(0.05, peak * envelope)
}


// MARK: ParticleSim
/**
 * Fixed-size particle pool. One system should call {@link tick} each frame.
 * Presets and the public API allocate through the spawn helpers below.
 */
export class ParticleSim {
	readonly pool: ParticleState[] = []

	private pending: PendingSpawn[] = []

	constructor(size: number = PARTICLE_POOL_SIZE) {
		for (let i = 0; i < size; i++) {
			this.pool.push(this.makeEmpty())
		}
	}


	// MARK: makeEmpty
	/** Allocates a blank inactive slot. */
	private makeEmpty(): ParticleState {
		return {
			alive        : false,
			mode         : 'physics',
			x            : 0,
			y            : 0,
			vx           : 0,
			vy           : 0,
			gravity      : 0,
			drag         : 0,
			angleDeg     : 0,
			angularVel   : 0,
			baseSize     : 32,
			scale        : 1,
			opacity      : 1,
			color        : WHITE,
			life         : 0,
			maxLife      : 1,
			src          : DEFAULT_SRC,
			baseUvs      : DEFAULT_UVS,
			swayAmp      : 0,
			swayFreq     : 0,
			swayPhase    : 0,
			pathFromX    : 0,
			pathFromY    : 0,
			pathCtrlX    : 0,
			pathCtrlY    : 0,
			pathToX      : 0,
			pathToY      : 0,
			pathT        : 0,
			pathDuration : 1,
			pathEasing   : undefined,
			scalePeak    : 1,
			seekSpeed    : 0,
			steerRate    : 0,
			arriveRadius : 24,
			onExpire     : undefined,
			renderTint   : { r: 1, g: 1, b: 1, a: 0 },
			renderPos    : { top: 0, left: 0 },
			renderSize   : 1,
			renderRotate : 0,
		}
	}


	// MARK: clear
	/** Kills every live particle and drops pending emitters. */
	clear(): void {
		for (const p of this.pool) {
			p.alive    = false
			p.onExpire = undefined
		}
		this.pending.length = 0
	}


	// MARK: activeCount
	/** Number of currently alive particles. */
	activeCount(): number {
		let n = 0
		for (const p of this.pool) {
			if (p.alive) n++
		}
		return n
	}


	// MARK: alloc
	/** Returns the next free slot, or `undefined` when the pool is full. */
	private alloc(): ParticleState | undefined {
		for (const p of this.pool) {
			if (!p.alive) return p
		}
		return undefined
	}


	// MARK: spawnOne
	/** Spawns a single physics particle. Returns false if the pool is full. */
	spawnOne(opts: SpawnParticleOpts): boolean {
		const p = this.alloc()
		if (!p) return false

		const lifetime = opts.lifetime ?? 1.5

		p.alive       = true
		p.mode        = 'physics'
		p.x           = opts.origin.x
		p.y           = opts.origin.y
		p.vx          = opts.vx ?? 0
		p.vy          = opts.vy ?? 0
		p.gravity     = opts.gravity ?? 0
		p.drag        = opts.drag ?? 0
		p.angleDeg    = opts.angleDeg ?? 0
		p.angularVel  = opts.angularVel ?? 0
		p.baseSize    = opts.size ?? 32
		p.scale       = 1
		p.opacity     = 1
		p.color       = opts.color ?? WHITE
		p.life        = lifetime
		p.maxLife     = lifetime
		p.src         = opts.src ?? DEFAULT_SRC
		p.baseUvs     = opts.uvs ?? DEFAULT_UVS
		p.swayAmp     = opts.swayAmp ?? 0
		p.swayFreq    = opts.swayFreq ?? 0
		p.swayPhase   = Math.random() * Math.PI * 2
		p.pathT       = 0
		p.pathEasing  = undefined
		p.onExpire    = opts.onExpire
		this.syncRender(p)

		return true
	}


	// MARK: spawnBurst
	/** Spawns a physics burst. Returns how many particles were allocated. */
	spawnBurst(opts: SpawnBurstOpts): number {
		const count      = opts.count ?? 24
		const lifetime   = opts.lifetime ?? 1.6
		const gravity    = opts.gravity ?? 900
		const speedMin   = opts.speed?.min ?? 280
		const speedMax   = opts.speed?.max ?? 520
		const sizeMin    = opts.size?.min ?? 20
		const sizeMax    = opts.size?.max ?? 48
		const angMin     = opts.angularVel?.min ?? -180
		const angMax     = opts.angularVel?.max ?? 180
		const colors     = opts.colors
		const uvsList    = opts.uvs
		const src        = opts.src ?? DEFAULT_SRC
		const drag       = opts.drag ?? 0.15
		const swayAmp    = opts.swayAmp ?? 0
		const swayFreq   = opts.swayFreq ?? 0
		const aimDeg     = opts.aimDeg ?? 0
		const coneDeg    = opts.coneDeg

		let spawned = 0
		for (let i = 0; i < count; i++) {
			let dirDeg: number
			if (coneDeg === undefined) {
				dirDeg = Math.random() * 360
			} else {
				dirDeg = aimDeg + randRange(-coneDeg, coneDeg)
			}
			// 0° = up (−Y), clockwise positive
			const rad = (dirDeg - 90) * Math.PI / 180
			const spd = randRange(speedMin, speedMax)

			const ok = this.spawnOne({
				origin     : opts.origin,
				vx         : Math.cos(rad) * spd,
				vy         : Math.sin(rad) * spd,
				gravity    : gravity,
				lifetime   : lifetime * randRange(0.75, 1.15),
				size       : randRange(sizeMin, sizeMax),
				angularVel : randRange(angMin, angMax),
				angleDeg   : Math.random() * 360,
				color      : colors && colors.length > 0 ? pick(colors) : WHITE,
				uvs        : uvsList && uvsList.length > 0 ? pick(uvsList) : DEFAULT_UVS,
				src        : src,
				drag       : drag,
				swayAmp    : swayAmp,
				swayFreq   : swayFreq,
				onExpire   : opts.onExpire,
			})
			if (ok) spawned++
			else break
		}
		return spawned
	}


	// MARK: spawnStream
	/**
	 * Schedules a staggered path-mode stream from `from` to `to`.
	 * Each particle follows a quadratic arc with a random perpendicular offset.
	 */
	spawnStream(opts: SpawnStreamOpts): void {
		const count      = opts.count ?? 12
		const duration   = opts.duration ?? 0.85
		const stagger    = opts.stagger ?? 0.05
		const arcSpread  = opts.arcSpread ?? 80
		const easing     : EasingFn = opts.easing ?? easingFunctions.easeOutCubic
		const scalePeak  = opts.scalePeak ?? 1.15
		const size       = opts.size ?? 40
		const src        = opts.src ?? DEFAULT_SRC
		const angMin     = opts.angularVel?.min ?? -90
		const angMax     = opts.angularVel?.max ?? 90
		const colors     = opts.colors
		const uvChoices  = opts.uvChoices
		const singleUvs  = opts.uvs

		const dx = opts.to.x - opts.from.x
		const dy = opts.to.y - opts.from.y
		const len = Math.sqrt(dx * dx + dy * dy) || 1
		const nx = -dy / len
		const ny = dx / len
		const midX = (opts.from.x + opts.to.x) * 0.5
		const midY = (opts.from.y + opts.to.y) * 0.5

		for (let i = 0; i < count; i++) {
			const delay = i * stagger
			this.pending.push({
				remaining: 1,
				interval : 0,
				elapsed  : -delay,
				spawn    : () => {
					const p = this.alloc()
					if (!p) return

					const offset = randRange(-arcSpread, arcSpread)
					const ctrlX  = midX + nx * offset
					const ctrlY  = midY + ny * offset - Math.abs(offset) * 0.15

					p.alive        = true
					p.mode         = 'path'
					p.x            = opts.from.x
					p.y            = opts.from.y
					p.vx           = 0
					p.vy           = 0
					p.gravity      = 0
					p.drag         = 0
					p.angleDeg     = Math.random() * 360
					p.angularVel   = randRange(angMin, angMax)
					p.baseSize     = size
					p.scale        = scaleEnvelope(0, scalePeak)
					p.opacity      = 1
					p.color        = colors && colors.length > 0
						? pick(colors)
						: (opts.color ?? WHITE)
					p.life         = duration
					p.maxLife      = duration
					p.src          = src
					p.baseUvs      = uvChoices && uvChoices.length > 0
						? pick(uvChoices)
						: (singleUvs ?? DEFAULT_UVS)
					p.swayAmp      = 0
					p.swayFreq     = 0
					p.swayPhase    = 0
					p.pathFromX    = opts.from.x
					p.pathFromY    = opts.from.y
					p.pathCtrlX    = ctrlX
					p.pathCtrlY    = ctrlY
					p.pathToX      = opts.to.x
					p.pathToY      = opts.to.y
					p.pathT        = 0
					p.pathDuration = duration
					p.pathEasing   = easing
					p.scalePeak    = scalePeak
					p.onExpire     = undefined
					this.syncRender(p)
				},
			})
		}
	}


	// MARK: spawnHoming
	/**
	 * Schedules a staggered homing stream: launch with velocity, then steer
	 * toward `to`. Steer ramps over life so particles read as a burst first.
	 */
	spawnHoming(opts: SpawnHomingOpts): void {
		const count        = opts.count ?? 10
		const stagger      = opts.stagger ?? 0.05
		const lifetime     = opts.lifetime ?? 1.25
		const speedMin     = opts.launchSpeed?.min ?? 380
		const speedMax     = opts.launchSpeed?.max ?? 620
		const aimDeg       = opts.aimDeg ?? -40
		const coneDeg      = opts.coneDeg ?? 35
		const seekSpeed    = opts.seekSpeed ?? 980
		const steerRate    = opts.steer ?? 4.5
		const arriveRadius = opts.arriveRadius ?? 28
		const scalePeak    = opts.scalePeak ?? 1.2
		const size         = opts.size ?? 40
		const src          = opts.src ?? DEFAULT_SRC
		const angMin       = opts.angularVel?.min ?? -90
		const angMax       = opts.angularVel?.max ?? 90
		const colors       = opts.colors
		const uvChoices    = opts.uvChoices
		const singleUvs    = opts.uvs

		for (let i = 0; i < count; i++) {
			const delay = i * stagger
			this.pending.push({
				remaining: 1,
				interval : 0,
				elapsed  : -delay,
				spawn    : () => {
					const p = this.alloc()
					if (!p) return

					const dirDeg = aimDeg + randRange(-coneDeg, coneDeg)
					const rad    = (dirDeg - 90) * Math.PI / 180
					const spd    = randRange(speedMin, speedMax)

					p.alive        = true
					p.mode         = 'homing'
					p.x            = opts.from.x
					p.y            = opts.from.y
					p.vx           = Math.cos(rad) * spd
					p.vy           = Math.sin(rad) * spd
					p.gravity      = 0
					p.drag         = 0
					p.angleDeg     = Math.random() * 360
					p.angularVel   = randRange(angMin, angMax)
					p.baseSize     = size
					p.scale        = scaleEnvelope(0, scalePeak)
					p.opacity      = 1
					p.color        = colors && colors.length > 0
						? pick(colors)
						: (opts.color ?? WHITE)
					p.life         = lifetime * randRange(0.9, 1.1)
					p.maxLife      = p.life
					p.src          = src
					p.baseUvs      = uvChoices && uvChoices.length > 0
						? pick(uvChoices)
						: (singleUvs ?? DEFAULT_UVS)
					p.swayAmp      = 0
					p.swayFreq     = 0
					p.swayPhase    = 0
					p.pathFromX    = opts.from.x
					p.pathFromY    = opts.from.y
					p.pathToX      = opts.to.x
					p.pathToY      = opts.to.y
					p.pathT        = 0
					p.pathDuration = lifetime
					p.pathEasing   = undefined
					p.scalePeak    = scalePeak
					p.seekSpeed    = seekSpeed * randRange(0.9, 1.1)
					p.steerRate    = steerRate * randRange(0.85, 1.15)
					p.arriveRadius = arriveRadius
					p.onExpire     = undefined
					this.syncRender(p)
				},
			})
		}
	}


	// MARK: scheduleEmitter
	/**
	 * Emits `total` particles over `duration` seconds by calling `spawn` each
	 * interval. Used by snowfall.
	 */
	scheduleEmitter(
		total   : number,
		duration: number,
		spawn   : () => void,
	): void {
		if (total <= 0 || duration <= 0) {
			for (let i = 0; i < total; i++) spawn()
			return
		}
		const interval = duration / total
		this.pending.push({
			remaining: total,
			interval : interval,
			elapsed  : 0,
			spawn    : spawn,
		})
	}


	// MARK: tick
	/** Advances the pool and pending emitters by `dt` seconds. */
	tick(dt: number): void {
		this.tickPending(dt)

		for (const p of this.pool) {
			if (!p.alive) continue

			if (p.mode === 'path') {
				this.tickPath(p, dt)
			} else if (p.mode === 'homing') {
				this.tickHoming(p, dt)
			} else {
				this.tickPhysics(p, dt)
			}

			if (!p.alive) continue

			p.angleDeg += p.angularVel * dt
			if (p.angleDeg > 360 || p.angleDeg < -360) {
				p.angleDeg = p.angleDeg % 360
			}

			const lifeT = p.maxLife > 0 ? 1 - (p.life / p.maxLife) : 1
			if (p.mode === 'physics') {
				p.opacity = Math.max(0, 1 - lifeT * lifeT)
				p.scale   = Math.max(0.2, 1 - lifeT * 0.35)
			}

			this.syncRender(p)
		}
	}


	// MARK: syncRender
	/**
	 * Writes Icon draw state into the particle’s stable render objects.
	 * Call only while `alive` so idle slots keep last-hidden props unchanged.
	 */
	private syncRender(p: ParticleState): void {
		const size = Math.max(1, Math.round(p.baseSize * p.scale))
		p.renderSize        = size
		p.renderPos.left    = Math.round(p.x - size * 0.5)
		p.renderPos.top     = Math.round(p.y - size * 0.5)
		p.renderRotate      = Math.round(p.angleDeg)
		p.renderTint.r      = p.color.r
		p.renderTint.g      = p.color.g
		p.renderTint.b      = p.color.b
		p.renderTint.a      = Math.max(0, Math.min(1, p.color.a * p.opacity))
	}


	// MARK: tickPending
	/** Drains delayed / repeating spawn schedules. */
	private tickPending(dt: number): void {
		for (let i = this.pending.length - 1; i >= 0; i--) {
			const job = this.pending[i]
			job.elapsed += dt

			if (job.interval <= 0) {
				if (job.elapsed >= 0) {
					job.spawn()
					job.remaining--
				}
			} else {
				while (job.remaining > 0 && job.elapsed >= job.interval) {
					job.elapsed -= job.interval
					job.spawn()
					job.remaining--
				}
			}

			if (job.remaining <= 0) {
				this.pending.splice(i, 1)
			}
		}
	}


	// MARK: tickPhysics
	/** Integrates one physics particle; frees it when life runs out. */
	private tickPhysics(
		p : ParticleState,
		dt: number,
	): void {
		p.life -= dt
		if (p.life <= 0) {
			this.expire(p)
			return
		}

		p.vy += p.gravity * dt
		if (p.drag > 0) {
			const damp = Math.max(0, 1 - p.drag * dt)
			p.vx *= damp
			p.vy *= damp
		}

		let swayX = 0
		if (p.swayAmp > 0 && p.swayFreq > 0) {
			swayX = Math.sin((p.maxLife - p.life) * p.swayFreq * Math.PI * 2 + p.swayPhase) * p.swayAmp * dt
		}

		p.x += p.vx * dt + swayX
		p.y += p.vy * dt
	}


	// MARK: tickPath
	/** Advances one path particle along its eased Bezier. */
	private tickPath(
		p : ParticleState,
		dt: number,
	): void {
		p.life -= dt
		p.pathT += dt / Math.max(0.001, p.pathDuration)
		if (p.pathT >= 1 || p.life <= 0) {
			p.x = p.pathToX
			p.y = p.pathToY
			this.expire(p)
			return
		}

		const ease = p.pathEasing ?? easingFunctions.linear
		const t    = ease(Math.max(0, Math.min(1, p.pathT)))
		const pos  = bezier2(
			p.pathFromX, p.pathFromY,
			p.pathCtrlX, p.pathCtrlY,
			p.pathToX,   p.pathToY,
			t,
		)
		p.x       = pos.x
		p.y       = pos.y
		p.scale   = scaleEnvelope(t, p.scalePeak)
		p.opacity = t < 0.1 ? t / 0.1 : (t > 0.85 ? (1 - t) / 0.15 : 1)
	}


	// MARK: tickHoming
	/**
	 * Ballistic launch, then seek toward the target. Steer strength ramps with
	 * age so early motion follows `vx`/`vy` and later motion locks on.
	 */
	private tickHoming(
		p : ParticleState,
		dt: number,
	): void {
		p.life -= dt
		const age = p.maxLife > 0 ? 1 - (p.life / p.maxLife) : 1

		const dx   = p.pathToX - p.x
		const dy   = p.pathToY - p.y
		const dist = Math.sqrt(dx * dx + dy * dy)

		if (dist <= p.arriveRadius || p.life <= 0) {
			p.x = p.pathToX
			p.y = p.pathToY
			this.expire(p)
			return
		}

		const inv        = 1 / dist
		const desiredVx  = dx * inv * p.seekSpeed
		const desiredVy  = dy * inv * p.seekSpeed
		// Quadratic ramp: mostly launch early, strong lock-on late.
		const steerBlend = 0.12 + 0.88 * (age * age)
		const steer      = Math.min(1, p.steerRate * steerBlend * dt)

		p.vx += (desiredVx - p.vx) * steer
		p.vy += (desiredVy - p.vy) * steer
		p.x  += p.vx * dt
		p.y  += p.vy * dt

		p.scale   = scaleEnvelope(age, p.scalePeak)
		p.opacity = age < 0.08 ? age / 0.08 : (age > 0.88 ? (1 - age) / 0.12 : 1)
	}


	// MARK: expire
	/** Frees a particle and optionally fires its chain burst. */
	private expire(p: ParticleState): void {
		const chain = p.onExpire
		const ox    = p.x
		const oy    = p.y
		p.alive    = false
		p.onExpire = undefined

		if (chain) {
			this.spawnBurst({
				...chain,
				origin: { x: ox, y: oy },
			})
		}
	}
}
