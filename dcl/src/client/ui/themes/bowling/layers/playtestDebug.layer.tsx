import ReactEcs from '@dcl/sdk/react-ecs'
import { ButtonText, Column, getTheme, Icon, Layer, Row, Text, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ClientMessaging } from 'src/client/clientMessaging'
import { gameIconsAtlas } from 'src/client/ui/themes/bowling/atlases'


const PANEL_WIDTH      = 180
const BUTTON_HEIGHT    = 40
const TICKET_ICON_SIZE = 22


// MARK: PlaytestDebugLayer
/**
 * Right-side playtest controls for granting tickets and relocking items.
 * Registered only while `GameSettings.PLAYTEST_DEBUG_PANEL` is on.
 */
export class PlaytestDebugLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-playtest-debug',
			zone       : ZoneType.Right,
			canBeHidden: false,
			uiTransform: {
				width: PANEL_WIDTH,
			},
		})
	}


	// MARK: addTickets
	/**
	 * Asks the server to grant `amount` tickets to the local player.
	 */
	private addTickets(amount: number) {
		ClientMessaging.requestTicket(amount)
	}


	// MARK: resetUnlocks
	/**
	 * Asks the server to relock purchased items and restore the default loadout.
	 */
	private resetUnlocks() {
		ClientMessaging.requestResetUnlocks()
	}


	// MARK: ticketButton
	/**
	 * Ticket grant button. The amount is text; the ticket glyph replaces the word.
	 */
	private ticketButton(amount: number) {
		const theme = getTheme()
		return (
			<ButtonText
				id          = {`playtest_add_tickets_${amount}`}
				width       = "100%"
				height      = {BUTTON_HEIGHT}
				callback    = {() => { this.addTickets(amount) }}
				uiTransform = {{
					positionType: 'relative',
					position    : { top: 0, left: 0 },
				}}
			>
				<Row
					width          = "100%"
					height         = "100%"
					spacing        = {6}
					alignItems     = "center"
					justifyContent = "center"
				>
					<Text
						value     = {`+${amount}`}
						fontSize  = {theme.typography.size.small}
						fontColor = {theme.colors.light}
						textAlign = "middle-center"
						textWrap  = "nowrap"
						width     = "auto"
						height    = {BUTTON_HEIGHT}
					/>
					<Icon
						src       = {gameIconsAtlas.source}
						uvs       = {gameIconsAtlas.uv.ticket}
						width     = {TICKET_ICON_SIZE}
						height    = {TICKET_ICON_SIZE}
						iconColor = {theme.colors.light}
					/>
				</Row>
			</ButtonText>
		)
	}


	// MARK: button
	private button(
		id       : string,
		textLabel: string,
		callback : () => void,
	) {
		const theme = getTheme()
		return (
			<ButtonText
				id          = {id}
				textLabel   = {textLabel}
				width       = "100%"
				height      = {BUTTON_HEIGHT}
				fontSize    = {theme.typography.size.small}
				callback    = {callback}
				uiTransform = {{
					positionType: 'relative',
					position    : { top: 0, left: 0 },
				}}
			/>
		)
	}


	// MARK: body
	protected body() {
		const theme = getTheme()

		return [
			<UiBox
				key             = "playtest-debug-chrome"
				width           = "100%"
				height          = "auto"
				alignItems      = "flex-start"
				justifyContent  = "flex-start"
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {3}
				borderRadius    = {8}
				padding         = {8}
				uiTransform     = {{ flexDirection: 'column' }}
			>
				<Text
					value     = "Playtest Controls"
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					width     = "100%"
					height    = {22}
				/>
				<Column
					width   = "100%"
					height  = "auto"
					spacing = {6}
					padding = {{ top: 4 }}
				>
					{this.ticketButton(10)}
					{this.ticketButton(100)}
					{this.button('playtest_reset_unlocks',   'Reset Unlocks', () => { this.resetUnlocks() })}
				</Column>
			</UiBox>,
		]
	}
}

export const playtestDebugLayer = new PlaytestDebugLayer()
