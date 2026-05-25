import ReactEcs, { Button, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

import { VERSION } from 'src/client/data/version'

// MARK: Main GameUI
export function VersionUI() {
	return (
		<UiEntity
			key={`ui_Version`}
			uiTransform={{
				width         : '250',
				height        : '50',
				positionType  : "absolute",
				position      : { bottom: 3, right: 3 },
			}}
			uiText={{
				value    : VERSION,
				fontSize : 10,
				color    : Color4.fromHexString('#88888888'),
				textAlign: 'bottom-right',
			}}
		/>
	)
}
