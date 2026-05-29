import { EnvVar } from '@dcl/sdk/server'
import { signedFetch } from '~system/SignedFetch'

export namespace Posthog {
	
	const POSTHOG_HOST = 'https://eu.i.posthog.com'

	let apiKey: string | null = null

	// MARK: Init
	export function init() {
		EnvVar.get('POSTHOG_API_KEY').then((key) => {
			apiKey = key
			console.log('Metrics: PostHog initialized')
		}).catch((err) => {
			console.error('Metrics: failed to initialize PostHog', err)
		})
	}

	// MARK: Capture
	export function capture(distinctId: string, event: string, properties?: Record<string, unknown>) {
		if (!apiKey) return
		console.log('Metrics: capturing event', event, properties)

		const body = JSON.stringify({
			api_key      : apiKey,
			event        : event,
			distinct_id  : distinctId,
			properties   : properties ?? {},
			timestamp    : new Date().toISOString()
		})

		signedFetch({
			url: `${POSTHOG_HOST}/capture/`,
			init: {
				method : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body   : body
			}
		}).catch((err) => {
			console.error(`Metrics: capture failed for event "${event}"`, err)
		})
	}

	// MARK: Identify
	export function identify(distinctId: string, properties: Record<string, unknown>) {
		if (!apiKey) return
	
		const body = JSON.stringify({
			api_key    : apiKey,
			distinct_id: distinctId,
			event      : '$identify',
			properties : properties,
			timestamp  : new Date().toISOString()
		})
	
		signedFetch({
			url: `${POSTHOG_HOST}/capture/`,
			init: {
				method : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body
			}
		}).catch((err) => {
			console.error('Metrics: identify failed', err)
		})
	}
}
