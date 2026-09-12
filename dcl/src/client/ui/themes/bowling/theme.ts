import { Color4 } from '@dcl/sdk/math'

import type { ThemeCustomize } from '@stom66/dcl-ui-component-kit'


// MARK: theme
/**
 * Bowling-specific DUCK theme overrides.
 */
export const theme: ThemeCustomize = {
	colors: {
		body     : Color4.fromHexString('#212529ff'),
		dark     : Color4.fromHexString('#212529ff'),
		danger   : Color4.fromHexString('#9f2042ff'),
		info     : Color4.fromHexString('#06a77dff'),
		light    : Color4.fromHexString('#f8f9faff'),
		primary  : Color4.fromHexString('#fb6200ff'),
		secondary: Color4.fromHexString('#260042ff'),
		success  : Color4.fromHexString('#d53df9ff'),
		tertiary : Color4.fromHexString('#909294ff'),
		warning  : Color4.fromHexString('#ccfbfeff'),
	},
}
