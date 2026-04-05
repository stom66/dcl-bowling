import { engine, IEngine } from '@dcl/sdk/ecs'

export type Timers = ReturnType<typeof createTimers>

export type Callback = () => void

export type TimerId = number

const createTimers = (targetEngine: IEngine) => {
	type TimerData = {
		accumulatedTime: number
		interval: number
		recurrent: boolean
		callback: Callback
	}
	
	const timers: Map<TimerId, TimerData> = new Map()
	let timerIdCounter = 0
	
	const system = (dt: number) => {
		const deadTimers = []
		const callbacks = []
		
		for (const [timerId, timerData] of timers) {
			timerData.accumulatedTime += 1000 * dt
			if (timerData.accumulatedTime < timerData.interval) continue
			
			callbacks.push(timerData.callback)
			
			if (timerData.recurrent) {
				timerData.accumulatedTime -= Math.floor(timerData.accumulatedTime / timerData.interval) * timerData.interval
			} else {
				deadTimers.push(timerId)
			}
		}
		
		for (const timerId of deadTimers) timers.delete(timerId)
			
		for (const callback of callbacks) callback()
		}
	
	targetEngine.addSystem(system, 100e3 + 256)
	
	return {
		setTimeout(callback: Callback, milliseconds: number): TimerId {
			const timerId = timerIdCounter++
			timers.set(timerId, { callback: callback, interval: milliseconds, recurrent: false, accumulatedTime: 0 })
			return timerId
		},
		clearTimeout(timer: TimerId) {
			timers.delete(timer)
		},
		setInterval(callback: Callback, milliseconds: number): TimerId {
			const timerId = timerIdCounter++
			timers.set(timerId, { callback: callback, interval: milliseconds, recurrent: true, accumulatedTime: 0 })
			return timerId
		},
		clearInterval(timer: TimerId) {
			timers.delete(timer)
		}
	}
}

export const timers = createTimers(engine)
