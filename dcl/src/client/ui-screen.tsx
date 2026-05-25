import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { NpcUtilsUi } from 'dcl-npc-toolkit'

import { DebugUI } from 'src/client/ui-screen/layers/debug.info'

import { GameStatusUI } from 'src/client/ui-screen/layers/game.gameStatus'
import { ScoresUI } from 'src/client/ui-screen/layers/game.scores'
import { VersionUI } from './ui-screen/layers/version'
import { HowToPlay } from './ui-screen/layers/info.HowToPlay'
import { JoinGameUI } from './ui-screen/layers/lobby.joinGame'
import { LeaveGameUI } from './ui-screen/layers/game.leaveGame'
import { HideLetterbox, LetterboxUi, ShowLetterbox } from './ui-screen/layers/game.letterbox'

import * as utils from "@dcl-sdk/utils"
import { BowlingControlsUI } from './ui-screen/layers/game.bowlingControls'

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
	LeaveGameUI(),
	LetterboxUi(),
	BowlingControlsUI(),

	DebugUI(),
	//SHOW_DEBUG ? DebugUI() : null
]

export function SetupScreenUI() {
	ReactEcsRenderer.setUiRenderer(uiComponent, {
		virtualHeight: 1080,
		virtualWidth: 1920,
	})
}
