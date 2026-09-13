import { isServer } from "@dcl/sdk/network"
import { Storage } from "@dcl/sdk/server"

import { StorageBackedState, StorageBackedStateOptions } from "src/shared/storage/storageBackedState"


export type PlayerBackedStateOptions<T extends object> = StorageBackedStateOptions<T> & {
	userId: string
}


// MARK: PlayerBackedState
/**
 * Per-player JSON state backed by authoritative server `Storage.player`.
 */
export class PlayerBackedState<T extends object> extends StorageBackedState<T> {

	private readonly userId: string


	// MARK: constructor
	constructor(options: PlayerBackedStateOptions<T>) {
		super(options)
		this.userId = options.userId
	}


	// MARK: storageLabel
	protected storageLabel(): string {
		return `"${this.key}" for "${this.userId}"`
	}


	// MARK: readRaw
	protected async readRaw(): Promise<string | null | undefined> {
		if (!isServer()) {
			console.error(`PlayerBackedState: readRaw: skipped (not server) for ${this.storageLabel()} - this is a code error, you're trying to access a server-only feature from the client. Bad! Very bad!`)
			return undefined
		}

		return Storage.player.get<string>(this.userId, this.key)
	}


	// MARK: writeRaw
	protected async writeRaw(serialized: string): Promise<boolean> {
		if (!isServer()) {
			console.error(`PlayerBackedState: writeRaw: skipped (not server) for ${this.storageLabel()} - this is a code error, you're trying to access a server-only feature from the client. Bad! Very bad!`)
			return false
		}

		return Storage.player.set(this.userId, this.key, serialized)
	}
}
