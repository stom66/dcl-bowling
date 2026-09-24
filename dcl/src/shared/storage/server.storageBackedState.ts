import { isServer } from "@dcl/sdk/network"
import { Storage } from "@dcl/sdk/server"

import { StorageBackedState, StorageBackedStateOptions } from "src/shared/storage/storageBackedState"


// MARK: ServerBackedState
/**
 * Scene-wide JSON state backed by authoritative server `Storage`.
 */
export class ServerBackedState<T extends object> extends StorageBackedState<T> {


	// MARK: constructor
	constructor(options: StorageBackedStateOptions<T>) {
		super(options)
	}


	// MARK: readRaw
	protected async readRaw(): Promise<string | null | undefined> {
		if (!isServer()) {
			console.error(`ServerBackedState: readRaw: skipped (not server) for ${this.storageLabel()} - this is a code error, you're trying to access a server-only feature from the client. Bad! Very bad!`)
			return undefined
		}

		return Storage.get<string>(this.key)
	}


	// MARK: writeRaw
	protected async writeRaw(serialized: string): Promise<boolean> {
		if (!isServer()) {
			console.error(`ServerBackedState: writeRaw: skipped (not server) for ${this.storageLabel()} - this is a code error, you're trying to access a server-only feature from the client. Bad! Very bad!`)
			return false
		}

		return Storage.set(this.key, serialized)
	}
}
