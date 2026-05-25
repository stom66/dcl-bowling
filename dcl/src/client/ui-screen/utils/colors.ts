import { Color4 } from "@dcl/sdk/math"

export function darken(
	color : Color4,
	amount: number
): Color4 {
	const sub    = Color4.create(amount, amount, amount, 0)
	const darker = Color4.subtract(color, sub)
	return darker
}

export function lighten(
	color : Color4,
	amount: number
): Color4 {
	const sub    = Color4.create(amount, amount, amount, 0)
	const lighter = Color4.add(color, sub)
	return lighter
}

export function alpha(
	color : Color4,
	amount: number
): Color4 {
	const alpha = Color4.create(color.r, color.g, color.b, amount)
	return alpha
}