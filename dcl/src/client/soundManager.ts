import { AudioSource, engine, Entity, Transform } from "@dcl/sdk/ecs"
import * as utils from '@dcl-sdk/utils'

import { ClientState } from 'src/shared/types'
import { eventBus } from 'src/shared/utils/eventBus'

import { sfx } from 'src/client/data/sfx'
import { ClientEvents } from 'src/client/clientEvents'
import { ClientStore } from "src/client/clientStore"

const clientStore = ClientStore.getInstance()

export namespace SoundManager {

	// MARK: event bindings
	eventBus.on(ClientEvents.ON_GAME_JOINED, (data) => {
		PlaySound(sfx.confirm)
	})
	
	
	// MARK: Vars
	var isInitialized = false

	let bgm: Entity
	
	const fadeDuration = 3.0
	let fadingOut    = false
	let fadingIn     = false
	let fadeElapsed  = 0
	let volume       = 0.5

	var lastPlayedSfx: string | undefined = undefined
	var sfxCache: Record<string, Entity> = {}	


	// MARK: Init
	export function init() {
		if (isInitialized) return
		isInitialized = true

		engine.addSystem(System_UpdateSound)
		bgm = engine.addEntity()
		Transform.create(bgm, {})
		AudioSource.create(bgm, {
			audioClipUrl: sfx.music[Math.floor(Math.random() * sfx.music.length)],
			playing     : false,
			global      : true,
			volume      : 0.5,
		})

		preloadSfx()
	}


	// MARK: preloadSfx
	function preloadSfx() {
		for (const paths of Object.values(sfx)) {
			for (const soundPath of paths) {
				const soundEntity = engine.addEntity()
				Transform.create(soundEntity, {})
				AudioSource.create(soundEntity, {
					audioClipUrl: soundPath,
					playing: false,
					global: true,
					volume: 0.5,
				})
				sfxCache[soundPath] = soundEntity
			}
		}
	}


	// MARK: PlaySound
	export function PlaySound(sound: string | string[]) {
		if (typeof sound === 'string') {
			sound = [sound]
		}

		// Choose a random sound, but allow repeating if there's only one option
		let randomSound: string;
		if (sound.length === 1) {
			randomSound = sound[0];
		} else {
			do {
				randomSound = sound[Math.floor(Math.random() * sound.length)];
			} while (randomSound === lastPlayedSfx && sound.length > 1);
		}
		lastPlayedSfx = randomSound;

		console.log("SoundManager: PlaySound: playing sound", randomSound);
		const soundEntity = sfxCache[randomSound];
		if (!soundEntity) {
			console.error("SoundManager: PlaySound: sound entity not found", randomSound);
			return;
		}
		const audioSrc = AudioSource.getMutable(soundEntity);
		if (!audioSrc) {
			console.error("SoundManager: PlaySound: audio source not found", randomSound);
			return;
		}

		// Always retrigger the sound by toggling `playing` off and on in the next tick
		audioSrc.playing = false;
		audioSrc.currentTime = 0;

		// Use a small timeout to ensure the audio system resets (works around retrigger issues)
		// Sometimes setting playing=false then =true immediately does not retrigger, so do it on next frame
		setTimeout(() => {
			const audio = AudioSource.getMutable(soundEntity);
			if (audio) {
				audio.playing = true;
			}
		}, 50);
	}


	// MARK: DoCountdown
	function DoCountdown(gameStartTime: number) {
		const COUNT_LAST_N_SECOND = 5
		const timeNow = Date.now()
		for (var i=1; i <= COUNT_LAST_N_SECOND; i++) {
			const delay = gameStartTime - timeNow - (i * 1000)
			utils.timers.setTimeout(() => {
				PlaySound(sfx.countdown)
			}, delay)
		}
	}


	// MARK: StartBGM
	function StartBGM() {
		if (!bgm) return

		const audio = AudioSource.getMutableOrNull(bgm)
		if (!audio) return
		if (audio.playing) return

		fadingIn = true
		fadeElapsed = 0
		audio.audioClipUrl = sfx.music[Math.floor(Math.random() * sfx.music.length)]
		audio.volume = 0
		audio.playing = true
	}
	

	// MARK: StopBGM
	function StopBGM() {
		if (!bgm) return
		
		const audio = AudioSource.getMutableOrNull(bgm)
		if (!audio) return
		if (!audio.playing) return
		
		fadingOut = true
		fadeElapsed = 0
		volume = audio.volume ?? 0.5
	}
	

	// MARK: System_UpdateSound
	const System_UpdateSound = (dt: number) => {
		if (!(fadingOut || fadingIn) || !bgm) return
		
		const audio = AudioSource.getMutableOrNull(bgm)
		if (!audio) return
		fadeElapsed += dt
		
		if (fadeElapsed >= fadeDuration) {
			if (fadingOut) {
				audio.volume = 0
				audio.playing = false
				fadingOut = false
			} else {
				audio.volume = volume
				fadingIn = false
			}
		} else {
			if (fadingOut) {
				audio.volume = Math.max(
					0,
					volume * (1 - fadeElapsed / fadeDuration)
				)
			} else {
				audio.volume = Math.min(
					1,
					volume * (fadeElapsed / fadeDuration)
				)
			}
		}
	}
}
