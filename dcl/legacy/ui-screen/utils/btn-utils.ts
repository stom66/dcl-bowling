export const buttonUVs     : number[][]    = [
	[0, 0.75, 0, 1, 1, 1, 1, 0.75],     // NORMAL
	[0, 0.5, 0, 0.75, 1, 0.75, 1, 0.5], // HOVER
	[0, 0.25, 0, 0.5, 1, 0.5, 1, 0.25], // PRESSED
	[0, 0, 0, 0.25, 1, 0.25, 1, 0],     // DISABLED
]

export enum BtnStateUVIndex {
	NORMAL   = 0,
	HOVER    = 1,
	PRESSED  = 2,
	DISABLED = 3,
}


// Fetches the right UVs cords to get a number from the icon atlas
// Note only 0-10 are supported
export function getUVsForIconAtlasNumber(number: number): number[] {
	var y = 0.125
	if (number >= 8) {
		y = 0
		number = number - 8
	}
	//console.log('getUVsForIconAtlasNumber: number', number)
	return [
		number * 0.125, y, 
		number * 0.125, y + 0.125, 
		(number + 1) * 0.125, y + 0.125, 
		(number + 1) * 0.125, y
	]

}