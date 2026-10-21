import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	alpha,
	Background,
	ButtonImage,
	getTheme,
	Icon,
	IconString,
	Layer,
	Row,
	Text,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerTickets } from 'src/shared/components/definitions/shared.playerTickets'
import { GameTicketLine } from 'src/shared/data/unlocks'
import { getPerfectScore, normalizeFrameCount } from 'src/shared/settings'
import { GameSummaryCard } from 'src/shared/types/shared-types'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { getPlayerTotalScore } from 'src/shared/utils/scoreCalc'
import { getOrdinalSuffix } from 'src/shared/utils/strings'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { ClientStore } from 'src/client/clientStore'
import { UiParticles } from 'src/client/ui/particles/uiParticleLayer'
import {
	bowlingRussoOneAlphaNumericAtlas,
	bowlingRussoOneSymbolsAtlas,
	gameIconsAtlas,
	primaryButtonAtlas,
} from 'src/client/ui/themes/bowling/atlases'
import {
	getScoreboardFrameResults,
	getScoreboardRowWidth,
	renderScoreboard,
} from 'src/client/ui/themes/bowling/layers/scoreboardView'


const ACTION_BTN_W     = 200
const ACTION_BTN_H     = 64
const TICKET_ICON_SIZE = 36
const COLOR_PANEL_FILL = Color4.fromHexString('#1d0231ff')

const stringAtlases = {
	characters: bowlingRussoOneAlphaNumericAtlas,
	symbols   : bowlingRussoOneSymbolsAtlas,
}

const clientStore = ClientStore.getInstance()


// MARK: GameSummaryLayer
/**
 * End-of-game ceremony: congratulations, ranked scoreboard, ticket reward, Continue.
 */
export class GameSummaryLayer extends Layer {
	private card: GameSummaryCard | undefined

	/** True after the ticket stream has fired for the active summary card. */
	private streamedTickets = false

	constructor() {
		super({
			id         : 'bowling-game-summary',
			zone       : ZoneType.FullScreen,
			canBeHidden: true,
			startHidden: true,
			zIndex     : 1600,
			uiTransform: {
				flexDirection : 'column',
				justifyContent: 'center',
				alignItems    : 'center',
				borderWidth   : 0,
			},
		})

		eventBus.on(ClientEvents.ON_GAME_SUMMARY, (card: GameSummaryCard) => {
			this.card            = card
			this.streamedTickets = false
			UiParticles.burst()
			UiParticles.snow()
			this.show(0.8)
		})
		eventBus.on(ClientEvents.ON_GAME_SUMMARY_END, () => {
			this.hide(0.8)
			this.card            = undefined
			this.streamedTickets = false
		})
	}


	// MARK: getHeadline
	/**
	 * Congratulations copy from the cached card and the local player's place.
	 */
	private getHeadline(): string {
		if (!this.card) return ''

		const frameCount   = normalizeFrameCount(this.card.frameCount)
		const frameResults = getScoreboardFrameResults(
			this.card.frames,
			this.card.leaves,
			this.card.frameCount,
			true,
		)
		const totals: { userId: string, score: number }[] = []
		for (const [userId, results] of frameResults.entries()) {
			totals.push({ userId, score: getPlayerTotalScore(results) })
		}

		const localUserId = clientStore.getUserId()
		const local       = totals.find((row) => userProfileCache.isLocalUser(row.userId) || row.userId === localUserId)
		if (!local) return 'Nice game!'

		const topScore  = totals[0]?.score ?? 0
		const tiedForTop = totals.filter((row) => row.score === topScore).length > 1
		const place     = totals.findIndex((row) => row.userId === local.userId) + 1
		const perfect   = local.score === getPerfectScore(frameCount)

		if (perfect) return 'Perfect game!'
		if (local.score === topScore && !tiedForTop) return 'You won!'
		if (local.score === topScore && tiedForTop) return "It's a tie!"
		return `Nice game! ${place}${getOrdinalSuffix(place)} place`
	}


	// MARK: requestDismiss
	/** Closes the ceremony. The coordinator finishes the camera and lobby move. */
	private requestDismiss() {
		eventBus.emit(ClientEvents.ON_GAME_SUMMARY_END, {})
	}


	// MARK: getTicketLines
	/**
	 * Payout lines for this match. Empty until the server publish matches the card.
	 */
	private getTicketLines(): GameTicketLine[] | undefined {
		if (!this.card || this.card.gameStartTime <= 0) return undefined

		const userId  = clientStore.getUserId()
		const tickets = userId ? ComponentStore.getOrNull(PlayerTickets, { key: userId }) : null
		if (!tickets) return undefined
		if (Number(tickets.lastPayoutStartedAt) !== this.card.gameStartTime) return undefined
		return tickets.lastPayoutLines.map((line) => ({
			label   : line.label,
			count   : line.count,
			tickets : line.tickets,
		}))
	}


	// MARK: maybeStreamTickets
	/**
	 * Fires the ticket stream once when this match's payout first syncs with a
	 * positive total — same celebration as claiming a ticket reward popup.
	 */
	private maybeStreamTickets(total: number) {
		if (this.streamedTickets) return
		this.streamedTickets = true
		if (total <= 0) return
		UiParticles.stream()
	}


	// MARK: renderTicketPayout
	/**
	 * Line-by-line ticket rows for the match being celebrated, plus the total.
	 */
	private renderTicketPayout(
		fontColor : Color4,
		iconColor : Color4,
	) {
		const lines = this.getTicketLines()
		if (!lines) {
			return (
				<Text
					key       = "game-summary-tickets-pending"
					value     = "Tickets syncing"
					fontSize  = {22}
					fontColor = {fontColor}
					textAlign = "middle-center"
					width     = "100%"
					height    = {32}
					margin    = {{ bottom: 16 }}
				/>
			)
		}

		const total = lines.reduce((sum, line) => sum + line.tickets, 0)
		this.maybeStreamTickets(total)
		return (
			<UiBox
				key            = "game-summary-tickets"
				width          = "100%"
				height         = "auto"
				alignItems     = "center"
				justifyContent = "center"
				margin         = {{ bottom: 16 }}
				borderWidth    = {0}
				uiTransform    = {{ flexDirection: 'column' }}
			>
				{lines.map((line) => (
					<Row
						key            = {`game-summary-ticket-${line.label}`}
						width          = {360}
						height         = {28}
						spacing        = {8}
						alignItems     = "center"
						justifyContent = "space-between"
					>
						<Text
							value     = {`${line.label} × ${line.count}`}
							fontSize  = {22}
							fontColor = {fontColor}
							textAlign = "middle-left"
							width     = {260}
							height    = {28}
						/>
						<Text
							value     = {`+${line.tickets}`}
							fontSize  = {22}
							fontColor = {fontColor}
							textAlign = "middle-right"
							width     = {80}
							height    = {28}
						/>
					</Row>
				))}
				<Row
					key            = "game-summary-ticket-total"
					width          = "auto"
					height         = {TICKET_ICON_SIZE}
					spacing        = {8}
					alignItems     = "center"
					justifyContent = "center"
					margin         = {{ top: 8 }}
				>
					<Icon
						src       = {gameIconsAtlas.source}
						uvs       = {gameIconsAtlas.uv.ticket}
						width     = {TICKET_ICON_SIZE}
						height    = {TICKET_ICON_SIZE}
						iconColor = {iconColor}
					/>
					<Text
						value     = {`+${total}`}
						fontSize  = {28}
						fontColor = {fontColor}
						textAlign = "middle-left"
						width     = {80}
						height    = {TICKET_ICON_SIZE}
					/>
				</Row>
			</UiBox>
		)
	}


	// MARK: body
	protected body() {
		if (!this.card) return []

		const theme    = getTheme()
		const rowWidth = getScoreboardRowWidth(this.card.frameCount, true, true)
		const panelWidth = Math.max(rowWidth + 48, 520)

		return [
			<UiBox
				key            = "game-summary-panel"
				width          = {panelWidth}
				height         = "auto"
				alignItems     = "center"
				justifyContent = "center"
				padding        = {{ top: 20, bottom: 20, left: 16, right: 16 }}
				borderWidth    = {0}
				uiTransform    = {{ flexDirection: 'column' }}
			>
				<Background
					key             = "game-summary-chrome"
					backgroundColor = {alpha(COLOR_PANEL_FILL, 0.92)}
					borderColor     = {theme.colors.primary}
					borderWidth     = {3}
					borderRadius    = {24}
				/>
				<Text
					key       = "game-summary-headline"
					value     = {this.getHeadline()}
					fontSize  = {32}
					fontColor = {theme.colors.light}
					textAlign = "middle-center"
					width     = "100%"
					height    = {44}
				/>
				<UiBox
					key            = "game-summary-board"
					width          = {rowWidth}
					height         = "auto"
					alignItems     = "center"
					justifyContent = "center"
					margin         = {{ top: 12, bottom: 16 }}
					borderWidth    = {0}
					uiTransform    = {{ flexDirection: 'column' }}
				>
					{renderScoreboard({
						frameCount    : this.card.frameCount,
						frames        : this.card.frames,
						keyPrefix     : 'ui_GameSummary',
						leaves        : this.card.leaves,
						leftUserIds   : this.card.leftUserIds,
						showRanks     : true,
						showTotalScore: true,
					})}
				</UiBox>
				{this.renderTicketPayout(theme.colors.light, theme.colors.primary)}
				<ButtonImage
					id             = "btn_game_summary_continue"
					atlas          = {primaryButtonAtlas}
					uvColumn       = {1}
					width          = {ACTION_BTN_W}
					height         = {ACTION_BTN_H}
					alignItems     = "center"
					justifyContent = "center"
					callback       = {() => { this.requestDismiss() }}
					uiTransform    = {{
						positionType: 'relative',
						position    : { top: 0, left: 0 },
					}}
				>
					<IconString
						value     = "CONTINUE"
						height    = {18}
						iconColor = {Color4.White()}
						atlases   = {stringAtlases}
					/>
				</ButtonImage>
			</UiBox>,
		]
	}
}

export const gameSummaryLayer = new GameSummaryLayer()
