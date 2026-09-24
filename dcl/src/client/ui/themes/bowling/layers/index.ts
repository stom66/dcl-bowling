import type { Layer } from '@stom66/dcl-ui-component-kit'

import { GameSettings } from 'src/shared/settings'

import { bowlingControlsLayer } from 'src/client/ui/themes/bowling/layers/bowlingControls.layer'
import { customizationLayer } from 'src/client/ui/themes/bowling/layers/customization.layer'
import { debugLayer } from 'src/client/ui/themes/bowling/layers/debug.layer'
import { gameStatusLayer } from 'src/client/ui/themes/bowling/layers/gameStatus.layer'
import { joinGameLayer } from 'src/client/ui/themes/bowling/layers/joinGame.layer'
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
 * Leave sits under game status in paint order. The roll HUD, including the
 * bumper toggle, lives in bowling controls. Customization sits above gameplay
 * HUD; records and stats sit with it. The top-right toggles paint after
 * those windows. Ticket balance sits in the top of the right zone.
 * The playtest panel sits on the right while
 * `GameSettings.PLAYTEST_DEBUG_PANEL` is on. Loading is near the end so
 * it covers gameplay until dismissed.
 * Version is last with the highest z-index.
 */
export const layers: Layer[] = [
	leaveGameLayer,
	gameStatusLayer,
	scoresLayer,
	bowlingControlsLayer,
	joinGameLayer,
	letterboxLayer,
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
