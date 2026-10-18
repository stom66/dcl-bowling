import { Vector3 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { alpha, ButtonText, Column, darken, getTheme, Icon, Layer, Row, Text, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerTickets } from 'src/shared/components/definitions/shared.playerTickets'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { timers } from 'src/shared/utils/timers'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { gameIconsAtlas } from 'src/client/ui/themes/bowling/atlases'
import { TOGGLE_BUTTONS_SIZE, TOGGLE_GAP } from 'src/client/ui/themes/bowling/layers/topRightToggles.layer'


const clientStore = ClientStore.getInstance()


const PANEL_WIDTH        = 180
const BUTTON_HEIGHT      = 40
const PANEL_GAP          = 24
const TICKET_ICON_SIZE   = 22
/** Matches the ticket-balance chip height so this stack clears it. */
const TICKET_CHIP_HEIGHT = 40
/** Same top inset as the ticket balance, plus the chip and a gap. */
const PANEL_TOP          = TOGGLE_BUTTONS_SIZE + TOGGLE_GAP + TICKET_CHIP_HEIGHT + PANEL_GAP
/** Wait after loading completes before the ticket and unlock panel appears. */
const PLAYTEST_REVEAL_DELAY = 10 * 1000


// MARK: PlaytestDebugLayer
/**
 * Right-top playtest windows, stacked under the ticket balance.
 * Ticket and unlock actions stay hidden until ten seconds after
 * `ClientEvents.LOAD_COMPLETE`. Bowl-o-tron 3000 shows for the local
 * player's turn (`ON_MY_FRAME_START`) and hides when that turn ends
 * (`ON_MY_FRAME_END`).
 * Registered only while `GameSettings.PLAYTEST_DEBUG_PANEL` is on.
 */
export class PlaytestDebugLayer extends Layer {
	/** True once the post-load delay has elapsed. */
	private playtestReady   = false
	/** True from the local player's frame start until that frame ends. */
	private turnActive      = false
	/** True while the letterbox is holding the top HUD off screen. */
	private letterboxHidden = false

	constructor() {
		super({
			id         : 'bowling-playtest-debug',
			zone       : ZoneType.RightTop,
			canBeHidden: true,
			startHidden: true,
			uiTransform: {
				width : PANEL_WIDTH,
				height: 'auto',
				margin: { top: PANEL_TOP },
			},
		})

		this.bindVisibility()
	}


	// MARK: bindVisibility
	/**
	 * Shows each window on its own event, and keeps both off screen during letterbox.
	 */
	private bindVisibility() {
		eventBus.on(ClientEvents.LOAD_COMPLETE, () => {
			timers.setTimeout(() => {
				this.playtestReady = true
				this.syncVisibility()
			}, PLAYTEST_REVEAL_DELAY)
		})

		eventBus.on(ClientEvents.ON_MY_FRAME_START, () => {
			this.turnActive = true
			this.syncVisibility()
		})
		eventBus.on(ClientEvents.ON_MY_FRAME_END, () => {
			this.turnActive = false
			this.syncVisibility()
		})
		eventBus.on(ClientEvents.ON_GROUP_GAME_END, () => {
			this.turnActive = false
			this.syncVisibility()
		})
		eventBus.on(ClientEvents.REQUEST_LEAVE_GAME, () => {
			this.turnActive = false
			this.syncVisibility()
		})
	}


	// MARK: suppressForLetterbox
	/**
	 * Slides the playtest windows away with the cinematic bars.
	 */
	suppressForLetterbox(duration: number) {
		this.letterboxHidden = true
		this.syncVisibility(duration)
	}


	// MARK: restoreAfterLetterbox
	/**
	 * Brings back whichever windows are allowed once the bars leave.
	 */
	restoreAfterLetterbox(duration: number) {
		this.letterboxHidden = false
		this.syncVisibility(duration)
	}


	// MARK: syncVisibility
	/**
	 * Shows the layer when either window should be on screen.
	 * A later show does not restart the slide if the layer is already in.
	 */
	private syncVisibility(duration = 0.2) {
		const shouldShow = !this.letterboxHidden && (this.playtestReady || this.turnActive)
		if (shouldShow) {
			if (this.visibility.isHidden) this.show(duration)
			return
		}
		if (!this.visibility.isHidden) this.hide(duration)
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


	// MARK: resetTickets
	/**
	 * Asks the server to subtract the local balance, which sets tickets to zero.
	 */
	private resetTickets() {
		const userId  = clientStore.getUserId()
		const balance = userId
			? ComponentStore.getOrNull(PlayerTickets, { key: userId })?.balance ?? 0
			: 0
		if (balance <= 0) return
		ClientMessaging.requestTicket(-balance)
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
		visible  : boolean = true,
	) {
		const theme = getTheme()
		return (
			<UiBox
				key             = {key}
				width           = "100%"
				height          = "auto"
				display         = {visible ? 'flex' : 'none'}
				alignItems      = "flex-start"
				justifyContent  = "flex-start"
				backgroundColor = {alpha(darken(theme.colors.info, 0.9), 0.9)}
				borderColor     = {theme.colors.info}
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
				this.button('playtest_reset_tickets', 'Reset Tickets', () => { this.resetTickets() }),
			], PANEL_GAP, this.playtestReady),
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
			], PANEL_GAP, this.turnActive),
		]
	}
}

export const playtestDebugLayer = new PlaytestDebugLayer()
