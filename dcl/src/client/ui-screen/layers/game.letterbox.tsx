import ReactEcs, { Button, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

import { VERSION } from 'src/client/data/version'
import { tweenValue } from '../utils/tweens'

import * as utils from "@dcl-sdk/utils"
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

const OFFSET_VISIBLE = -64
const OFFSET_HIDDEN = -360

var offset = OFFSET_HIDDEN

export function ShowLetterbox() {
	tweenValue(offset, OFFSET_VISIBLE, 0.8, (v) => offset = v)
}
export function HideLetterbox() {
	tweenValue(offset, OFFSET_HIDDEN, 0.8, (v) => offset = v)
}

eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, () => {
	ShowLetterbox()
})
eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END, () => {
	HideLetterbox()
})
eventBus.on(ClientEvents.ON_GROUP_GAME_END, () => {
	HideLetterbox()
})



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
				height        : '17.5vh',
				positionType  : 'relative',
				position      : { top: offset }
			}}
			uiBackground={{ color: Color4.Black() }}
		/>
		<UiEntity
			uiTransform={{
				width         : '100%',
				height        : '17.5vh',
				positionType  : 'relative',
				position      : { bottom: offset }
			}}
			uiBackground={{ color: Color4.Black() }}
		/>
		</UiEntity>
	)
}
