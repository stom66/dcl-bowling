import * as utils from "@dcl-sdk/utils"


export type StorageBackedStateOptions<T extends object> = {
	key           : string
	createDefault : () => T
	normalize     : (raw: unknown) => T
	onPublish     : (state: T) => void
	writeOnUpdate ?: boolean
}


// MARK: StorageBackedState
/**
 * Server-oriented helper for JSON-backed state with queued writes.
 * Subclasses supply the concrete storage read/write transport.
 */
export abstract class StorageBackedState<T extends object> {

	private static readonly RETRY_DELAY_MS = 1000

	protected readonly key          : string
	private   readonly createDefault: () => T
	private   readonly normalize    : (raw: unknown) => T
	private   readonly onPublish    : (state: T) => void
	private   readonly writeOnUpdate: boolean

	private state           : T
	private writeQueue      : Promise<void> = Promise.resolve()
	private isReady         : boolean       = false
	private isDirty         : boolean       = false
	private isRetryScheduled: boolean       = false


	// MARK: constructor
	constructor(options: StorageBackedStateOptions<T>) {
		this.key           = options.key
		this.createDefault = options.createDefault
		this.normalize     = options.normalize
		this.onPublish     = options.onPublish
		this.writeOnUpdate = options.writeOnUpdate ?? true
		this.state         = this.createDefault()
	}


	// MARK: readRaw
	/**
	 * Reads the raw serialized value from the underlying storage transport.
	 */
	protected abstract readRaw(): Promise<string | null | undefined>


	// MARK: writeRaw
	/**
	 * Writes a serialized value to the underlying storage transport.
	 * Returns true when the value was persisted, false when it was not.
	 */
	protected abstract writeRaw(serialized: string): Promise<boolean>


	// MARK: storageLabel
	/**
	 * Label used in log messages for this storage entry.
	 */
	protected storageLabel(): string {
		return `"${this.key}"`
	}


	// MARK: init
	/**
	 * Loads storage, normalizes the result, and publishes it.
	 * Queued so it cannot race with later updates.
	 */
	public async init(): Promise<void> {
		return this.enqueue(async () => {
			if (this.isReady) {
				return
			}

			this.state   = await this.read()
			this.isReady = true
			this.isDirty = false
			this.publish()
		})
	}


	// MARK: get
	/**
	 * Returns the current in-memory state.
	 */
	public get(): T {
		return this.state
	}


	// MARK: update
	/**
	 * Applies a synchronous mutator, publishes, and optionally persists.
	 */
	public update(mutator: (state: T) => T): void {
		this.enqueue(async () => {
			await this.applyUpdate(async (state) => mutator(state))
		})
	}


	// MARK: updateAsync
	/**
	 * Applies an async mutator, publishes, and optionally persists.
	 * Resolves when this queued update has finished.
	 */
	public async updateAsync(mutator: (state: T) => Promise<T>): Promise<void> {
		return this.enqueue(async () => {
			await this.applyUpdate(mutator)
		})
	}


	// MARK: persist
	/**
	 * Writes the current in-memory state to storage when dirty.
	 */
	public persist(): Promise<void> {
		return this.enqueue(async () => {
			await this.persistBusy()
		})
	}


	// MARK: enqueue
	private enqueue(work: () => Promise<void>): Promise<void> {
		const run = this.writeQueue.then(work)

		this.writeQueue = run.catch((error) => {
			console.error(`StorageBackedState: enqueue: failed for ${this.storageLabel()}`, error)
		})

		return run
	}


	// MARK: applyUpdate
	private async applyUpdate(mutator: (state: T) => Promise<T>): Promise<void> {
		if (!this.isReady) {
			this.state   = await this.read()
			this.isReady = true
		}

		this.state   = this.normalize(await mutator(this.state))
		this.isDirty = true
		this.publish()

		if (this.writeOnUpdate) {
			await this.persistBusy()
		}
	}


	// MARK: persistBusy
	private async persistBusy(): Promise<void> {
		if (!this.isDirty) {
			return
		}

		const snapshot = JSON.stringify(this.state)
		this.isDirty   = false

		try {
			const saved = await this.writeRaw(snapshot)
			if (saved) {
				console.log(`StorageBackedState: persistBusy: wrote ${this.storageLabel()}`, this.state)
				return
			}

			this.isDirty = true
			console.error(`StorageBackedState: persistBusy: storage rejected write for ${this.storageLabel()} — will retry`)
			this.scheduleRetry()
		} catch (error) {
			this.isDirty = true
			console.error(`StorageBackedState: persistBusy: failed to write ${this.storageLabel()}`, error)
			this.scheduleRetry()
		}
	}


	// MARK: scheduleRetry
	private scheduleRetry(): void {
		if (this.isRetryScheduled) {
			return
		}

		this.isRetryScheduled = true

		utils.timers.setTimeout(() => {
			this.isRetryScheduled = false
			this.persist()
		}, StorageBackedState.RETRY_DELAY_MS)
	}


	// MARK: read
	private async read(): Promise<T> {
		try {
			const raw = await this.readRaw()
			if (!raw) {
				return this.createDefault()
			}

			return this.normalize(JSON.parse(raw))
		} catch (error) {
			console.error(`StorageBackedState: read: failed to parse ${this.storageLabel()}`, error)
			return this.createDefault()
		}
	}


	// MARK: publish
	private publish(): void {
		this.onPublish(this.state)
	}
}
