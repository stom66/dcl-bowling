import { ParticleSystem, PBParticleSystem_BlendMode, PBParticleSystem_SimulationSpace } from "@dcl/sdk/ecs"
import { Color4 } from "@dcl/sdk/math"

import { TrailItem } from "src/shared/data/unlocks/types"


const TRAIL_ATLAS_DIR = 'assets/images/unlocks/trails'

const COLOR_WHITE    = Color4.create(1, 1, 1, 1)
const COLOR_FADE_OUT = Color4.create(1, 1, 1, 0)

/** Tight backward spray. Aiming is applied on the unparented emitter in cosmetics. */
const TRAIL_CONE_SHAPE = ParticleSystem.Shape.Cone({
	angle  : 20,
	radius : 0.05,
})


type AtlasTrailConfig = {
	fileName             : string
	tilesX               : number
	tilesY               : number
	framesPerSecond      : number
	rate                 : number
	lifetime             : number
	maxParticles         : number
	initialSize          : { start: number, end: number }
	gravity              : number
	blendMode            : PBParticleSystem_BlendMode
	initialVelocitySpeed : { start: number, end: number }
	initialColor?        : { start: Color4, end: Color4 }
	colorOverTime?       : { start: Color4, end: Color4 }
}



// MARK: atlasTrailEmitter
/**
 * Shared ball-trail emitter for a sprite atlas. World space so particles stay
 * behind the moving ball. Sprite fps should match lifetime for a single play.
 */
function atlasTrailEmitter(
	config : AtlasTrailConfig
): object {
	return {
		rate                : config.rate,
		lifetime            : config.lifetime,
		maxParticles        : config.maxParticles,
		initialSize         : config.initialSize,
		sizeOverTime        : { start: 1.0, end: 1.0 },
		initialColor        : config.initialColor  ?? { start: COLOR_WHITE, end: COLOR_WHITE },
		colorOverTime       : config.colorOverTime ?? { start: COLOR_WHITE, end: COLOR_FADE_OUT },
		initialVelocitySpeed: config.initialVelocitySpeed,
		gravity             : config.gravity,
		blendMode           : config.blendMode,
		billboard           : true,
		faceTravelDirection : false,
		loop                : true,
		shape               : TRAIL_CONE_SHAPE,
		simulationSpace     : PBParticleSystem_SimulationSpace.PSS_WORLD,
		texture             : { src: `${TRAIL_ATLAS_DIR}/${config.fileName}` },
		spriteSheet         : {
			tilesX          : config.tilesX,
			tilesY          : config.tilesY,
			framesPerSecond : config.framesPerSecond,
		},
	}
}


export const trails: Record<string, TrailItem> = {
	'trail-none': {
		name            : 'No Trail',
		description     : 'No particle trail on the ball.',
		ticketCost      : 0,
		defaultUnlocked : true,
		defaultEquipped : true,
		thumbSrc        : 'assets/images/unlocks/trail-none.png',
	},
	'trail-ember': {
		name            : 'Ember Trail',
		description     : 'A trail of glowing embers.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/trail-ember.png',
		emitter         : {
			rate                : 24,
			lifetime            : 1.4,
			maxParticles        : 128,
			initialSize         : { start: 0.08, end: 0.18 },
			sizeOverTime        : { start: 1.0, end: 0.0 },
			initialColor        : {
				start: Color4.create(1, 0.6, 0.1, 1),
				end  : Color4.create(1, 0.2, 0, 1),
			},
			colorOverTime       : {
				start: Color4.create(1, 0.5, 0.1, 1),
				end  : Color4.create(0.2, 0, 0, 0),
			},
			initialVelocitySpeed: { start: 0.4, end: 1.2 },
			gravity             : -0.35,
			blendMode           : PBParticleSystem_BlendMode.PSB_ADD,
			billboard           : true,
			faceTravelDirection : false,
			loop                : true,
			shape               : TRAIL_CONE_SHAPE,
			simulationSpace     : PBParticleSystem_SimulationSpace.PSS_WORLD,
		},
	},
	'trail-dust': {
		name            : 'Dust Cloud',
		description     : 'A puff of lane dust in the ball\'s wake.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-dust.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-dust.png',
			tilesX               : 6,
			tilesY               : 6,
			framesPerSecond      : 30,
			rate                 : 32,
			lifetime             : 1.2,
			maxParticles         : 128,
			initialSize          : { start: 0.22, end: 0.36 },
			gravity              : 0.4,
			blendMode            : PBParticleSystem_BlendMode.PSB_ALPHA,
			initialVelocitySpeed : { start: 0.3, end: 0.8 },
		}),
	},
	'trail-explosion': {
		name            : 'Explosion',
		description     : 'Cartoon fireballs bursting behind the ball.',
		ticketCost      : 15,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-explosion.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-explosion.png',
			tilesX               : 6,
			tilesY               : 6,
			framesPerSecond      : 30,
			rate                 : 32,
			lifetime             : 1.2,
			maxParticles         : 128,
			initialSize          : { start: 0.28, end: 0.45 },
			gravity              : -0.3,
			blendMode            : PBParticleSystem_BlendMode.PSB_ADD,
			initialVelocitySpeed : { start: 0.3, end: 0.8 },
		}),
	},
	'trail-fabric': {
		name            : 'Torn Fabric',
		description     : 'Shreds of orange cloth spinning off the ball.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-fabric.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-fabric.png',
			tilesX               : 6,
			tilesY               : 6,
			framesPerSecond      : 28,
			rate                 : 32,
			lifetime             : 1.3,
			maxParticles         : 128,
			initialSize          : { start: 0.2, end: 0.34 },
			gravity              : 0.4,
			blendMode            : PBParticleSystem_BlendMode.PSB_ALPHA,
			initialVelocitySpeed : { start: 0.4, end: 1.0 },
		}),
	},
	'trail-feathers': {
		name            : 'Feathers',
		description     : 'Purple feathers drifting behind the roll.',
		ticketCost      : 15,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-feathers.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-feathers.png',
			tilesX               : 4,
			tilesY               : 4,
			framesPerSecond      : 10,
			rate                 : 32,
			lifetime             : 1.6,
			maxParticles         : 128,
			initialSize          : { start: 0.12, end: 0.22 },
			gravity              : 0.2,
			blendMode            : PBParticleSystem_BlendMode.PSB_ALPHA,
			initialVelocitySpeed : { start: 0.3, end: 0.9 },
		}),
	},
	'trail-firework': {
		name            : 'Firework',
		description     : 'White bursts that bloom and scatter like fireworks.',
		ticketCost      : 15,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-firework.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-firework.png',
			tilesX               : 4,
			tilesY               : 4,
			framesPerSecond      : 18,
			rate                 : 64,
			lifetime             : 0.9,
			maxParticles         : 128,
			initialSize          : { start: 0.3, end: 0.5 },
			gravity              : -0.4,
			blendMode            : PBParticleSystem_BlendMode.PSB_ADD,
			initialVelocitySpeed : { start: 0.4, end: 1.0 },
			initialColor         : {
				start: Color4.create(1, 0.85, 0.35, 1),
				end  : Color4.create(1, 0.35, 0.7, 1),
			},
			colorOverTime        : {
				start: Color4.create(1, 0.9, 0.5, 1),
				end  : Color4.create(1, 0.2, 0.45, 0),
			},
		}),
	},
	'trail-fuel': {
		name            : 'Toxic Fuel',
		description     : 'Glowing green slime splattering off the ball.',
		ticketCost      : 15,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-fuel.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-fuel.png',
			tilesX               : 6,
			tilesY               : 6,
			framesPerSecond      : 30,
			rate                 : 32,
			lifetime             : 1.2,
			maxParticles         : 128,
			initialSize          : { start: 0.22, end: 0.38 },
			gravity              : 0.45,
			blendMode            : PBParticleSystem_BlendMode.PSB_ADD,
			initialVelocitySpeed : { start: 0.2, end: 0.7 },
		}),
	},
	'trail-pigeons': {
		name            : 'Pigeons',
		description     : 'A few startled pigeons tumbling out of the way.',
		ticketCost      : 25,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-pigeons.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-pigeons.png',
			tilesX               : 2,
			tilesY               : 2,
			framesPerSecond      : 8,
			rate                 : 32,
			lifetime             : 1.4,
			maxParticles         : 128,
			initialSize          : { start: 0.2, end: 0.32 },
			gravity              : 0.55,
			blendMode            : PBParticleSystem_BlendMode.PSB_ALPHA,
			initialVelocitySpeed : { start: 0.8, end: 1.8 },
		}),
	},
	'trail-sparkles': {
		name            : 'Sparkles',
		description     : 'Gold glitter swirling off the ball.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-sparkles.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-sparkles.png',
			tilesX               : 6,
			tilesY               : 6,
			framesPerSecond      : 30,
			rate                 : 32,
			lifetime             : 0.4,
			maxParticles         : 128,
			initialSize          : { start: 0.2, end: 0.34 },
			gravity              : -0.25,
			blendMode            : PBParticleSystem_BlendMode.PSB_ADD,
			initialVelocitySpeed : { start: 0.3, end: 0.8 },
		}),
	},
	'trail-speed': {
		name            : 'Speed Burst',
		description     : 'Blue energy shocks cracking off the ball.',
		ticketCost      : 15,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : `${TRAIL_ATLAS_DIR}/sprites-speed.png`,
		emitter         : atlasTrailEmitter({
			fileName             : 'sprites-speed.png',
			tilesX               : 6,
			tilesY               : 6,
			framesPerSecond      : 30,
			rate                 : 32,
			lifetime             : 0.6,
			maxParticles         : 128,
			initialSize          : { start: 0.24, end: 0.4 },
			gravity              : 0.35,
			blendMode            : PBParticleSystem_BlendMode.PSB_ADD,
			initialVelocitySpeed : { start: 0.2, end: 0.6 },
		}),
	},
}
