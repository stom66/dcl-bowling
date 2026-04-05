export type Listener<T = any> = (data: T) => void

export type EventBus = ReturnType<typeof createEventBus>

const createEventBus = () => {
	const listeners = new Map<string, Listener[]>()
	
	return {
		on<T = any>(event: string, listener: Listener<T>): () => void {
			if (!listeners.has(event)) listeners.set(event, [])
				listeners.get(event)!.push(listener)
			return () => {
				const arr = listeners.get(event)
				if (arr) {
					const idx = arr.indexOf(listener)
					if (idx !== -1) arr.splice(idx, 1)
					}
			}
		},
		
		off<T = any>(event: string, listener: Listener<T>): void {
			const arr = listeners.get(event)
			if (arr) {
				const idx = arr.indexOf(listener)
				if (idx !== -1) arr.splice(idx, 1)
				}
		},
		
		emit<T = any>(event: string, data: T): void {
			const arr = listeners.get(event)
			if (!arr) return
			const snapshot = arr.slice()
			for (const fn of snapshot) fn(data)
			},
		
		clear(event?: string): void {
			if (event) {
				listeners.delete(event)
			} else {
				listeners.clear()
			}
		}
	}
}

export const eventBus = createEventBus()
