/**
 * Single lookup for player identity and catalyst profiles.
 *
 * Players currently in the scene are read from `getPlayer`. Everyone else is
 * loaded from `GET https://peer.decentraland.org/lambdas/profile/<address>`
 * and kept in memory. A missing profile does not forget an in-scene player:
 * guests and unpublished accounts have a user id and name with no catalyst row.
 */

import { engine } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { getPlayer, onEnterScene } from '@dcl/sdk/players'

import { normalizeEntityKey } from 'src/shared/components/types'
import type { DecentralandProfile } from 'src/shared/types/shared-types'


// MARK: Vars
const PROFILE_URL = 'https://peer.decentraland.org/lambdas/profile/'

type ProfileEntry = {
	userId      : string
	displayName : string
	avatarUrl   : string
	profile     : DecentralandProfile | null
	apiResolved : boolean
}

type FetchResult = {
	profile : DecentralandProfile | null
	resolved: boolean
}


// MARK: UserProfileCache
class UserProfileCache {
	private entries                = new Map<string, ProfileEntry>()
	private inFlight               = new Map<string, Promise<ProfileEntry>>()
	private avatarUrlUnavailable   = new Set<string>()
	private pendingAvatarCallbacks = new Map<string, Set<() => void>>()

	private localUserId            : string | undefined
	private isInitialised          = false
	private initPromise            : Promise<void> | null = null


	// MARK: init
	/**
	 * On the client, waits until `getPlayer()` has a user id and remembers it.
	 * On both runtimes, caches players as they enter the scene. Safe to call
	 * more than once.
	 */
	async init(): Promise<void> {
		if (this.isInitialised) return
		if (this.initPromise) return this.initPromise

		console.log('UserProfileCache: init')
		this.initPromise = this.start()
		return this.initPromise
	}


	// MARK: getLocalUserId
	/**
	 * Runtime id of the local player. Empty until {@link init} resolves on a client.
	 * This is `getPlayer().userId`, so a catalyst miss does not leave the player anonymous.
	 */
	getLocalUserId(): string {
		return this.localUserId ?? ''
	}


	// MARK: isLocalUser
	/**
	 * True when `userId` is the local player. Address case is ignored.
	 */
	isLocalUser(userId: string | null | undefined): boolean {
		if (!userId || !this.localUserId) return false
		return normalizeEntityKey(userId) === normalizeEntityKey(this.localUserId)
	}


	// MARK: getDisplayName
	/**
	 * Name to show for a player. In-scene players use `getPlayer`. Absent players
	 * use the cached catalyst profile, fetching it on a miss. Pass no id for the
	 * local player.
	 */
	async getDisplayName(userId?: string | null): Promise<string> {
		const id = await this.resolveUserId(userId)
		if (!id) return ''

		const sceneName = this.sceneDisplayName(id)
		if (sceneName) {
			if (!this.entries.has(this.key(id))) this.rememberScenePlayer(id, sceneName)
			void this.ensureEntry(id)
			return sceneName
		}

		const entry = await this.ensureEntry(id)
		return entry.displayName
	}


	// MARK: getUserProfile
	/**
	 * Published catalyst profile. Returns null when the account has none.
	 * Wearables and face snapshots are not on `getPlayer`, so in-scene players
	 * still use this for that data. Identity stays available from {@link getLocalUserId}.
	 */
	async getUserProfile(userId?: string | null): Promise<DecentralandProfile | null> {
		const id = await this.resolveUserId(userId)
		if (!id) return null

		const entry = await this.ensureEntry(id)
		return entry.profile
	}


	// MARK: getCachedAvatarUrl
	/**
	 * Synchronous face256 URL from an already-cached profile. No network.
	 */
	getCachedAvatarUrl(userId?: string | null): string {
		const id = userId ?? this.localUserId
		if (!id) return ''
		return this.entries.get(this.key(id))?.avatarUrl ?? ''
	}


	// MARK: whenAvatarUrlAvailable
	/**
	 * Invokes `onAvailable` once a non-empty avatar URL is cached.
	 * Dedupes loads per user id, and records a miss so UI does not refetch every frame.
	 */
	whenAvatarUrlAvailable(
		userId     : string,
		onAvailable: () => void,
	): void {
		const key = this.key(userId)
		if (!key || this.avatarUrlUnavailable.has(key)) return

		const url = this.getCachedAvatarUrl(userId)
		if (url) {
			void Promise.resolve().then(() => onAvailable())
			return
		}

		let listeners = this.pendingAvatarCallbacks.get(key)
		if (!listeners) {
			listeners = new Set()
			this.pendingAvatarCallbacks.set(key, listeners)
		}
		listeners.add(onAvailable)

		if (listeners.size !== 1) return

		void this.getUserAvatarUrl(userId).then((newUrl) => {
			const callbacks = this.pendingAvatarCallbacks.get(key)
			this.pendingAvatarCallbacks.delete(key)
			if (!newUrl) {
				this.avatarUrlUnavailable.add(key)
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
	/**
	 * Face256 snapshot URL. Uses the cache, then the catalyst, for players
	 * who are not already cached.
	 */
	async getUserAvatarUrl(userId?: string | null): Promise<string> {
		const id = await this.resolveUserId(userId)
		if (!id) return ''

		const entry = await this.ensureEntry(id)
		return entry.avatarUrl
	}


	// MARK: start
	private async start(): Promise<void> {
		try {
			if (!isServer()) {
				this.localUserId = await this.waitForLocalPlayer()
				const player = getPlayer()
				if (player?.userId && player.name) this.rememberScenePlayer(player.userId, player.name)
				if (this.localUserId) void this.ensureEntry(this.localUserId)
			}

			onEnterScene((player) => {
				if (!player?.userId) return
				if (player.name) this.rememberScenePlayer(player.userId, player.name)
				void this.ensureEntry(player.userId)
			})
		} catch (error) {
			console.error('UserProfileCache: start: failed', error)
		}

		this.isInitialised = true
	}


	// MARK: waitForLocalPlayer
	private waitForLocalPlayer(): Promise<string> {
		return new Promise((resolve) => {
			const system = () => {
				const player = getPlayer()
				if (!player?.userId) return

				engine.removeSystem(system)
				resolve(player.userId)
			}

			engine.addSystem(system)
		})
	}


	// MARK: resolveUserId
	private async resolveUserId(userId?: string | null): Promise<string> {
		if (!this.isInitialised) await this.init()
		if (userId) return userId
		return this.localUserId ?? ''
	}


	// MARK: key
	private key(userId: string): string {
		return normalizeEntityKey(userId)
	}


	// MARK: scenePlayer
	/**
	 * `getPlayer` for someone currently in the scene, or undefined if they have left.
	 */
	private scenePlayer(userId: string) {
		try {
			if (!isServer() && this.isLocalUser(userId)) return getPlayer()
			return getPlayer({ userId })
		} catch (error) {
			console.error('UserProfileCache: scenePlayer: getPlayer failed', userId, error)
			return undefined
		}
	}


	// MARK: sceneDisplayName
	private sceneDisplayName(userId: string): string {
		return this.scenePlayer(userId)?.name ?? ''
	}


	// MARK: rememberScenePlayer
	/**
	 * Stores an in-scene name without waiting on the catalyst.
	 */
	private rememberScenePlayer(
		userId     : string,
		displayName: string,
	): void {
		const key      = this.key(userId)
		const existing = this.entries.get(key)
		if (existing) {
			if (displayName) existing.displayName = displayName
			return
		}

		this.entries.set(key, {
			userId,
			displayName,
			avatarUrl  : '',
			profile    : null,
			apiResolved: false,
		})
	}


	// MARK: ensureEntry
	/**
	 * Returns the cached row, joining an in-flight fetch when one exists.
	 * A network failure stays unresolved so the next call can try again.
	 * An empty catalyst body is cached so missing accounts are not requested every frame.
	 */
	private async ensureEntry(userId: string): Promise<ProfileEntry> {
		const key      = this.key(userId)
		const existing = this.entries.get(key)
		if (existing?.apiResolved) return existing

		const pending = this.inFlight.get(key)
		if (pending) return pending

		const request = this.fetchAndStore(userId)
		this.inFlight.set(key, request)
		try {
			return await request
		} finally {
			this.inFlight.delete(key)
		}
	}


	// MARK: fetchAndStore
	private async fetchAndStore(userId: string): Promise<ProfileEntry> {
		const key      = this.key(userId)
		const previous = this.entries.get(key)
		const result   = await this.fetchProfile(userId)

		if (!result.resolved) {
			if (previous) return previous
			return {
				userId,
				displayName: this.sceneDisplayName(userId),
				avatarUrl  : '',
				profile    : null,
				apiResolved: false,
			}
		}

		const record      = result.profile?.avatars?.[0]
		const sceneName   = this.sceneDisplayName(userId)
		const displayName = record?.name || sceneName || previous?.displayName || ''
		const avatarUrl   = this.face256FromProfile(result.profile)
		const entry: ProfileEntry = {
			userId     : previous?.userId || userId,
			displayName,
			avatarUrl,
			profile    : result.profile,
			apiResolved: true,
		}
		this.entries.set(key, entry)
		if (!avatarUrl) this.avatarUrlUnavailable.add(key)
		return entry
	}


	// MARK: fetchProfile
	/**
	 * Loads one catalyst profile. `resolved` is false only when the request
	 * itself failed, so a later call may retry. An unknown account is resolved
	 * with a null profile.
	 */
	private async fetchProfile(userId: string): Promise<FetchResult> {
		try {
			const response = await fetch(PROFILE_URL + encodeURIComponent(this.key(userId)))
			if (!response.ok) {
				console.log('UserProfileCache: fetchProfile: no profile', response.status, userId)
				return { profile: null, resolved: true }
			}

			const data: DecentralandProfile = await response.json()
			if (!data || !Array.isArray(data.avatars) || data.avatars.length === 0) {
				console.log('UserProfileCache: fetchProfile: no avatar data', userId)
				return { profile: null, resolved: true }
			}

			console.log('UserProfileCache: fetchProfile: got profile for', userId)
			return { profile: data, resolved: true }
		} catch (error) {
			console.error('UserProfileCache: fetchProfile: failed to fetch profile', userId, error)
			return { profile: null, resolved: false }
		}
	}


	// MARK: face256FromProfile
	private face256FromProfile(profile: DecentralandProfile | null | undefined): string {
		const avatarUrl = profile?.avatars?.[0]?.avatar?.snapshots?.face256
		return typeof avatarUrl === 'string' ? avatarUrl : ''
	}
}

export const userProfileCache = new UserProfileCache()
