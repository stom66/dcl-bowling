import { engine, PBUiCanvasInformation, UiCanvasInformation } from "@dcl/sdk/ecs"

const BASE_WIDTH  = 1920
const BASE_HEIGHT = 1080

var actual_width = BASE_WIDTH
var actual_height = BASE_HEIGHT


// MARK: getCanvasInfo
/**
 * Canvas dimensions when React/UI has mounted them on the root entity;
 * `null` on early frames (preview/worker) before {@link UiCanvasInformation} exists.
 */
export function getCanvasInfo(): PBUiCanvasInformation | null {
	return UiCanvasInformation.getOrNull(engine.RootEntity)
}


// MARK: readCanvasDimensions
/** Prefer live canvas size; fall back to last known or {@link BASE_WIDTH}/{@link BASE_HEIGHT}. */
function readCanvasDimensions(): { height: number; width: number } {
	const canvasInfo = getCanvasInfo()
	if (canvasInfo) {
		return { height: canvasInfo.height, width: canvasInfo.width }
	}
	return { height: actual_height, width: actual_width }
}

export function vhAsPixels(vh: number, min: number = 0, max: number = 99999): number {
	const height = readCanvasDimensions().height
	const value = Math.max(min, Math.min(max, (vh / 100) * height))
	return value
}

export function vwAsPixels(vw: number, min: number = 0, max: number = 99999): number {
	const width = readCanvasDimensions().width
	const value = Math.max(min, Math.min(max, (vw / 100) * width))
	return value
}


// MARK: pixelsScaledRelative
export function pixelsScaledRelative(
	value      : number,
	normalSize : number,
	currentSize: number
): number {
	return value * (currentSize / normalSize)
}



// MARK: system_updateCanvasSize
function system_updateCanvasSize(_dt: number): void {
	const canvasInfo = getCanvasInfo()
	if (!canvasInfo) return

	if (actual_width !== canvasInfo.width)   actual_width  = canvasInfo.width
	if (actual_height !== canvasInfo.height) actual_height = canvasInfo.height
}

engine.addSystem(system_updateCanvasSize)

