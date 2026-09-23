import type { Layer } from '@stom66/dcl-ui-component-kit'

import { bowlingControlsLayer } from 'src/client/ui/themes/bowling/layers/bowlingControls.layer'
import { bumperToggleLayer } from 'src/client/ui/themes/bowling/layers/bumperToggle.layer'
import { customizationLayer } from 'src/client/ui/themes/bowling/layers/customization.layer'
import { customizationToggleLayer } from 'src/client/ui/themes/bowling/layers/customizationToggle.layer'
import { debugLayer } from 'src/client/ui/themes/bowling/layers/debug.layer'
import { gameStatusLayer } from 'src/client/ui/themes/bowling/layers/gameStatus.layer'
import { joinGameLayer } from 'src/client/ui/themes/bowling/layers/joinGame.layer'
import { leaderboardLayer } from 'src/client/ui/themes/bowling/layers/leaderboard.layer'
import { leaderboardToggleLayer } from 'src/client/ui/themes/bowling/layers/leaderboardToggle.layer'
import { leaveGameLayer } from 'src/client/ui/themes/bowling/layers/leaveGame.layer'
import { letterboxLayer } from 'src/client/ui/themes/bowling/layers/letterbox.layer'
import { loadingLayer } from 'src/client/ui/themes/bowling/layers/loading.layer'
import { muteToggleLayer } from 'src/client/ui/themes/bowling/layers/muteToggle.layer'
import { scoresLayer } from 'src/client/ui/themes/bowling/layers/scores.layer'
import { statsLayer } from 'src/client/ui/themes/bowling/layers/stats.layer'
import { statsToggleLayer } from 'src/client/ui/themes/bowling/layers/statsToggle.layer'
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
 * Leave sits under game status in paint order. Bumper toggle sits with the
 * roll HUD. Customization sits above gameplay HUD; records and stats sit with
 * it. Toggles paint after their windows. Mute sits with the other top-right
 * toggles. Loading is near the end so it covers gameplay until dismissed.
 * Version is last with the highest z-index.
 */
export const layers: Layer[] = [
	leaveGameLayer,
	gameStatusLayer,
	scoresLayer,
	bowlingControlsLayer,
	bumperToggleLayer,
	joinGameLayer,
	letterboxLayer,
	customizationLayer,
	customizationToggleLayer,
	leaderboardLayer,
	leaderboardToggleLayer,
	statsLayer,
	statsToggleLayer,
	muteToggleLayer,
	...(IS_DEV ? [debugLayer] : []),
	loadingLayer,
	versionLayer,
]
