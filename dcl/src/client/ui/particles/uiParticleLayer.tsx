import { engine } from '@dcl/sdk/ecs'
import { getPlatform, isMobile } from '@dcl/sdk/platform'
import ReactEcs from '@dcl/sdk/react-ecs'
import { Icon, Layer, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import {
	emitExplosion,
	emitFirework,
	emitSnow,
	emitStarburst,
	emitTicketStream,
} from 'src/client/ui/particles/presets'
import { ParticleSim } from 'src/client/ui/particles/sim'
import type {
	SnowOpts,
	SpawnBurstOpts,
	SpawnHomingOpts,
	Vec2,
} from 'src/client/ui/particles/types'


// MARK: isUiParticlesEnabled
/**
 * UI particles run on desktop only. Until `getPlatform()` resolves,
 * `isMobile()` is false on every client — treat unknown as disabled so mobile
 * never mounts the Icon pool during that window.
 */
function isUiParticlesEnabled(): boolean {
	if (getPlatform() === null) return false
	return !isMobile()
}


// MARK: UiParticleLayer
/**
 * Always-mounted FullScreen overlay that renders pooled UI particles.
 * Sits above reward popups (`zIndex` 1700) and under the loading screen (2000).
 * Does not register pointer handlers so it never steals clicks.
 * Disabled entirely on mobile (no pool Icons, no sim tick, spawn APIs no-op).
 */
export class UiParticleLayer extends Layer {
	readonly sim = new ParticleSim()

	constructor() {
		super({
			id         : 'bowling-ui-particles',
			zone       : ZoneType.FullScreen,
			canBeHidden: false,
			zIndex     : 1800,
			uiTransform: {
				flexDirection : 'column',
				justifyContent: 'flex-start',
				alignItems    : 'flex-start',
				borderWidth   : 0,
			},
		})

		engine.addSystem((dt: number) => {
			if (!isUiParticlesEnabled()) return
			this.sim.tick(dt)
		})
	}


	// MARK: burst
	/** Multicolor starburst from screen centre (or `origin`). No-op on mobile. */
	burst(origin?: Vec2): void {
		if (!isUiParticlesEnabled()) return
		emitStarburst(this.sim, origin)
	}


	// MARK: explosion
	/** Omnidirectional explosion at `origin`. No-op on mobile. */
	explosion(
		origin: Vec2,
		opts? : Partial<SpawnBurstOpts>,
	): void {
		if (!isUiParticlesEnabled()) return
		emitExplosion(this.sim, origin, opts)
	}


	// MARK: firework
	/** Rising shell that detonates into an explosion. No-op on mobile. */
	firework(origin?: Vec2): void {
		if (!isUiParticlesEnabled()) return
		emitFirework(this.sim, origin)
	}


	// MARK: snow
	/** Timed snowfall across the top of the screen. No-op on mobile. */
	snow(opts?: SnowOpts): void {
		if (!isUiParticlesEnabled()) return
		emitSnow(this.sim, opts)
	}


	// MARK: stream
	/** Homing ticket stream (default: centre → ticket chip). No-op on mobile. */
	stream(opts?: Partial<SpawnHomingOpts>): void {
		if (!isUiParticlesEnabled()) return
		emitTicketStream(this.sim, opts)
	}


	// MARK: clear
	/** Removes all live particles and pending emitters. */
	clear(): void {
		this.sim.clear()
	}


	// MARK: body
	protected body() {
		if (!isUiParticlesEnabled()) return []

		const nodes: ReactEcs.JSX.Element[] = []

		// Always mount every pool slot (display none when idle) so React-ECS
		// does not churn entities as particles spawn and die. Idle slots keep
		// stable object refs (tint / position) so we do not flood UI updates.
		for (let i = 0; i < this.sim.pool.length; i++) {
			const p = this.sim.pool[i]

			nodes.push(
				<Icon
					key           = {`ui-particle-${i}`}
					src           = {p.src}
					uvs           = {p.baseUvs}
					rotate        = {p.renderRotate}
					width         = {p.renderSize}
					height        = {p.renderSize}
					iconColor     = {p.renderTint}
					positionType  = "absolute"
					position      = {p.renderPos}
					display       = {p.alive ? 'flex' : 'none'}
					pointerFilter = "none"
				/>,
			)
		}

		return [
			<UiBox
				key           = "ui-particles-root"
				width         = "100%"
				height        = "100%"
				positionType  = "absolute"
				position      = {{ top: 0, left: 0, right: 0, bottom: 0 }}
				pointerFilter = "none"
			>
				{nodes}
			</UiBox>,
		]
	}
}


export const uiParticleLayer = new UiParticleLayer()


// MARK: UiParticles
/**
 * Convenience facade over {@link uiParticleLayer} for callers outside the
 * layer module (reward hooks, debug buttons).
 */
export const UiParticles = {
	burst    : (origin?: Vec2) => uiParticleLayer.burst(origin),
	explosion: (origin: Vec2, opts?: Partial<SpawnBurstOpts>) => uiParticleLayer.explosion(origin, opts),
	firework : (origin?: Vec2) => uiParticleLayer.firework(origin),
	snow     : (opts?: SnowOpts) => uiParticleLayer.snow(opts),
	stream   : (opts?: Partial<SpawnHomingOpts>) => uiParticleLayer.stream(opts),
	clear    : () => uiParticleLayer.clear(),
}
