import ReactEcs from '@dcl/sdk/react-ecs'
import { ButtonText, Column, getTheme, Layer, PropsController, Row, Text, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PerfectGames, SceneScoreboards } from 'src/shared/components/definitions/shared.scoreboards'
import { GameFrameCount, GameSettings } from 'src/shared/settings'
import { LeaderboardScoreRow, PerfectGameEntry } from 'src/shared/types/shared-types'


type BoardPeriod = 'weekly' | 'alltime'

type LeaderboardProps = {
	frameCount: GameFrameCount
	period    : BoardPeriod
	scores    : LeaderboardScoreRow[]
	perfect   : PerfectGameEntry[]
}

const PERFECT_WALL_VISIBLE = 20


// MARK: copyScoreRows
/** Copies synced score rows into mutable local arrays. */
function copyScoreRows(rows: readonly LeaderboardScoreRow[] | undefined): LeaderboardScoreRow[] {
	return (rows ?? []).map((row) => ({
		userId     : row.userId,
		displayName: row.displayName,
		score      : row.score,
		rank       : row.rank,
	}))
}


// MARK: copyPerfectEntries
/** Copies synced perfect-game rows into a mutable local array. */
function copyPerfectEntries(entries: readonly PerfectGameEntry[] | undefined): PerfectGameEntry[] {
	return (entries ?? []).map((entry) => ({
		displayName: entry.displayName,
		userId     : entry.userId,
		achievedAt : Number(entry.achievedAt) || 0,
		frameCount : entry.frameCount,
	}))
}


// MARK: pickBoard
/** Returns the ranked rows for one length + period pair. */
function pickBoard(
	boards    : ReturnType<typeof SceneScoreboards.getOrNull> | null | undefined,
	period    : BoardPeriod,
	frameCount: GameFrameCount,
): LeaderboardScoreRow[] {
	if (!boards) return []

	if (period === 'weekly') {
		if (frameCount === 3)  return copyScoreRows(boards.weekly3)
		if (frameCount === 6)  return copyScoreRows(boards.weekly6)
		return copyScoreRows(boards.weekly10)
	}

	if (frameCount === 3)  return copyScoreRows(boards.alltime3)
	if (frameCount === 6)  return copyScoreRows(boards.alltime6)
	return copyScoreRows(boards.alltime10)
}


// MARK: formatAchievedAt
/** UTC calendar date for a wall timestamp. */
function formatAchievedAt(achievedAt: number): string {
	const date = new Date(achievedAt)
	const month = String(date.getUTCMonth() + 1).padStart(2, '0')
	const day   = String(date.getUTCDate()).padStart(2, '0')
	return `${date.getUTCFullYear()}-${month}-${day}`
}


// MARK: LeaderboardLayer
/**
 * Screen HUD for the six ranked boards (length + weekly/all-time filter) and the perfect-game wall.
 */
export class LeaderboardLayer extends Layer {
	private boardProps: PropsController<LeaderboardProps>
	private scoreboards: ReturnType<typeof SceneScoreboards.getOrNull> | null = null

	constructor() {
		super({
			id         : 'bowling-leaderboard',
			zone       : ZoneType.Default,
			canBeHidden: true,
			startHidden: true,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			zIndex     : 500,
			uiTransform: {
				width : '46vw',
				height: '70vh',
			},
		})

		this.boardProps = new PropsController<LeaderboardProps>({
			frameCount: GameSettings.DEFAULT_FRAME_COUNT,
			period    : 'weekly',
			scores    : [],
			perfect   : [],
		})

		ComponentStore.onChange(SceneScoreboards, (data) => {
			this.scoreboards = data ?? null
			this.refreshVisibleScores()
		})

		ComponentStore.onChange(PerfectGames, (data) => {
			this.boardProps.set('perfect', copyPerfectEntries(data?.entries))
		})
	}


	// MARK: selectFrameCount
	/**
	 * Filters ranked boards to one game length.
	 */
	selectFrameCount(frameCount: GameFrameCount) {
		this.boardProps.set('frameCount', frameCount)
		this.refreshVisibleScores()
	}


	// MARK: selectPeriod
	/**
	 * Switches between weekly and all-time for the selected length.
	 */
	selectPeriod(period: BoardPeriod) {
		this.boardProps.set('period', period)
		this.refreshVisibleScores()
	}


	// MARK: refreshVisibleScores
	/**
	 * Copies the currently selected board into props.
	 */
	private refreshVisibleScores() {
		this.boardProps.set(
			'scores',
			pickBoard(this.scoreboards, this.boardProps.get('period'), this.boardProps.get('frameCount')),
		)
	}


	// MARK: filterButton
	/**
	 * Length or period toggle.
	 */
	private filterButton(
		id       : string,
		label    : string,
		selected : boolean,
		onClick  : () => void,
	) {
		const theme = getTheme()

		return (
			<ButtonText
				key             = {id}
				id              = {id}
				textLabel       = {label}
				cols            = {4}
				height          = {36}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {selected ? theme.colors.primary : theme.colors.tertiary}
				borderWidth     = {3}
				fontColor       = {selected ? theme.colors.primary : theme.colors.light}
				callback        = {onClick}
			/>
		)
	}


	// MARK: scoreRow
	/**
	 * One ranked board row.
	 */
	private scoreRow(row: LeaderboardScoreRow) {
		const theme = getTheme()

		return (
			<Row
				key            = {`leaderboard-score-${row.rank}-${row.userId}`}
				width          = "100%"
				height         = {28}
				alignItems     = "center"
				justifyContent = "space-between"
			>
				<Text
					value     = {`${row.rank}. ${row.displayName || 'Unknown'}`}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					width     = "70%"
					height    = {28}
				/>
				<Text
					value     = {String(row.score)}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.primary}
					textAlign = "middle-right"
					width     = "30%"
					height    = {28}
				/>
			</Row>
		)
	}


	// MARK: perfectRow
	/**
	 * One append-only wall row. Order is chronological, first stays first.
	 */
	private perfectRow(
		entry: PerfectGameEntry,
		index: number,
	) {
		const theme = getTheme()

		return (
			<Row
				key            = {`leaderboard-perfect-${index}-${entry.userId}-${entry.achievedAt}`}
				width          = "100%"
				height         = {28}
				alignItems     = "center"
				justifyContent = "space-between"
			>
				<Text
					value     = {`${entry.displayName || 'Unknown'}  ${entry.frameCount}F`}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					width     = "60%"
					height    = {28}
				/>
				<Text
					value     = {formatAchievedAt(entry.achievedAt)}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.tertiary}
					textAlign = "middle-right"
					width     = "40%"
					height    = {28}
				/>
			</Row>
		)
	}


	// MARK: body
	protected body() {
		const theme      = getTheme()
		const frameCount = this.boardProps.get('frameCount')
		const period     = this.boardProps.get('period')
		const scores     = this.boardProps.get('scores')
		const perfect    = this.boardProps.get('perfect').slice(0, PERFECT_WALL_VISIBLE)

		return [
			<UiBox
				key             = "leaderboard-content"
				width           = "46vw"
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
				<Text
					value     = "Records"
					fontSize  = {theme.typography.size.h3}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					width     = "100%"
					height    = {36}
				/>
				<Row
					width          = "100%"
					height         = {40}
					margin         = {{ bottom: 8 }}
					alignItems     = "center"
					justifyContent = "space-between"
				>
					{GameSettings.GAME_FRAME_COUNTS.map((count) => this.filterButton(
						`btn_leaderboard_frames_${count}`,
						`${count}`,
						count === frameCount,
						() => { this.selectFrameCount(count) },
					))}
				</Row>
				<Row
					width          = "100%"
					height         = {40}
					margin         = {{ bottom: 12 }}
					alignItems     = "center"
					justifyContent = "space-between"
				>
					{this.filterButton(
						'btn_leaderboard_weekly',
						'Weekly',
						period === 'weekly',
						() => { this.selectPeriod('weekly') },
					)}
					{this.filterButton(
						'btn_leaderboard_alltime',
						'All-time',
						period === 'alltime',
						() => { this.selectPeriod('alltime') },
					)}
				</Row>
				<Column
					cols           = {12}
					width          = "100%"
					height         = "auto"
					alignItems     = "stretch"
					justifyContent = "flex-start"
				>
					{scores.length === 0
						? (
							<Text
								value     = "No scores yet"
								fontSize  = {theme.typography.size.small}
								fontColor = {theme.colors.tertiary}
								textAlign = "middle-left"
								width     = "100%"
								height    = {28}
							/>
						)
						: scores.map((row) => this.scoreRow(row))
					}
				</Column>
				<Text
					value     = "Perfect games"
					fontSize  = {theme.typography.size.default}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					width     = "100%"
					height    = {32}
				/>
				<Column
					cols           = {12}
					width          = "100%"
					height         = "auto"
					alignItems     = "stretch"
					justifyContent = "flex-start"
				>
					{perfect.length === 0
						? (
							<Text
								value     = "Nobody has bowled a perfect game yet"
								fontSize  = {theme.typography.size.small}
								fontColor = {theme.colors.tertiary}
								textAlign = "middle-left"
								width     = "100%"
								height    = {28}
							/>
						)
						: perfect.map((entry, index) => this.perfectRow(entry, index))
					}
				</Column>
			</UiBox>,
		]
	}
}

export const leaderboardLayer = new LeaderboardLayer()
