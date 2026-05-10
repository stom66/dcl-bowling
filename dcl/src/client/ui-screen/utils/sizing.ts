import { engine, PBUiCanvasInformation, UiCanvasInformation } from "@dcl/sdk/ecs"


function getCanvasInfo(): PBUiCanvasInformation {
	const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
	if (!canvasInfo) {
		throw new Error("Canvas information not found")
	}
	return canvasInfo
}

export function vhAsPixels(vh: number, min: number = 0, max: number = 99999): number {
	const height = getCanvasInfo().height
	const value = Math.max(min, Math.min(max, (vh / 100) * height))
	return value
}

export function vwAsPixels(vw: number, min: number = 0, max: number = 99999): number {
	const width = getCanvasInfo().width
	const value = Math.max(min, Math.min(max, (vw / 100) * width))
	return value
}


export function pixelsScaledRelative(
	value      : number,
	normalSize : number,
	currentSize: number
): number {
	return value * (currentSize / normalSize)
}