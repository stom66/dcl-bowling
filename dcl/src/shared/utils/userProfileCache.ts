/**
 * Profile cache + lambdas fetch. Omit userId to use the local player once getPlayer() is valid.
 */

import { engine } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { getPlayer, onEnterScene } from '@dcl/sdk/players'

import type { DecentralandProfile } from 'src/shared/types/shared-types'


// MARK: Vars
const PROFILE_URL = 'https://peer.decentraland.org/lambdas/profiles/'


// MARK: UserProfileCache
class UserProfileCache {
	private cache                  = new Map<string, DecentralandProfile>()
	private inFlight               = new Map<string, Promise<DecentralandProfile | null>>()
	private avatarUrlUnavailable   = new Set<string>()
	private pendingAvatarCallbacks = new Map<string, Set<() => void>>()

	private localUserId            : string | undefined
	private isInitialised          = false
	private initPromise            : Promise<void> | null   =  null

	private face256FromProfile(profile: DecentralandProfile | null | undefined): string {
		const avatarUrl = profile?.avatars?.[0]?.avatar?.snapshots?.face256
		return typeof avatarUrl === 'string' ? avatarUrl : ''
	}

	constructor() {}


	// MARK: Init
	async init(): Promise<void> {
		if (this.isInitialised) return
		if (this.initPromise) return this.initPromise
	
		console.log('UserProfileCache: init')
	
		this.initPromise = (async () => {
			try {
				// Headless authoritative server never has a local player; waiting would block forever.
				if (isServer()) {
					this.isInitialised = true
					return
				}

				// Wait deterministically for local player
				this.localUserId = await this.waitForLocalPlayer()

				this.isInitialised = true

				// Prefetch local profile
				void this.getUserProfile()

				// Cache profiles for players entering scene
				onEnterScene((player) => {
					if (!player) return
					void this.getUserProfile(player.userId)
				})
			} catch (error) {
				console.error('UserDataCache: init failed', error)
			}
		})()
	
		return this.initPromise
	}


	// MARK: waitForLocalPlayer
	waitForLocalPlayer(): Promise<string> {
		return new Promise((resolve) => {
			const system = () => {
				const player = getPlayer()
		
				if (player?.userId) {
					engine.removeSystem(system)
					resolve(player.userId)
				}
			}
		
			engine.addSystem(system)
		})
	}


	// MARK: getUserProfile
	async getUserProfile(userId?: string | null): Promise<DecentralandProfile | null> {
		if (!this.isInitialised) await this.init()

		userId = userId ?? this.localUserId
		if (!userId) {
			console.error('UserDataCache: getUserProfile: no userId')
			return null
		}

		// Check for cache hit
		if (this.cache.has(userId)) {
			return this.cache.get(userId)!
		}

		// Check for in-flight request
		if (this.inFlight.has(userId)) {
			return this.inFlight.get(userId)!
		}
		
		// Create new fetch promise
		const request = this.fetchProfile(userId)
		this.inFlight.set(userId, request)

		// Store the result
		try {
			const result = await request
			if (result) {
				this.cache.set(userId, result)
				console.log('UserProfileCache: getUserProfile: got profile for', userId)
				return result
			}
			return null
		} finally {
			this.inFlight.delete(userId)
		}

	}

	// MARK: getCachedAvatarUrl
	/** Synchronous face256 URL from an already-cached profile; no network. */
	getCachedAvatarUrl(userId?: string | null): string {
		const id = userId ?? this.localUserId
		if (!id) return ''

		const profile = this.cache.get(id)
		return profile ? this.face256FromProfile(profile) : ''
	}

	// MARK: whenAvatarUrlAvailable
	/**
	 * Invokes onAvailable after a non-empty avatar URL is available, or when it is already cached.
	 * Dedupes loads per userId; records failures/empty URLs so builds do not refetch every frame.
	 */
	whenAvatarUrlAvailable(userId: string, onAvailable: () => void): void {
		if (!userId || this.avatarUrlUnavailable.has(userId)) return

		const url = this.getCachedAvatarUrl(userId)
		if (url) {
			void Promise.resolve().then(() => onAvailable())
			return
		}

		let listeners = this.pendingAvatarCallbacks.get(userId)
		if (!listeners) {
			listeners = new Set()
			this.pendingAvatarCallbacks.set(userId, listeners)
		}
		listeners.add(onAvailable)

		if (listeners.size !== 1) return

		void this.getUserAvatarUrl(userId).then((newUrl) => {
			const callbacks = this.pendingAvatarCallbacks.get(userId)
			this.pendingAvatarCallbacks.delete(userId)
			if (!newUrl) {
				this.avatarUrlUnavailable.add(userId)
				return
			}
			if (callbacks) {
				for (const cb of callbacks) {
					cb()
				}
			}
		})
	}


	// MARK: getUserAvatarUrl
	async getUserAvatarUrl(userId?: string | null): Promise<string> {
		const id = userId ?? this.localUserId
		if (!id) return ''

		const profile = await this.getUserProfile(id)
		return this.face256FromProfile(profile)
	}

	async getDisplayName(userId: string): Promise<string> {
		const profile = await this.getUserProfile(userId)
		return profile?.avatars?.[0]?.name ?? ''
	}


	// MARK: fetchProfile
	private async fetchProfile(userId: string): Promise<DecentralandProfile | null> {
		try {
			const response = await fetch(PROFILE_URL + userId)
			if (!response.ok) {
				console.error('UserDataCache: getUserProfile: response not ok', response.statusText)
				return null
			}

			const data: DecentralandProfile = await response.json()

			// Ensure avatar data exists
			if (!data || !Array.isArray(data.avatars) || data.avatars.length === 0) {
				console.error('UserDataCache: getUserProfile: no avatar data', data)
				return null
			}

			return data
		}
		catch (error) {
			console.error('UserDataCache: getUserProfile: failed to fetch profile', error)
			return null
		}
	}
}

export const userProfileCache = new UserProfileCache()
