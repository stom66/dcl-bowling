import { engine } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { getTheme, Icon, Layer, playOnce, Pulse, Row, Text, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerTickets } from 'src/shared/components/definitions/shared.playerTickets'

import { ClientStore } from 'src/client/clientStore'
import { gameIconsAtlas } from 'src/client/ui/themes/bowling/atlases'
import { TOGGLE_BUTTONS_SIZE, TOGGLE_GAP } from './topRightToggles.layer'


const CHIP_WIDTH       = 200
const CHIP_HEIGHT      = 64
const TICKET_ICON_SIZE = 32

/** Share of the remaining ticket gap closed each second. */
const BALANCE_CATCHUP_PER_SECOND = 0.985

const COUNT_WIDTH    = CHIP_WIDTH - TICKET_ICON_SIZE - 30
const COUNT_HEIGHT   = TICKET_ICON_SIZE
const PULSE_ICON_ID  = 'ticket-balance-icon-pulse'
const PULSE_COUNT_ID = 'ticket-balance-count-pulse'
const PULSE_COUNT    = 3
const PULSE_SCALE    = 1.4

const clientStore = ClientStore.getInstance()


// MARK: formatTicketCount
/** Formats a ticket balance with thousands separators. */
function formatTicketCount(balance: number): string {
	// return the number with a comma separator
	return balance.toLocaleString()
}


// MARK: estimateCatchupSeconds
/**
 * Seconds until `from` eases close enough that it rounds to `to`, matching
 * the chip's exponential catch-up.
 */
function estimateCatchupSeconds(
	from : number,
	to   : number,
): number {
	const gap = Math.abs(to - from)
	if (gap <= 0.5) return 0

	return Math.log(0.5 / gap) / Math.log(1 - BALANCE_CATCHUP_PER_SECOND)
}


// MARK: pulseContent
/**
 * One-shot scale burst around a sized child. Resting scale stays at 1.
 */
function pulseContent(
	id      : string,
	duration: number,
	child   : ReactEcs.JSX.Element,
) {
	return (
		<Pulse
			id         = {id}
			playing    = {false}
			looping    = {false}
			duration   = {duration}
			burstCount = {PULSE_COUNT}
			scaleMin   = {1}
			scaleMax   = {PULSE_SCALE}
		>
			{child}
		</Pulse>
	)
}


// MARK: BalanceCount
/**
 * Ticket total. Font size follows `height` so a pulse scales the digits,
 * not just the text box.
 */
function BalanceCount({
	width  = COUNT_WIDTH,
	height = COUNT_HEIGHT,
	value,
	fontSize,
	fontColor,
}: {
	width?    : number
	height?   : number
	value     : string
	fontSize  : number
	fontColor : Color4
}) {
	const scaledFont = Math.max(1, Math.round(fontSize * (height / COUNT_HEIGHT)))

	return (
		<Text
			value     = {value}
			fontSize  = {scaledFont}
			fontColor = {fontColor}
			textAlign = "middle-right"
			textWrap  = "nowrap"
			width     = {width}
			height    = {height}
			alignSelf = "center"
		/>
	)
}


// MARK: TicketBalanceLayer
/**
 * Always-on ticket balance in the top of the right zone, offset 15vh from the top.
 * The drawn count eases toward the synced balance instead of jumping.
 * Icon and count pulse together while the number is ticking up.
 */
export class TicketBalanceLayer extends Layer {
	/** Tickets currently drawn in the chip. */
	private displayedBalance = 0

	/** Last synced balance we already reacted to, so a pulse fires only on increases. */
	private lastSeenBalance = 0

	/** Seconds for one grow-and-shrink cycle. Set when an increase starts. */
	private pulseDuration = 0.2

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
		this.lastSeenBalance  = this.displayedBalance
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
		const target = this.getBalance()

		if (target > this.lastSeenBalance) {
			this.startIncreasePulse(this.displayedBalance, target)
		}
		this.lastSeenBalance = target

		if (this.balanceSystem !== undefined) return
		if (this.displayedBalance === target) return

		this.startBalanceSystem()
	}


	// MARK: startIncreasePulse
	/**
	 * Plays three scale pulses over the same window as the count-up ease.
	 */
	private startIncreasePulse(
		from : number,
		to   : number,
	) {
		const totalSeconds = estimateCatchupSeconds(from, to)
		if (totalSeconds <= 0) return

		this.pulseDuration = totalSeconds / PULSE_COUNT
		playOnce(PULSE_ICON_ID)
		playOnce(PULSE_COUNT_ID)
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
				{pulseContent(
					PULSE_ICON_ID,
					this.pulseDuration,
					<Icon
						src       = {gameIconsAtlas.source}
						uvs       = {gameIconsAtlas.uv.ticket}
						width     = {TICKET_ICON_SIZE}
						height    = {TICKET_ICON_SIZE}
						iconColor = {theme.colors.primary}
					/>,
				)}
				{pulseContent(
					PULSE_COUNT_ID,
					this.pulseDuration,
					<BalanceCount
						value     = {formatTicketCount(Math.round(this.displayedBalance))}
						fontSize  = {theme.typography.size.h4}
						fontColor = {theme.colors.light}
					/>,
				)}
			</Row>,
		]
	}
}

export const ticketBalanceLayer = new TicketBalanceLayer()
