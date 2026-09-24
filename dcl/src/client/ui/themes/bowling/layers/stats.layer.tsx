import ReactEcs from '@dcl/sdk/react-ecs'
import { atlasIconsFontAwesome, ButtonText, Column, Divider, getTheme, Grid, Icon, Layer, Row, Text, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerActivity } from 'src/shared/components/definitions/shared.playerActivity'
import { PlayerStats } from 'src/shared/components/definitions/shared.playerStats'
import { PlayerMatchSummary } from 'src/shared/data/unlocks/types'

import { ClientStore } from 'src/client/clientStore'


const clientStore = ClientStore.getInstance()

const CLOSE_SIZE              = 44
const STAT_ROW_HEIGHT         = 28
const MATCH_HISTORY_VISIBLE   = 10
const PANEL_WIDTH             = '42vw'


type StatCell = {
	id    : string
	label : string
	value : string
}


// MARK: formatCount
/** Whole-number counter, or a dash when the value is missing. */
function formatCount(value: number | undefined): string {
	if (value === undefined) return '-'
	return Math.max(0, Math.floor(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}


// MARK: formatWinRate
/** Win percentage from career games, or a dash before the first completed game. */
function formatWinRate(
	won    : number | undefined,
	played : number | undefined,
): string {
	if (won === undefined || played === undefined || played <= 0) return '-'
	return `${Math.round((won / played) * 100)}%`
}


// MARK: formatUtcDate
/** UTC calendar date for a persisted timestamp. */
function formatUtcDate(timestamp: number | undefined): string {
	const ms = Number(timestamp) || 0
	if (ms <= 0) return '-'

	const date  = new Date(ms)
	const month = String(date.getUTCMonth() + 1).padStart(2, '0')
	const day   = String(date.getUTCDate()).padStart(2, '0')
	return `${date.getUTCFullYear()}-${month}-${day}`
}


// MARK: copyMatches
/** Copies synced match rows into a mutable local array. */
function copyMatches(matches: readonly PlayerMatchSummary[] | undefined): PlayerMatchSummary[] {
	return (matches ?? []).map((match) => ({
		startedAt  : Number(match.startedAt) || 0,
		durationMs : match.durationMs,
		frameCount : match.frameCount,
		score      : match.score,
		won        : match.won,
	}))
}


// MARK: StatsLayer
/**
 * Screen HUD for the local player's career counters and recent match history.
 */
export class StatsLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-stats',
			zone       : ZoneType.Default,
			canBeHidden: true,
			startHidden: true,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			zIndex     : 500,
			uiTransform: {
				width : PANEL_WIDTH,
				height: '76vh',
			},
		})
	}


	// MARK: close
	/** Hides the stats window. */
	close() {
		this.hide(0.2)
	}


	// MARK: closeButton
	/** Dismisses the stats window. */
	private closeButton() {
		const theme = getTheme()

		return (
			<ButtonText
				id              = "btn_stats_close"
				width           = {CLOSE_SIZE}
				height          = {CLOSE_SIZE}
				aspectRatio     = {1}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {2}
				callback        = {() => { this.close() }}
			>
				<Icon
					uvs       = {atlasIconsFontAwesome.uv.xmark}
					width     = "55%"
					height    = "55%"
					iconColor = {theme.colors.light}
				/>
			</ButtonText>
		)
	}


	// MARK: sectionTitle
	/** Section heading inside the stats panel. */
	private sectionTitle(
		id    : string,
		label : string,
	) {
		const theme = getTheme()

		return (
			<Text
				key       = {id}
				value     = {label}
				fontSize  = {theme.typography.size.default}
				fontColor = {theme.colors.light}
				textAlign = "middle-left"
				width     = "100%"
				height    = {32}
			/>
		)
	}


	// MARK: statCell
	/** Label on the left, value on the right. */
	private statCell(cell: StatCell) {
		const theme = getTheme()

		return (
			<Row
				key            = {cell.id}
				width          = "100%"
				height         = {STAT_ROW_HEIGHT}
				alignItems     = "center"
				justifyContent = "space-between"
			>
				<Text
					value     = {cell.label}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.tertiary}
					textAlign = "middle-left"
					width     = "62%"
					height    = {STAT_ROW_HEIGHT}
				/>
				<Text
					value     = {cell.value}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.primary}
					textAlign = "middle-right"
					width     = "38%"
					height    = {STAT_ROW_HEIGHT}
				/>
			</Row>
		)
	}


	// MARK: matchRow
	/** One recent-match row: date, length, score, result. */
	private matchRow(
		match : PlayerMatchSummary,
		index : number,
	) {
		const theme = getTheme()

		return (
			<Row
				key            = {`stats-match-${index}-${match.startedAt}`}
				width          = "100%"
				height         = {STAT_ROW_HEIGHT}
				alignItems     = "center"
				justifyContent = "space-between"
			>
				<Text
					value     = {formatUtcDate(match.startedAt)}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					width     = "36%"
					height    = {STAT_ROW_HEIGHT}
				/>
				<Text
					value     = {`${match.frameCount}F`}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.tertiary}
					textAlign = "middle-center"
					width     = "16%"
					height    = {STAT_ROW_HEIGHT}
				/>
				<Text
					value     = {formatCount(match.score)}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.primary}
					textAlign = "middle-right"
					width     = "22%"
					height    = {STAT_ROW_HEIGHT}
				/>
				<Text
					value     = {match.won ? 'Win' : 'Loss'}
					fontSize  = {theme.typography.size.small}
					fontColor = {match.won ? theme.colors.primary : theme.colors.tertiary}
					textAlign = "middle-right"
					width     = "26%"
					height    = {STAT_ROW_HEIGHT}
				/>
			</Row>
		)
	}


	// MARK: statGrid
	/** Two-column grid of career counters. */
	private statGrid(
		id    : string,
		cells : StatCell[],
	) {
		return (
			<Grid
				key    = {id}
				limit  = {2}
				width  = "100%"
				height = "auto"
			>
				{cells.map((cell) => this.statCell(cell))}
			</Grid>
		)
	}


	// MARK: body
	protected body() {
		const theme    = getTheme()
		const userId   = clientStore.getUserId()
		const stats    = userId ? ComponentStore.getOrNull(PlayerStats, { key: userId }) : null
		const activity = userId ? ComponentStore.getOrNull(PlayerActivity, { key: userId }) : null
		const matches  = copyMatches(stats?.matches).slice(0, MATCH_HISTORY_VISIBLE)

		const recordCells: StatCell[] = [
			{ id: 'stats-played',   label: 'Games played',  value: formatCount(stats?.gamesPlayed) },
			{ id: 'stats-won',      label: 'Wins',          value: formatCount(stats?.gamesWon) },
			{ id: 'stats-lost',     label: 'Losses',        value: formatCount(stats?.gamesLost) },
			{ id: 'stats-winrate',  label: 'Win rate',      value: formatWinRate(stats?.gamesWon, stats?.gamesPlayed) },
			{ id: 'stats-perfect',  label: 'Perfect games', value: formatCount(stats?.perfectGames) },
			{ id: 'stats-hosted',   label: 'Games hosted',  value: formatCount(stats?.gamesCreated) },
			{ id: 'stats-left',     label: 'Left early',    value: formatCount(stats?.gamesLeftEarly) },
			{ id: 'stats-first',    label: 'First played',  value: formatUtcDate(activity?.firstPlayedAt) },
		]

		const bowlingCells: StatCell[] = [
			{ id: 'stats-balls',    label: 'Balls rolled',  value: formatCount(stats?.rolledBalls) },
			{ id: 'stats-strikes',  label: 'Strikes',       value: formatCount(stats?.rolledStrikes) },
			{ id: 'stats-spares',   label: 'Spares',        value: formatCount(stats?.rolledSpares) },
			{ id: 'stats-gutters',  label: 'Gutter balls',  value: formatCount(stats?.rolledGutterBalls) },
			{ id: 'stats-pins',     label: 'Pins knocked',  value: formatCount(stats?.pinsKnockedDown) },
			{ id: 'stats-streak',   label: 'Streak',        value: activity ? `${formatCount(activity.currentStreak)} / ${formatCount(activity.maxStreak)}` : '-' },
		]

		return [
			<UiBox
				key             = "stats-content"
				width           = {PANEL_WIDTH}
				height          = "auto"
				padding         = {24}
				borderWidth     = {3}
				alignItems      = "stretch"
				justifyContent  = "flex-start"
				uiTransform     = {{ flexDirection: 'column' }}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderRadius    = {16}
			>
				<Row
					width          = "100%"
					height         = {44}
					margin         = {{ bottom: 8 }}
					alignItems     = "center"
					justifyContent = "space-between"
				>
					<Text
						value     = "My Stats"
						fontSize  = {theme.typography.size.h3}
						fontColor = {theme.colors.light}
						textAlign = "middle-left"
						width     = "auto"
						height    = {36}
					/>
					{this.closeButton()}
				</Row>
				{this.sectionTitle('stats-record-title', 'Career')}
				{this.statGrid('stats-record-grid', recordCells)}
				<Divider margin={{ top: 8, bottom: 8 }} thickness={1} />
				{this.sectionTitle('stats-bowling-title', 'Bowling')}
				{this.statGrid('stats-bowling-grid', bowlingCells)}
				<Divider margin={{ top: 8, bottom: 8 }} thickness={1} />
				{this.sectionTitle('stats-matches-title', 'Recent matches')}
				<Column
					cols           = {12}
					width          = "100%"
					height         = "auto"
					alignItems     = "stretch"
					justifyContent = "flex-start"
				>
					{matches.length === 0
						? (
							<Text
								value     = "No games recorded yet"
								fontSize  = {theme.typography.size.small}
								fontColor = {theme.colors.tertiary}
								textAlign = "middle-left"
								width     = "100%"
								height    = {STAT_ROW_HEIGHT}
							/>
						)
						: matches.map((match, index) => this.matchRow(match, index))
					}
				</Column>
			</UiBox>,
		]
	}
}

export const statsLayer = new StatsLayer()
