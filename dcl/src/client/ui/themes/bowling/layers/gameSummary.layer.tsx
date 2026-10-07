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

import { TICKETS_PER_COMPLETED_GAME } from 'src/shared/data/unlocks'
import { getPerfectScore, normalizeFrameCount } from 'src/shared/settings'
import { GameSummaryCard } from 'src/shared/types/shared-types'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { getPlayerTotalScore } from 'src/shared/utils/scoreCalc'
import { getOrdinalSuffix } from 'src/shared/utils/strings'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { ClientStore } from 'src/client/clientStore'
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
			this.card = card
			this.show(0.8)
		})
		eventBus.on(ClientEvents.ON_GAME_SUMMARY_END, () => {
			this.hide(0.8)
			this.card = undefined
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
						showRanks     : true,
						showTotalScore: true,
					})}
				</UiBox>
				<Row
					key             = "game-summary-tickets"
					width           = "auto"
					height          = {TICKET_ICON_SIZE}
					spacing         = {8}
					alignItems      = "center"
					justifyContent  = "center"
					margin          = {{ bottom: 16 }}
				>
					<Icon
						src       = {gameIconsAtlas.source}
						uvs       = {gameIconsAtlas.uv.ticket}
						width     = {TICKET_ICON_SIZE}
						height    = {TICKET_ICON_SIZE}
						iconColor = {theme.colors.primary}
					/>
					<Text
						value     = {`+${TICKETS_PER_COMPLETED_GAME}`}
						fontSize  = {28}
						fontColor = {theme.colors.light}
						textAlign = "middle-left"
						width     = {80}
						height    = {TICKET_ICON_SIZE}
					/>
				</Row>
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
