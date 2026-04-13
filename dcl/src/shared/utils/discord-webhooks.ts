
// Put this somewhere re-usable
const WEBHOOK_URL = "https://discord.com/api/webhooks/1493214981133566072/8IiG5biH0FTMKUOjJUEJKDjTGvG4PiqRPAJ8mTo-mTkNq-ojE-E1VHr0EyX5PuGWaIBY"
const GAME_NAME   = "Fastlane Bowling"
const WORLD      = "stom.dcl.eth"

const buildMessage = (title: string, description: string) => {
	return {embeds: [
		{
			title: title,
			description: description,
			color: 16776960,
			thumbnail: {
				url: "https://cdn.discordapp.com/emojis/1395247851877044325.webp?size=128&animated=true"
			}
		}
	]}
}

export const perfectGame = (username: string) => {
	const title = `:bowling: ${username} has just bowled a perfect game!`
	const description = `Wow, ${username} has just bowled a perfect game!\nThink you can match that? \n\n [Play ${GAME_NAME}!](https://play.decentraland.org/?realm=${encodeURIComponent(WORLD)})`
	
	const body = buildMessage(title, description);

	sendDiscordMessage(body);
}

// This is the function to use
async function sendDiscordMessage(body: any) {
	try {
		const response = await fetch(WEBHOOK_URL, {
			method : "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		})
		
		if (!response.ok) {
			console.log("sendDiscordMessage: Webhook failed:", response.status, response.statusText)
		} else {
			console.log("sendDiscordMessage: Message sent to Discord!")
		}
	} catch (error) {
		console.log("sendDiscordMessage: Error sending webhook:", error)
	}
}