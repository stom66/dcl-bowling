import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { NpcUtilsUi } from 'dcl-npc-toolkit'

import { DebugUI } from 'src/client/ui/ui.debug'

import { GameStatusUI } from 'src/client/ui/ui.game.gameStatus'
import { ScoresUI } from 'src/client/ui/ui.game.scores'
import { VersionUI } from './ui/ui.version'
import { HowToPlay } from './ui/ui.HowToPlay'


// MARK: Vars
declare var process: {
	env: {
		NODE_ENV: string
	}
}
const env = process.env.NODE_ENV
const SHOW_DEBUG = env == "development"


// MARK: Main
const uiComponent = () => [
	NpcUtilsUi(),

	// GAME UIS GO HERE
	GameStatusUI(),
	ScoresUI(),
	VersionUI(),
	//HowToPlay(),

	DebugUI()
	//SHOW_DEBUG ? DebugUI() : null
]

export function SetupUI() {
	ReactEcsRenderer.setUiRenderer(uiComponent)
}
