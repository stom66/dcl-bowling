import { engine } from '@dcl/sdk/ecs'
import ReactEcs from '@dcl/sdk/react-ecs'
import { getTheme, Icon, Layer, Row, Text, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerTickets } from 'src/shared/components/definitions/shared.playerTickets'

import { ClientStore } from 'src/client/clientStore'
import { gameIconsAtlas } from 'src/client/ui/themes/bowling/atlases'
import { TOGGLE_BUTTONS_SIZE, TOGGLE_GAP } from './topRightToggles.layer'


const CHIP_WIDTH       = 168
const CHIP_HEIGHT      = 40
const TICKET_ICON_SIZE = 32

/** Share of the remaining ticket gap closed each second. */
const BALANCE_CATCHUP_PER_SECOND = 0.985

const clientStore = ClientStore.getInstance()


// MARK: formatTicketCount
/** Formats a ticket balance with thousands separators. */
function formatTicketCount(balance: number): string {
	// return the number with a comma separator
	return balance.toLocaleString()
}


// MARK: TicketBalanceLayer
/**
 * Always-on ticket balance in the top of the right zone, offset 15vh from the top.
 * The drawn count eases toward the synced balance instead of jumping.
 */
export class TicketBalanceLayer extends Layer {
	/** Tickets currently drawn in the chip. */
	private displayedBalance = 0

	/** Catch-up system while the chip is easing. Absent once the display has settled. */
	private balanceSystem?: (dt: number) => void

	constructor() {
		super({
			id         : 'bowling-ticket-balance',
			zone       : ZoneType.RightTop,
			canBeHidden: false,
			uiTransform: {
				width : CHIP_WIDTH,
				height: CHIP_HEIGHT,
				margin: { top: TOGGLE_BUTTONS_SIZE + TOGGLE_GAP },
			},
		})

		this.displayedBalance = this.getBalance()
	}


	// MARK: getBalance
	/** Synced ticket balance for the local player, or 0 before the profile lands. */
	private getBalance(): number {
		const userId = clientStore.getUserId()
		if (!userId) return 0

		return ComponentStore.getOrNull(PlayerTickets, { key: userId })?.balance ?? 0
	}


	// MARK: syncDisplayedBalance
	/** Starts the catch-up system when the synced balance moves off the displayed value. */
	private syncDisplayedBalance() {
		if (this.balanceSystem !== undefined) return
		if (this.displayedBalance === this.getBalance()) return

		this.startBalanceSystem()
	}


	// MARK: startBalanceSystem
	/** Eases the displayed balance toward the synced balance, then removes itself. */
	private startBalanceSystem() {
		const system = (dt: number) => {
			const target = this.getBalance()
			const gap    = target - this.displayedBalance

			// 80% of the remaining gap per second, independent of frame rate.
			this.displayedBalance += gap * (1 - Math.pow(1 - BALANCE_CATCHUP_PER_SECOND, dt))

			if (Math.round(this.displayedBalance) !== target) return

			this.displayedBalance = target
			this.stopBalanceSystem()
		}

		this.balanceSystem = system
		engine.addSystem(system)
	}


	// MARK: stopBalanceSystem
	/** Removes the catch-up system once the displayed balance has settled. */
	private stopBalanceSystem() {
		if (this.balanceSystem === undefined) return

		engine.removeSystem(this.balanceSystem)
		this.balanceSystem = undefined
	}


	// MARK: body
	protected body() {
		this.syncDisplayedBalance()

		const theme = getTheme()

		return [
			<Row
				key             = "ticket-balance"
				width           = "100%"
				height          = "100%"
				spacing         = {0}
				padding         = {{ left: 14, right: 16 }}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.tertiary}
				borderWidth     = {2}
				borderRadius    = {theme.border.radiusSmall}
				alignItems      = "center"
				justifyContent  = "space-between"
			>
				<Icon
					src       = {gameIconsAtlas.source}
					uvs       = {gameIconsAtlas.uv.ticket}
					width     = {TICKET_ICON_SIZE}
					height    = {TICKET_ICON_SIZE}
					iconColor = {theme.colors.primary}
				/>
				<Text
					value     = {formatTicketCount(Math.round(this.displayedBalance))}
					fontSize  = {theme.typography.size.h4}
					fontColor = {theme.colors.light}
					textAlign = "middle-right"
					textWrap  = "nowrap"
					width     = "auto"
					alignSelf = "center"
				/>
			</Row>,
		]
	}
}

export const ticketBalanceLayer = new TicketBalanceLayer()
