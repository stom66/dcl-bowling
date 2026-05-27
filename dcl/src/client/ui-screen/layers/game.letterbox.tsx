import ReactEcs, { Button, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

import { VERSION } from 'src/client/data/version'
import { tweenValue } from '../utils/tweens'

import * as utils from "@dcl-sdk/utils"
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { vhAsPixels } from '../utils/sizing'

const BAR_HEIGHT     = vhAsPixels(17.5)
const OFFSET_VISIBLE = BAR_HEIGHT * -0.25 // Need to have ti slightly offscreen becuase of the BACK easing causing it to overshoot
const OFFSET_HIDDEN  = BAR_HEIGHT * -1

var offset = OFFSET_HIDDEN

export function ShowLetterbox() {
	tweenValue(offset, OFFSET_VISIBLE, 0.8, (v) => offset = v)
}
export function HideLetterbox() {
	tweenValue(offset, OFFSET_HIDDEN, 0.8, (v) => offset = v)
}

eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, () => { ShowLetterbox() })

eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END,   () => { HideLetterbox() })
eventBus.on(ClientEvents.ON_GROUP_GAME_END,            () => { HideLetterbox() })
eventBus.on(ClientEvents.ON_GROUP_ROLL_END,            () => { HideLetterbox() })
eventBus.on(ClientEvents.ON_GROUP_FRAME_END,           () => { HideLetterbox() })
eventBus.on(ClientEvents.ON_MY_FRAME_END,              () => { HideLetterbox() })


// MARK: Main GameUI
export function LetterboxUi() {
	return (
		<UiEntity
			key={`ui_Version`}
			uiTransform={{
				width         : '100%',
				height        : '100%',
				flexDirection : 'column',
				alignItems    : 'center',
				justifyContent: 'space-between',
			}}
		>
		<UiEntity
			uiTransform={{
				width         : '100%',
				height        : BAR_HEIGHT,
				positionType  : 'relative',
				position      : { top: offset }
			}}
			uiBackground={{ color: Color4.Black() }}
		/>
		<UiEntity
			uiTransform={{
				width         : '100%',
				height        : BAR_HEIGHT,
				positionType  : 'relative',
				position      : { bottom: offset }
			}}
			uiBackground={{ color: Color4.Black() }}
		/>
		</UiEntity>
	)
}
