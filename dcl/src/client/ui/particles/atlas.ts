import { TextureAtlas } from '@stom66/dcl-ui-component-kit'


const PARTICLE_ASSET_PATH = 'assets/images/themes/bowling/particles'


// MARK: uiParticlesAtlas
/**
 * Stub UI particle sheet (`atlas-ui-particles.png`) — 4×4. UV Y is bottom → top,
 * so PNG top row is `yStart: 4` and PNG bottom row is `yStart: 1`.
 *
 * Row 4 (PNG top): starbursts. Row 3: lens flares. Row 2: soft dots / snow.
 * Row 1 (PNG bottom): diamonds / sparkles.
 */
export const uiParticlesAtlas = new TextureAtlas({
	source : `${PARTICLE_ASSET_PATH}/atlas-ui-particles.png`,
	columns: 4,
	rows   : 4,
	named  : {
		starburstGold  : { xStart: 1, yStart: 4 },
		starburstOrange: { xStart: 2, yStart: 4 },
		starburstPink  : { xStart: 3, yStart: 4 },
		starburstCyan  : { xStart: 4, yStart: 4 },
		flareWarm      : { xStart: 1, yStart: 3 },
		flareOrange    : { xStart: 2, yStart: 3 },
		flarePurple    : { xStart: 3, yStart: 3 },
		flareCyan      : { xStart: 4, yStart: 3 },
		dotWhite       : { xStart: 1, yStart: 2 },
		dotBlue        : { xStart: 2, yStart: 2 },
		snow           : { xStart: 3, yStart: 2 },
		snowSoft       : { xStart: 4, yStart: 2 },
		diamondGold    : { xStart: 1, yStart: 1 },
		diamondRed     : { xStart: 2, yStart: 1 },
		diamondGreen   : { xStart: 3, yStart: 1 },
		diamondPurple  : { xStart: 4, yStart: 1 },
	},
})


/** Named UV cells used by multicolor starburst / firework presets. */
export const STARBURST_UVS: number[][] = [
	uiParticlesAtlas.uv.starburstGold,
	uiParticlesAtlas.uv.starburstOrange,
	uiParticlesAtlas.uv.starburstPink,
	uiParticlesAtlas.uv.starburstCyan,
	uiParticlesAtlas.uv.flareWarm,
	uiParticlesAtlas.uv.flareOrange,
	uiParticlesAtlas.uv.flarePurple,
	uiParticlesAtlas.uv.flareCyan,
	uiParticlesAtlas.uv.diamondGold,
	uiParticlesAtlas.uv.diamondRed,
	uiParticlesAtlas.uv.diamondGreen,
	uiParticlesAtlas.uv.diamondPurple,
]
