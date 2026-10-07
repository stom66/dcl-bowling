import type { Layer } from '@stom66/dcl-ui-component-kit'

import { GameSettings } from 'src/shared/settings'

import { bowlingControlsLayer, bumperToggleLayer, clickToSetLayer } from 'src/client/ui/themes/bowling/layers/bowlingControls.layer'
import { customizationLayer } from 'src/client/ui/themes/bowling/layers/customization.layer'
import { debugLayer } from 'src/client/ui/themes/bowling/layers/debug.layer'
import { gameStatusLayer } from 'src/client/ui/themes/bowling/layers/gameStatus.layer'
import { gameSummaryLayer } from 'src/client/ui/themes/bowling/layers/gameSummary.layer'
import { laneLobbyLayer } from 'src/client/ui/themes/bowling/layers/laneLobby.layer'
import { leaderboardLayer } from 'src/client/ui/themes/bowling/layers/leaderboard.layer'
import { leaveGameLayer } from 'src/client/ui/themes/bowling/layers/leaveGame.layer'
import { letterboxLayer } from 'src/client/ui/themes/bowling/layers/letterbox.layer'
import { loadingLayer } from 'src/client/ui/themes/bowling/layers/loading.layer'
import { playtestDebugLayer } from 'src/client/ui/themes/bowling/layers/playtestDebug.layer'
import { scoresLayer } from 'src/client/ui/themes/bowling/layers/scores.layer'
import { statsLayer } from 'src/client/ui/themes/bowling/layers/stats.layer'
import { ticketBalanceLayer } from 'src/client/ui/themes/bowling/layers/ticketBalance.layer'
import { topRightTogglesLayer } from 'src/client/ui/themes/bowling/layers/topRightToggles.layer'
import { versionLayer } from 'src/client/ui/themes/bowling/layers/version.layer'


declare var process: {
	env: {
		NODE_ENV: string
	}
}

const IS_DEV = process.env.NODE_ENV === 'development'


// MARK: layers
/**
 * Bowling layer list.
 * Leave sits under game status in paint order. The position/direction/strength
 * bar lives in bowling controls. The bumper toggle is its own layer: beside
 * the bar on desktop, bottom-left on mobile. Click-to-set is the square
 * bottom-right button (click on desktop, tap on mobile). Customization sits
 * above gameplay HUD; records and stats sit with it. The top-right toggles paint after
 * those windows. Ticket balance sits in the top of the right zone.
 * The playtest panel sits in that same zone, below the ticket balance, while
 * `GameSettings.PLAYTEST_DEBUG_PANEL` is on, with Bolotron 3000 stacked under it.
 * Letterbox hides that top HUD (status, leave, toolbar, tickets, playtest,
 * and Bowl-o-tron) for the duration of a group roll replay.
 * The end-of-game summary sits above the letterbox and under the loading screen.
 * Loading is near the end so
 * it covers gameplay until dismissed.
 * Version is last with the highest z-index.
 */
export const layers: Layer[] = [
	leaveGameLayer,
	gameStatusLayer,
	scoresLayer,
	bowlingControlsLayer,
	bumperToggleLayer,
	clickToSetLayer,
	laneLobbyLayer,
	letterboxLayer,
	gameSummaryLayer,
	customizationLayer,
	leaderboardLayer,
	statsLayer,
	topRightTogglesLayer,
	ticketBalanceLayer,
	...(GameSettings.PLAYTEST_DEBUG_PANEL ? [playtestDebugLayer] : []),
	...(IS_DEV ? [debugLayer] : []),
	loadingLayer,
	versionLayer,
]
