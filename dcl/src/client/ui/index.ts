import { SetupUiComponentKit } from '@stom66/dcl-ui-component-kit'

import { bowling } from 'src/client/ui/themes/bowling'


// MARK: SetupUI
/**
 * Mounts the Bowling DUCK theme and layer stack.
 */
export function SetupUI(): void {
	SetupUiComponentKit({
		layers: bowling.layers,
		theme : bowling.theme,
	})
}
