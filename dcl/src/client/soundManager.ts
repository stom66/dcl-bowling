import * as utils from '@dcl-sdk/utils'
import { AudioSource, engine, Entity, Transform } from '@dcl/sdk/ecs'

import { eventBus, ClientEvents } from 'src/shared/utils/eventBus'

import { sfx } from 'src/client/data/sfx'
import { Vector2, Vector3 } from '@dcl/sdk/math'
export { sfx } from 'src/client/data/sfx'

export namespace SoundManager {

	// MARK: event bindings
	eventBus.on(ClientEvents.ON_GAME_JOINED, () => {
		playSound(sfx.confirm)
	})


	// MARK: settings
	const FADE_DURATION          = 3.0                                // Duration when fading music in/out
	const BGM_VOLUME             = 0.35                               // Volume when music is fully faded in
	const SFX_ENTITY_VOLUME      = 1.0                                // Volume on preloaded one-shot entities (retrigger uses this as baseline)
	const COUNTDOWN_LAST_SECONDS = 5                                  // How many of the last seconds to play countdown sounds for


	// MARK: state vars
	let isInitialized            = false                              // basic init flag

	type BgmFadePhase            = 'idle' | 'fadingIn' | 'fadingOut'
	let bgmFadePhase             : BgmFadePhase           = 'idle'    // current fade phase
	let bgmEntity                : Entity                             // background music entity
	let fadeElapsed              = 0                                  // elapsed time since last fade change (used by systemUpdateSound)
	let fadeSegmentStartVolume   = 0                                  // volume at the start of the current fade segment - typically 0 or 1, unless a fade is started during another fade

	const sfxCache               : Record<string, Entity> = {}        // preloaded sound effect entities
	let lastPlayedSfx            : string | undefined     = undefined // last played sound effect - used to avoid playing the same sound effect twice in a row
	let countdownTimerIds        : number[]               = []        // timer ids for the countdown sounds


	// MARK: init
	/**
	 * Registers the BGM fade system, creates the background-music entity, preloads all SFX
	 * into hidden entities, and wires {@link systemUpdateSound}. Safe to call once; later
	 * calls are ignored.
	 */
	export function init(): void {
		if (isInitialized) return
		isInitialized = true

		// Add the background music entity
		bgmEntity = engine.addEntity()
		Transform.create(bgmEntity, {})
		AudioSource.create(bgmEntity, {
			audioClipUrl: sfx.music[Math.floor(Math.random() * sfx.music.length)],
			loop        : true,
			global      : true,
			playing     : false,
			volume      : BGM_VOLUME,
		})

		// Add the sound effect entities
		preloadSfx()

		engine.addSystem(systemUpdateSound)

		// Bind the game joined event to start the background music
		eventBus.on(ClientEvents.ON_GAME_JOINED, () => {
			startBgm()
		})

		eventBus.on(ClientEvents.ON_MY_ROLL_START, () => {
			playSound(sfx.alert)
		})

		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, () => {
			playSound(sfx.swish)
		})

		eventBus.on(ClientEvents.ON_GROUP_GAME_END, () => {
			stopBgm()
		})
	}


	// MARK: preloadSfx
	/**
	 * Creates one global {@link AudioSource} per known clip in {@link sfx} so
	 * {@link playSound} can retrigger without loading at play time.
	 */
	function preloadSfx(): void {
		for (const paths of Object.values(sfx)) {
			for (const soundPath of paths) {
				const soundEntity = engine.addEntity()
				Transform.create(soundEntity, {})
				AudioSource.create(soundEntity, {
					audioClipUrl: soundPath,
					global      : true,
					playing     : false,
					volume      : SFX_ENTITY_VOLUME,
				})
				sfxCache[soundPath] = soundEntity
			}
		}
	}


	// MARK: isBgmTransitioning
	/**
	 * Whether background music is currently fading in or out. Use to avoid overlapping
	 * logic with {@link startBgm} / {@link stopBgm} while a fade is in progress.
	 *
	 * @returns `true` while BGM is fading in or fading out; `false` when idle.
	 */
	export function isBgmTransitioning(): boolean {
		return bgmFadePhase !== 'idle'
	}


	// MARK: startBgm
	/**
	 * Starts background music: picks a random track from {@link sfx.music}, fades volume up
	 * from zero. If music is already playing (idle or fading in), does nothing. If a
	 * fade-out is in progress, interrupts it and starts a fresh fade-in.
	 */
	export function startBgm(): void {
		if (!bgmEntity) return

		const audio = AudioSource.getMutableOrNull(bgmEntity)
		if (!audio) return

		if (audio.playing && bgmFadePhase !== 'fadingOut') return

		bgmFadePhase           = 'fadingIn'
		fadeElapsed            = 0
		fadeSegmentStartVolume = 0
		audio.audioClipUrl     = sfx.music[Math.floor(Math.random() * sfx.music.length)]
		audio.volume           = 0
		audio.playing          = true
	}


	// MARK: stopBgm
	/**
	 * Fades background music to silence then stops playback. No-op if already silent. If
	 * called mid-fade-in, fades out from the current volume (no jump to full level).
	 */
	export function stopBgm(): void {
		if (!bgmEntity) return

		const audio = AudioSource.getMutableOrNull(bgmEntity)
		if (!audio) return

		if (!audio.playing && (audio.volume ?? 0) <= 0.001) return

		bgmFadePhase           = 'fadingOut'
		fadeElapsed            = 0
		fadeSegmentStartVolume = audio.volume ?? BGM_VOLUME
	}


	// MARK: scheduleCountdown
	/**
	 * Schedules one countdown tick for each of the last `numberOfTicks` seconds before
	 * {@link endTime} (Unix ms). Clears any prior countdown first. Skips ticks already in
	 * the past; never schedules a negative timer delay.
	 *
	 * @param endTime - Wall-clock time in milliseconds when the counted period ends (e.g. match start).
	 * @param numberOfTicks - Optional. How many one-second steps before `endTime` each get a sound.
	 *   Defaults to {@link COUNTDOWN_LAST_SECONDS}.
	 */
	export function scheduleCountdown(
		endTime       : number,
		numberOfTicks : number = COUNTDOWN_LAST_SECONDS
	): void {
		cancelCountdown()

		const timeNow = Date.now()
		for (let i = 1; i <= numberOfTicks; i++) {
			const delayMs = endTime - timeNow - i * 1000
			if (delayMs < 0) continue
			countdownTimerIds.push(
				utils.timers.setTimeout(() => {
					playSound(sfx.countdown)
				}, delayMs)
			)
		}
	}


	// MARK: cancelCountdown
	/**
	 * Clears all timers created by {@link scheduleCountdown}. Safe to call when none are
	 * pending.
	 */
	export function cancelCountdown(): void {
		for (const id of countdownTimerIds) {
			utils.timers.clearTimeout(id)
		}
		countdownTimerIds = []
	}


	// MARK: playSound
	/**
	 * Plays a one-shot SFX from the preload cache. Like {@link startBgm}, this expects
	 * {@link init} to have run already so entities exist; otherwise the clip lookup fails.
	 * Pass a single URL or an array; arrays pick a random clip and avoid repeating the same
	 * pick as the previous call when multiple options exist. Retriggers from the start if
	 * the same clip plays again.
	 *
	 * @param sound - One asset path, or an array of paths (same shape as values in {@link sfx}).
	 */
	export function playSound(
		sound        : string | string[],
		parentEntity?: Entity,
		maxDistance? : number
	): void {
		const list = typeof sound === 'string' ? [sound] : sound

		let randomSound: string
		if (list.length === 1) {
			randomSound = list[0]
		} else {
			do {
				randomSound = list[Math.floor(Math.random() * list.length)]
			} while (randomSound === lastPlayedSfx && list.length > 1)
		}
		lastPlayedSfx = randomSound

		var soundEntity = sfxCache[randomSound]
		if (!soundEntity) {
			console.error('SoundManager: playSound: no preloaded entity for clip (check sfx paths and preload):', randomSound)
			return
		}

		if (parentEntity) {
			soundEntity = engine.addEntity()
			Transform.create(soundEntity, { parent: parentEntity })
			AudioSource.create(soundEntity, {
				audioClipUrl: randomSound,
				global: false,
			})
		}

		const audioSrc = AudioSource.getMutableOrNull(soundEntity)
		if (!audioSrc) {
			console.error('SoundManager: playSound: AudioSource missing on preloaded entity for clip:', randomSound)
			return
		}

		audioSrc.playing     = false
		audioSrc.currentTime = 0

		if (maxDistance && parentEntity) {
			const playerPos = Transform.get(engine.PlayerEntity).position
			const parentPos = Transform.get(parentEntity).position
			const x = playerPos.x - parentPos.x
			const z = playerPos.z - parentPos.z
			const distance = Math.sqrt(x * x + z * z)
			if (distance < maxDistance) {
				const vol = (audioSrc.volume ?? SFX_ENTITY_VOLUME) * (1 - distance / maxDistance)
				console.log('SoundManager: playSound: ${randomSound} at volume', vol)
				audioSrc.volume = vol
			}
		}

		utils.timers.setTimeout(() => {
			const audio = AudioSource.getMutableOrNull(soundEntity)
			if (audio) audio.playing = true
		}, 50)
	}


	// MARK: systemUpdateSound
	/**
	 * Engine system: advances BGM fade-in / fade-out using {@link FADE_DURATION} and
	 * {@link fadeSegmentStartVolume}. Runs every frame after {@link init}.
	 *
	 * @param dt - Delta time in seconds since the last frame.
	 */
	const systemUpdateSound = (dt: number): void => {
		if (bgmFadePhase === 'idle' || !bgmEntity) return

		const audio = AudioSource.getMutableOrNull(bgmEntity)
		if (!audio) return

		fadeElapsed += dt

		// Are we finished? Set final volume
		if (fadeElapsed >= FADE_DURATION) {
			if (bgmFadePhase === 'fadingOut') {
				audio.volume  = 0
				audio.playing = false
			} else {
				audio.volume = BGM_VOLUME
			}
			bgmFadePhase = 'idle'
			return
		}

		// Not finished, update volume
		const t = fadeElapsed / FADE_DURATION
		if (bgmFadePhase === 'fadingOut') {
			const volume = Math.max(0, fadeSegmentStartVolume * (1 - t))
			audio.volume = volume
		} else {
			const volume = Math.min(1, fadeSegmentStartVolume + (BGM_VOLUME - fadeSegmentStartVolume) * t)
			audio.volume = volume
		}
	}
}
