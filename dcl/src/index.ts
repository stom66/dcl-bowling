import { initClient } from "src/client/index";
import { initServer } from "src/server/index";

import { isServer } from "@dcl/sdk/network";

export async function main(): Promise<void> {
	if (isServer()) {
		console.log("Initializing server")
		await initServer()
	} else {
		console.log("Initializing client")
		await initClient()
	}
}
