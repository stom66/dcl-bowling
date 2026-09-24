import { Vector3 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { ButtonText, Column, getTheme, Icon, Layer, Row, Text, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { ClientMessaging } from 'src/client/clientMessaging'
import { gameIconsAtlas } from 'src/client/ui/themes/bowling/atlases'


const PANEL_WIDTH      = 180
const BUTTON_HEIGHT    = 40
const PANEL_GAP        = 8
const TICKET_ICON_SIZE = 22


// MARK: PlaytestDebugLayer
/**
 * Right-side playtest controls. Ticket and unlock actions sit above bowlotron 3000.
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


	// MARK: bowl
	/**
	 * Sends a scripted roll, matching the debug Bowl-O-Tron shots.
	 */
	private bowl(
		position : Vector3,
		direction: Vector3,
		strength : number,
		spin     : number,
	) {
		ClientMessaging.requestPlayRoll(position, direction, strength, spin)
		eventBus.emit(ClientEvents.ON_MY_ROLL_REQUEST, {
			position : position,
			direction: direction,
			strength : strength,
			spin     : spin,
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


	// MARK: panel
	/** Shared chrome for the stacked playtest panels. */
	private panel(
		key      : string,
		title    : string,
		children : ReactEcs.JSX.Element[],
		marginTop: number = 0,
	) {
		const theme = getTheme()
		return (
			<UiBox
				key             = {key}
				width           = "100%"
				height          = "auto"
				alignItems      = "flex-start"
				justifyContent  = "flex-start"
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {3}
				borderRadius    = {8}
				padding         = {8}
				margin          = {marginTop > 0 ? { top: marginTop } : undefined}
				uiTransform     = {{ flexDirection: 'column' }}
			>
				<Text
					value     = {title}
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
					{children}
				</Column>
			</UiBox>
		)
	}


	// MARK: body
	protected body() {
		return [
			this.panel('playtest-debug-chrome', 'Playtest Controls', [
				this.ticketButton(10),
				this.ticketButton(100),
				this.button('playtest_reset_unlocks', 'Reset Unlocks', () => { this.resetUnlocks() }),
			]),
			this.panel('bowlotron-chrome', 'Bowl-o-tron 3000', [
				this.button('bowlotron_strike', 'Strike', () => {
					this.bowl(Vector3.create(-0.07, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
				}),
				this.button('bowlotron_spare_1', 'Spare Pt.1', () => {
					this.bowl(Vector3.create(0.15, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
				}),
				this.button('bowlotron_spare_2', 'Spare Pt.2', () => {
					this.bowl(Vector3.create(-0.2, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
				}),
			], PANEL_GAP),
		]
	}
}

export const playtestDebugLayer = new PlaytestDebugLayer()
