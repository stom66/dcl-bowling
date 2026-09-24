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


// MARK: gameIconsAtlas
/**
 * Custom game glyphs (`atlas-gameIcons.png`) — 4×4. UV Y is bottom → top, so
 * PNG top row is `yStart: 4` and PNG bottom row is `yStart: 1`. Colored ball
 * is PNG row 2, column 1 (`yStart: 3`).
 */
export const gameIconsAtlas = new TextureAtlas({
	source : `${THEME_ASSET_PATH}/atlas-gameIcons.png`,
	columns: 4,
	rows   : 4,
	named  : {
		pin      : { xStart: 1, yStart: 4 },
		ball     : { xStart: 2, yStart: 4 },
		ticket   : { xStart: 3, yStart: 4 },
		pinCrown : { xStart: 4, yStart: 4 },
		ballColor: { xStart: 1, yStart: 3 },
	},
})


// MARK: bowlingTextLabelsAtlas
/**
 * Baked HUD copy (`atlas-textLabels.png`) — 1×16. UV Y is bottom → top, so
 * PNG top row is `yStart: 16`. Rows 13–16 are reserved blank cells.
 * Per-cell insets are measured from glyph pixels (frames are full-row).
 */
export const bowlingTextLabelsAtlas = new TextureAtlas({
	source    : `${THEME_ASSET_PATH}/atlas-textLabels.png`,
	columns   : 1,
	rows      : 16,
	filterMode: 'point',
	named     : {
		gameIsStarting        : { yStart: 16, insetLeft: 0.2422, insetRight: 0.2422, insetTop: 0.3281, insetBottom: 0.2188 },
		waitingForNextFrame   : { yStart: 15, insetLeft: 0.0742, insetRight: 0.0723, insetTop: 0.3125, insetBottom: 0.2188 },
		turnIsStarting        : { yStart: 14, insetLeft: 0.2500, insetRight: 0.2520, insetTop: 0.3281, insetBottom: 0.2188 },
		waitingToRoll         : { yStart: 13, insetLeft: 0.2734, insetRight: 0.2734, insetTop: 0.3281, insetBottom: 0.2188 },
		rolling               : { yStart: 12, insetLeft: 0.3926, insetRight: 0.3906, insetTop: 0.3281, insetBottom: 0.2188 },
		hasFinishedRolling    : { yStart: 11, insetLeft: 0.1973, insetRight: 0.1953, insetTop: 0.2969, insetBottom: 0.2188 },
		hasFinishedTheirFrame : { yStart: 10, insetLeft: 0.1191, insetRight: 0.1152, insetTop: 0.3125, insetBottom: 0.2969 },
		gameIsEnding          : { yStart: 9,  insetLeft: 0.2656, insetRight: 0.2656, insetTop: 0.3281, insetBottom: 0.2188 },
		youAreNotInAGame      : { yStart: 8,  insetLeft: 0.1543, insetRight: 0.1543, insetTop: 0.3281, insetBottom: 0.2188 },
		idle                  : { yStart: 7,  insetLeft: 0.4434, insetRight: 0.4414, insetTop: 0.3281, insetBottom: 0.2969 },
		currentTurn           : { yStart: 6,  insetLeft: 0.2402, insetRight: 0.2402, insetTop: 0.3281, insetBottom: 0.2188 },
		seconds               : { yStart: 5,  insetLeft: 0.3398, insetRight: 0.3379, insetTop: 0.3281, insetBottom: 0.2969 },
	},
})


const TEXT_LABEL_CELL_WIDTH  = 512
const TEXT_LABEL_CELL_HEIGHT = 64


// MARK: getBowlingTextLabelSize
/**
 * Pixel size for a baked label at a given height, using the measured glyph
 * crop in {@link bowlingTextLabelsAtlas} (frames are full-row; UV is tight).
 * `maxWidth` caps the box so long lines are not stretched by the parent column.
 */
export function getBowlingTextLabelSize(
	name     : keyof typeof bowlingTextLabelsAtlas.named,
	height   : number,
	maxWidth?: number,
): { width: number, height: number } {
	const cell   = bowlingTextLabelsAtlas.named[name]
	const fracW  = 1 - (cell.insetLeft ?? 0) - (cell.insetRight ?? 0)
	const fracH  = 1 - (cell.insetTop ?? 0) - (cell.insetBottom ?? 0)
	const aspect = (TEXT_LABEL_CELL_WIDTH * fracW) / (TEXT_LABEL_CELL_HEIGHT * fracH)
	let   width  = Math.round(height * aspect)
	if (maxWidth !== undefined && width > maxWidth) {
		width = maxWidth
	}
	return {
		width,
		height,
	}
}


// MARK: bowlingRussoOneAlphaNumericAtlas
/**
 * Russo One alphanumeric sheet (`atlas-chars-russoOne-alphaNumeric.png`) — 8×8.
 * Same cell order as Duck's `atlasCharsAlphaNumeric`. PNG top → bottom;
 * UV Y is bottom → top. Insets trim each side to the visible shadow and keep
 * a few pixels of margin so filtering does not clip it. `0` means the glyph
 * already touches the cell.
 */
export const bowlingRussoOneAlphaNumericAtlas = new TextureAtlas({
	source : `${THEME_ASSET_PATH}/atlas-chars-russoOne-alphaNumeric.png`,
	columns: 8,
	rows   : 8,
	layout : [
		"abcdefgh",
		"ijklmnop",
		"qrstuvwx",
		"yzABCDEF",
		"GHIJKLMN",
		"OPQRSTUV",
		"WXYZ0123",
		"456789",
	],
	charInsets: {
		a: { insetX: 0.15 },
		b: { insetX: 0.14 },
		c: { insetX: 0.17 },
		d: { insetX: 0.15 },
		e: { insetX: 0.16 },
		f: { insetX: 0.17 },
		g: { insetX: 0.15 },
		h: { insetX: 0.14 },
		i: { insetX: 0.30 },
		j: { insetX: 0.19 },
		k: { insetX: 0.13 },
		l: { insetX: 0.27 },
		m: { insetX: 0.00 },
		n: { insetX: 0.14 },
		o: { insetX: 0.14 },
		p: { insetX: 0.14 },
		q: { insetX: 0.14 },
		r: { insetX: 0.20 },
		s: { insetX: 0.14 },
		t: { insetX: 0.21 },
		u: { insetX: 0.14 },
		v: { insetX: 0.13 },
		w: { insetX: 0.00 },
		x: { insetX: 0.15 },
		y: { insetX: 0.11 },
		z: { insetX: 0.16 },
		A: { insetX: 0.06 },
		B: { insetX: 0.09 },
		C: { insetX: 0.13 },
		D: { insetX: 0.10 },
		E: { insetX: 0.12 },
		F: { insetX: 0.12 },
		G: { insetX: 0.10 },
		H: { insetX: 0.10 },
		I: { insetX: 0.24 },
		J: { insetX: 0.21 },
		K: { insetX: 0.09 },
		L: { insetX: 0.12 },
		M: { insetX: 0.03 },
		N: { insetX: 0.11 },
		O: { insetX: 0.08 },
		P: { insetX: 0.08 },
		Q: { insetX: 0.08 },
		R: { insetX: 0.09 },
		S: { insetX: 0.11 },
		T: { insetX: 0.12 },
		U: { insetX: 0.10 },
		V: { insetX: 0.07 },
		W: { insetX: 0.00 },
		X: { insetX: 0.00 },
		Y: { insetX: 0.07 },
		Z: { insetX: 0.13 },
		0: { insetX: 0.12 },
		1: { insetX: 0.24 },
		2: { insetX: 0.14 },
		3: { insetX: 0.14 },
		4: { insetX: 0.09 },
		5: { insetX: 0.13 },
		6: { insetX: 0.11 },
		7: { insetX: 0.14 },
		8: { insetX: 0.11 },
		9: { insetX: 0.13 },
	},
})


// MARK: bowlingRussoOneSymbolsAtlas
/**
 * Russo One symbol sheet (`atlas-chars-russoOne-symbols.png`) — 6×6.
 * Same cell order as Duck's `atlasCharsSymbols`. `x` aliases to `×`.
 * Insets trim each side to the visible shadow and keep a few pixels of
 * margin so filtering does not clip it. `0` means the glyph already
 * touches the cell.
 */
export const bowlingRussoOneSymbolsAtlas = new TextureAtlas({
	source : `${THEME_ASSET_PATH}/atlas-chars-russoOne-symbols.png`,
	columns: 6,
	rows   : 6,
	layout : [
		".'\";()",
		"!?&%@#",
		"÷=$_×:",
		",/+-£€",
		"¥~^*\\|",
		"<>[]{}",
	],
	aliases: {
		'x': '×',
	},
	charInsets: {
		'.' : { insetX: 0.28 },
		"'" : { insetX: 0.31 },
		'"' : { insetX: 0.15 },
		';' : { insetX: 0.29 },
		'(' : { insetX: 0.24 },
		')' : { insetX: 0.22 },
		'!' : { insetX: 0.29 },
		'?' : { insetX: 0.08 },
		'&' : { insetX: 0.04 },
		'%' : { insetX: 0.00 },
		'@' : { insetX: 0.06 },
		'#' : { insetX: 0.00 },
		'÷' : { insetX: 0.11 },
		'=' : { insetX: 0.13 },
		'$' : { insetX: 0.10 },
		'_' : { insetX: 0.14 },
		'×' : { insetX: 0.17 },
		':' : { insetX: 0.28 },
		',' : { insetX: 0.31 },
		'/' : { insetX: 0.23 },
		'+' : { insetX: 0.14 },
		'-' : { insetX: 0.14 },
		'£' : { insetX: 0.10 },
		'€' : { insetX: 0.04 },
		'¥' : { insetX: 0.01 },
		'~' : { insetX: 0.11 },
		'^' : { insetX: 0.10 },
		'*' : { insetX: 0.11 },
		'\\': { insetX: 0.10 },
		'|' : { insetX: 0.31 },
		'<' : { insetX: 0.10 },
		'>' : { insetX: 0.12 },
		'[' : { insetX: 0.25 },
		']' : { insetX: 0.27 },
		'{' : { insetX: 0.24 },
		'}' : { insetX: 0.22 },
	},
})


// MARK: bowlingThemeAssets
export const bowlingThemeAssets = {
	backgroundPopup: `${THEME_ASSET_PATH}/bg-popup.png`,
	infoWelcome    : `${THEME_ASSET_PATH}/info-welcome.png`,
	inputBackground: `${THEME_ASSET_PATH}/bowling-input-bg.png`,
	laneNumbers    : `${THEME_ASSET_PATH}/lane-numbers.png`,
	lockerHeader   : `${THEME_ASSET_PATH}/bg-customisation.png`,
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
