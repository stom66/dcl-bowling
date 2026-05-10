import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { NpcUtilsUi } from 'dcl-npc-toolkit'

import { DebugUI } from 'src/client/ui-screen/ui.debug'

import { GameStatusUI } from 'src/client/ui-screen/ui.game.gameStatus'
import { ScoresUI } from 'src/client/ui-screen/ui.game.scores'
import { VersionUI } from './ui-screen/ui.version'
import { HowToPlay } from './ui-screen/ui.HowToPlay'
import { JoinGameUI } from './ui-screen/ui.lobby.joinGame'


// MARK: Vars
declare var process: {
	env: {
		NODE_ENV: string
	}
}
const env = process.env.NODE_ENV
const SHOW_DEV = env == "development"
const SHOW_DEBUG = true


// MARK: Main
const uiComponent = () => [
	NpcUtilsUi(),

	// GAME UIS GO HERE
	GameStatusUI(),
	ScoresUI(),
	VersionUI(),
	//HowToPlay(),
	JoinGameUI(),

	DebugUI()
	//SHOW_DEBUG ? DebugUI() : null
]

export function SetupScreenUI() {
	ReactEcsRenderer.setUiRenderer(uiComponent)
}
