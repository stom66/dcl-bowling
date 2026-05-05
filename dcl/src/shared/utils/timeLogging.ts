type event = {
	timestamp: number
	event: string
}

export class TimeLogger {
	timestamps: event[] = []
	startTime: number = Date.now()

	constructor() {
		this.startTime = Date.now()
	}

	log(event: string) {
		this.timestamps.push({ timestamp: Date.now(), event: event })
	}

	print() {
		let out = "TimeLogger: \n"
		let prev = this.startTime
		for (const t of this.timestamps) {
			out += `${(t.timestamp - prev)}ms - ${t.event}\n`
			prev = t.timestamp
		}
		console.log(out)
	}
}
