import { isServer } from "@dcl/sdk/network"
import { EnvVar } from "@dcl/sdk/server"


// MARK: Vars
const DISCORD_WEBHOOK_URL_KEY = "DISCORD_WEBHOOK_URL"
const GAME_NAME                 = "Fastlane Bowling"
const WORLD                     = "stom.dcl.eth"

let discordWebhookUrlPromise: Promise<string | null> | null = null


// MARK: buildMessage
const buildMessage = (title: string, description: string) => {
	return { embeds: [
		{
			title      : title,
			description: description,
			color      : 16776960,
			thumbnail  : {
				url: "https://cdn.discordapp.com/emojis/1395247851877044325.webp?size=128&animated=true"
			}
		}
	] }
}


// MARK: perfectGame
export const perfectGame = (username: string) => {
	const title       = `:bowling: ${username} has just bowled a perfect game!`
	const description = `Wow, ${username} has just bowled a perfect game!\nThink you can match that? \n\n [Play ${GAME_NAME}!](https://play.decentraland.org/?realm=${encodeURIComponent(WORLD)})`

	const body = buildMessage(title, description)

	void sendDiscordMessage(body)
}


// MARK: newPlayer
export const newPlayer = (username: string, userId: string) => {
	const title       = `:bowling: ${username} has joined the game!`
	const description = `${userId}`

	const body = buildMessage(title, description)

	void sendDiscordMessage(body)
}


// MARK: getDiscordWebhookUrl
/**
 * Resolves the Discord webhook URL from server environment variables.
 * The result is cached so concurrent sends share a single EnvVar lookup.
 */
async function getDiscordWebhookUrl(): Promise<string | null> {
	if (!isServer()) return null

	if (!discordWebhookUrlPromise) {
		discordWebhookUrlPromise = EnvVar.get(DISCORD_WEBHOOK_URL_KEY).then((url) => url || null)
	}

	return discordWebhookUrlPromise
}


// MARK: sendDiscordMessage
async function sendDiscordMessage(body: object): Promise<void> {
	if (!isServer()) {
		console.log("discord-webhooks: sendDiscordMessage: skipped (not server)")
		return
	}

	const url = await getDiscordWebhookUrl()
	if (!url) {
		console.log("discord-webhooks: sendDiscordMessage: DISCORD_WEBHOOK_URL not configured")
		return
	}

	try {
		const response = await fetch(url, {
			method : "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		})

		if (!response.ok) {
			console.log("discord-webhooks: sendDiscordMessage: webhook failed:", response.status, response.statusText)
		} else {
			console.log("discord-webhooks: sendDiscordMessage: message sent to Discord")
		}
	} catch (error) {
		console.log("discord-webhooks: sendDiscordMessage: error sending webhook:", error)
	}
}
