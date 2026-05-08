import { EasingFunction, engine } from "@dcl/sdk/ecs"


const easingFunctions: Record<EasingFunction, (t: number) => number> = {
	[EasingFunction.EF_LINEAR]        :  (t) => t,
	[EasingFunction.EF_EASEBACK]      :  (t) => { const c = 1.70158 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2 },
	[EasingFunction.EF_EASEBOUNCE]    :  (t) => t < 0.5 ? (1 - easingFunctions[EasingFunction.EF_EASEOUTBOUNCE](1 - 2 * t)) / 2 : (1 + easingFunctions[EasingFunction.EF_EASEOUTBOUNCE](2 * t - 1)) / 2,
	[EasingFunction.EF_EASECIRC]      :  (t) => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
	[EasingFunction.EF_EASECUBIC]     :  (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
	[EasingFunction.EF_EASEELASTIC]   :  (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 + 1,
	[EasingFunction.EF_EASEEXPO]      :  (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
	[EasingFunction.EF_EASEINBACK]    :  (t) => 2.70158 * t * t * t - 1.70158 * t * t,
	[EasingFunction.EF_EASEINBOUNCE]  :  (t) => 1 - easingFunctions[EasingFunction.EF_EASEOUTBOUNCE](1 - t),
	[EasingFunction.EF_EASEINCIRC]    :  (t) => 1 - Math.sqrt(1 - t * t),
	[EasingFunction.EF_EASEINCUBIC]   :  (t) => t * t * t,
	[EasingFunction.EF_EASEINELASTIC] :  (t) => t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3),
	[EasingFunction.EF_EASEINEXPO]    :  (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
	[EasingFunction.EF_EASEINQUAD]    :  (t) => t * t,
	[EasingFunction.EF_EASEINQUART]   :  (t) => t * t * t * t,
	[EasingFunction.EF_EASEINQUINT]   :  (t) => t * t * t * t * t,
	[EasingFunction.EF_EASEINSINE]    :  (t) => 1 - Math.cos((t * Math.PI) / 2),
	[EasingFunction.EF_EASEOUTBACK]   :  (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) },
	[EasingFunction.EF_EASEOUTCIRC]   :  (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
	[EasingFunction.EF_EASEOUTCUBIC]  :  (t) => 1 - Math.pow(1 - t, 3),
	[EasingFunction.EF_EASEOUTELASTIC]:  (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
	[EasingFunction.EF_EASEOUTEXPO]   :  (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
	[EasingFunction.EF_EASEOUTQUAD]   :  (t) => t * (2 - t),
	[EasingFunction.EF_EASEOUTQUART]  :  (t) => 1 - Math.pow(1 - t, 4),
	[EasingFunction.EF_EASEOUTQUINT]  :  (t) => 1 - Math.pow(1 - t, 5),
	[EasingFunction.EF_EASEOUTSINE]   :  (t) => Math.sin((t * Math.PI) / 2),
	[EasingFunction.EF_EASEQUAD]      :  (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
	[EasingFunction.EF_EASEQUART]     :  (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
	[EasingFunction.EF_EASEQUINT]     :  (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
	[EasingFunction.EF_EASESINE]      :  (t) => -(Math.cos(Math.PI * t) - 1) / 2,
	[EasingFunction.EF_EASEOUTBOUNCE] :  (t) => {
		if (t < 1 / 2.75) return 7.5625 * t * t
		if (t < 2 / 2.75) return 7.5625 * (t   -= 1.5 / 2.75) * t + 0.75
		if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
		return 7.5625 * (t                     -= 2.625 / 2.75) * t + 0.984375
	},
}

// MARK: Helpers
export function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t
}

export function applyEasing(t: number, easing: EasingFunction): number {
	return easingFunctions[easing](t)
}

export function tweenValue(
	from       : number,
	to         : number,
	duration   : number = 0.35,
	onUpdate   : (v: number) => void,
	onComplete?: () => void,
	easing     : EasingFunction = EasingFunction.EF_EASEOUTBACK
) {
	let elapsed = 0

	function system(dt: number) {
		elapsed += dt
		const t = Math.min(elapsed / duration, 1)
		const easedT = easing != null ? applyEasing(t, easing) : t
		onUpdate(lerp(from, to, easedT))

		if (t >= 1) {
			onUpdate(to)
			engine.removeSystem(system)
			onComplete?.()
		}
	}

	engine.addSystem(system)
}