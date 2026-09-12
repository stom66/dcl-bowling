import { TextureAtlas } from '@stom66/dcl-ui-component-kit'


const THEME_ASSET_PATH = 'assets/images/themes/bowling'


// MARK: primaryButtonAtlas
export const primaryButtonAtlas = new TextureAtlas({
	source : `${THEME_ASSET_PATH}/btn-primary-atlas-b.png`,
	columns: 1,
	rows   : 4,
	named  : {
		default : { yStart: 4 },
		hover   : { yStart: 3 },
		press   : { yStart: 2 },
		disabled: { yStart: 1 },
	},
})


// MARK: secondaryButtonAtlas
export const secondaryButtonAtlas = new TextureAtlas({
	source : `${THEME_ASSET_PATH}/btn-secondary-atlas-b.png`,
	columns: 1,
	rows   : 4,
	named  : {
		default : { yStart: 4 },
		hover   : { yStart: 3 },
		press   : { yStart: 2 },
		disabled: { yStart: 1 },
	},
})


// MARK: laneInfoAtlas
export const laneInfoAtlas = new TextureAtlas({
	source: `${THEME_ASSET_PATH}/btn-info-atlas.png`,
	columns: 1,
	rows   : 4,
	named  : {
		open     : { yStart: 4 },
		starting : { yStart: 3 },
		occupied : { yStart: 2 },
		disabled : { yStart: 1 },
	},
})


// MARK: bowlingIconAtlas
export const bowlingIconAtlas = new TextureAtlas({
	source : `${THEME_ASSET_PATH}/icon-atlas.png`,
	columns: 8,
	rows   : 8,
	named  : {
		n0        : { xStart: 1, yStart: 2 },
		n1        : { xStart: 2, yStart: 2 },
		n2        : { xStart: 3, yStart: 2 },
		n3        : { xStart: 4, yStart: 2 },
		n4        : { xStart: 5, yStart: 2 },
		n5        : { xStart: 6, yStart: 2 },
		n6        : { xStart: 7, yStart: 2 },
		n7        : { xStart: 8, yStart: 2 },
		n8        : { xStart: 1, yStart: 1 },
		n9        : { xStart: 2, yStart: 1 },
		n10       : { xStart: 3, yStart: 1 },
		lane1     : { xStart: 1, yStart: 8 },
		lane2     : { xStart: 2, yStart: 8 },
		lane3     : { xStart: 3, yStart: 8 },
		lane4     : { xStart: 4, yStart: 8 },
		lane5     : { xStart: 5, yStart: 8 },
		lane6     : { xStart: 6, yStart: 8 },
		leave     : { xStart: 1, xEnd: 4, yStart: 6 },
		clickToSet: { xStart: 1, xEnd: 8, yStart: 3 },
		position  : { xStart: 1, xEnd: 4, yStart: 4 },
		direction : { xStart: 5, xEnd: 8, yStart: 6 },
		strength  : { xStart: 1, xEnd: 4, yStart: 5 },
	},
})


// MARK: bowlingThemeAssets
export const bowlingThemeAssets = {
	backgroundPopup: `${THEME_ASSET_PATH}/bg-popup.png`,
	infoWelcome    : `${THEME_ASSET_PATH}/info-welcome.png`,
	inputBackground: `${THEME_ASSET_PATH}/bowling-input-bg.png`,
	laneNumbers    : `${THEME_ASSET_PATH}/lane-numbers.png`,
}


// MARK: getBowlingDigitUvs
/**
 * UV quad for a 0–10 glyph in {@link bowlingIconAtlas}.
 */
export function getBowlingDigitUvs(value: number): number[] {
	const safe = Math.max(0, Math.min(10, Math.floor(Number.isFinite(value) ? value : 0)))
	switch (safe) {
		case 0:  return bowlingIconAtlas.uv.n0
		case 1:  return bowlingIconAtlas.uv.n1
		case 2:  return bowlingIconAtlas.uv.n2
		case 3:  return bowlingIconAtlas.uv.n3
		case 4:  return bowlingIconAtlas.uv.n4
		case 5:  return bowlingIconAtlas.uv.n5
		case 6:  return bowlingIconAtlas.uv.n6
		case 7:  return bowlingIconAtlas.uv.n7
		case 8:  return bowlingIconAtlas.uv.n8
		case 9:  return bowlingIconAtlas.uv.n9
		default: return bowlingIconAtlas.uv.n10
	}
}


// MARK: getLaneNumberUvs
/**
 * UV quad for the L1–L6 lane badge in {@link bowlingIconAtlas}.
 */
export function getLaneNumberUvs(laneIndex: number): number[] {
	switch (laneIndex) {
		case 0:  return bowlingIconAtlas.uv.lane1
		case 1:  return bowlingIconAtlas.uv.lane2
		case 2:  return bowlingIconAtlas.uv.lane3
		case 3:  return bowlingIconAtlas.uv.lane4
		case 4:  return bowlingIconAtlas.uv.lane5
		default: return bowlingIconAtlas.uv.lane6
	}
}
