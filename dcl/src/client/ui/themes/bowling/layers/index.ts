import type { Layer } from '@stom66/dcl-ui-component-kit'

import { bowlingControlsLayer } from 'src/client/ui/themes/bowling/layers/bowlingControls.layer'
import { debugLayer } from 'src/client/ui/themes/bowling/layers/debug.layer'
import { gameStatusLayer } from 'src/client/ui/themes/bowling/layers/gameStatus.layer'
import { joinGameLayer } from 'src/client/ui/themes/bowling/layers/joinGame.layer'
import { leaveGameLayer } from 'src/client/ui/themes/bowling/layers/leaveGame.layer'
import { letterboxLayer } from 'src/client/ui/themes/bowling/layers/letterbox.layer'
import { loadingLayer } from 'src/client/ui/themes/bowling/layers/loading.layer'
import { scoresLayer } from 'src/client/ui/themes/bowling/layers/scores.layer'
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
 * Leave sits under game status in paint order. Loading is near the end so it
 * covers gameplay until dismissed. Version is last with the highest z-index.
 */
export const layers: Layer[] = [
	leaveGameLayer,
	gameStatusLayer,
	scoresLayer,
	bowlingControlsLayer,
	joinGameLayer,
	letterboxLayer,
	...(IS_DEV ? [debugLayer] : []),
	loadingLayer,
	versionLayer,
]
