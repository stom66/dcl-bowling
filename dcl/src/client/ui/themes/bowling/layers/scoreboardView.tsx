import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { alpha, AvatarIcon, getTheme, IconString, UiBox } from '@stom66/dcl-ui-component-kit'

import { FrameResult, getFrameResults, getPlayerTotalScore } from 'src/shared/utils/scoreCalc'
import { getOrdinalSuffix } from 'src/shared/utils/strings'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { bowlingRussoOneAlphaNumericAtlas, bowlingRussoOneSymbolsAtlas } from 'src/client/ui/themes/bowling/atlases'


export const FRAME_CELL_WIDTH  = 52
export const FRAME_CELL_HEIGHT = 45
export const FRAME_CELL_MARGIN = 4

const SCORE_BOX_WIDTH    = 16
const SCORE_BOX_HEIGHT   = 18
const SCORE_GLYPH_HEIGHT = 14
const BADGE_GLYPH_HEIGHT = 16
const NAME_GLYPH_HEIGHT  = 16
const DISPLAY_NAME_WIDTH = 140

const SCORE_ATLASES = {
	characters: bowlingRussoOneAlphaNumericAtlas,
	symbols   : bowlingRussoOneSymbolsAtlas,
}

const displayNames       : Map<string, string> = new Map()
const pendingDisplayNames: Set<string>         = new Set()


export type ScoreboardViewProps = {
	frameCount    : number
	frames        : Map<string, number[][]>
	keyPrefix     : string
	leaves        : Map<string, number[]> | null
	showRanks     : boolean
	showTotalScore: boolean
}


// MARK: getScoreboardRowWidth
/**
 * Pixel width of one scoreboard row for the given frame count and extras.
 */
export function getScoreboardRowWidth(
	frameCount    : number,
	showRanks     : boolean,
	showTotalScore: boolean,
): number {
	let rowWidth = (FRAME_CELL_WIDTH + FRAME_CELL_MARGIN) * frameCount
	rowWidth += FRAME_CELL_HEIGHT + FRAME_CELL_MARGIN
	rowWidth += DISPLAY_NAME_WIDTH + FRAME_CELL_MARGIN
	if (showRanks)      rowWidth += FRAME_CELL_HEIGHT + FRAME_CELL_MARGIN
	if (showTotalScore) rowWidth += FRAME_CELL_HEIGHT + FRAME_CELL_MARGIN
	return rowWidth
}


// MARK: getScoreboardFrameResults
/**
 * Builds per-player frame results from a scorecard. Sorted high-to-low when
 * `sortResults` is true.
 */
export function getScoreboardFrameResults(
	frames      : Map<string, number[][]>,
	leaves      : Map<string, number[]> | null,
	frameCount  : number,
	sortResults : boolean = false,
): Map<string, FrameResult[]> {
	const frameResults = new Map<string, FrameResult[]>()
	for (const [userId, frame] of frames.entries()) {
		frameResults.set(userId, getFrameResults(frame, frameCount, leaves?.get(userId)))
	}

	if (!sortResults) return frameResults

	return new Map<string, FrameResult[]>([...frameResults.entries()].sort((a, b) => {
		return getPlayerTotalScore(b[1]) - getPlayerTotalScore(a[1])
	}))
}


// MARK: getRowDisplayName
/**
 * Display name for a scoreboard row. Empty until the profile fetch resolves.
 */
function getRowDisplayName(userId: string): string {
	const cached = displayNames.get(userId)
	if (cached !== undefined) return cached

	if (!pendingDisplayNames.has(userId)) {
		pendingDisplayNames.add(userId)
		void userProfileCache.getDisplayName(userId).then((displayName) => {
			pendingDisplayNames.delete(userId)
			displayNames.set(userId, displayName)
		})
	}

	return ''
}


// MARK: getFramesUi
/** Roll cells and running totals for one player's frames. */
function getFramesUi(
	userId      : string,
	frameResults: FrameResult[],
	frameCount  : number,
	keyPrefix   : string,
) {
	const theme = getTheme()
	const ui    : ReactEcs.JSX.Element[] = []

	for (const [frameIndex, frameResult] of frameResults.entries()) {
		const frameScores: ReactEcs.JSX.Element[] = []
		const isLastFrame = frameResult.frameNumber === frameCount

		for (let i = 0; i < frameResult.scores.length; i++) {
			const score = frameResult.scores[i]
			let scoreDisplay = score.toString()
			if (score === 0) scoreDisplay = '-'
			if (score === 10) scoreDisplay = 'X'
			if (i === 1 && frameResult.isSpare) scoreDisplay = '/'

			const isSplitMark = frameResult.isSplit && i === 0

			frameScores.push(
				<UiBox
					key             = {`${keyPrefix}_row_${userId}_frame_${frameIndex}_score_${i}`}
					width           = {SCORE_BOX_WIDTH}
					height          = {SCORE_BOX_HEIGHT}
					margin          = {{ right: 2 }}
					borderRadius    = {isSplitMark ? SCORE_BOX_WIDTH / 2 : 3}
					backgroundColor = {isSplitMark ? theme.colors.success : theme.colors.info}
					alignItems      = "center"
					justifyContent  = "center"
					uiTransform     = {{ flexDirection: 'column' }}
				>
					<IconString
						value     = {scoreDisplay}
						height    = {SCORE_GLYPH_HEIGHT}
						iconColor = {theme.colors.light}
						atlases   = {SCORE_ATLASES}
					/>
				</UiBox>,
			)

			const isLastRoll  = i === frameResult.scores.length - 1
			const firstScore  = frameResult.scores[0] ?? 0
			const secondScore = frameResult.scores[1]
			const hasSecond   = secondScore !== undefined
			const hasThird    = frameResult.scores.length >= 3
			let padCount      = 0
			if (isLastRoll && isLastFrame && firstScore === 10 && !hasSecond) {
				padCount = 2
			} else if (
				isLastRoll && isLastFrame && !hasThird
				&& (firstScore === 10 || (hasSecond && firstScore + secondScore === 10))
			) {
				padCount = 1
			} else if (isLastRoll && score < 10 && frameResult.scores.length < 2) {
				padCount = 1
			}

			for (let pad = 0; pad < padCount; pad++) {
				frameScores.push(
					<UiBox
						key             = {`${keyPrefix}_row_${userId}_frame_${frameIndex}_pad_${pad}`}
						width           = {16}
						height          = {18}
						margin          = {{ right: 2 }}
						borderRadius    = {3}
						alignItems      = "center"
						justifyContent  = "center"
					/>,
				)
			}
		}

		ui.push(
			<UiBox
				key             = {`${keyPrefix}_row_${userId}_frame_${frameIndex}`}
				width           = {FRAME_CELL_WIDTH}
				height          = {45}
				margin          = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
				borderRadius    = {4}
				backgroundColor = {Color4.fromHexString(frameResult.isStrike ? '#1f354d' : frameResult.isSpare ? '#345981' : '#4c958166')}
				uiTransform     = {{ flexDirection: 'column' }}
			>
				<UiBox
					key            = {`${keyPrefix}_row_${userId}_frame_${frameIndex}_scores`}
					width          = "100%"
					height         = "50%"
					alignItems     = "flex-end"
					justifyContent = "flex-end"
					borderWidth    = {0}
					uiTransform    = {{ flexDirection: 'row' }}
				>
					{frameScores}
				</UiBox>
				<UiBox
					key            = {`${keyPrefix}_row_${userId}_frame_${frameIndex}_runningTotal`}
					width          = "100%"
					height         = "50%"
					alignItems     = "center"
					justifyContent = "center"
					borderWidth    = {0}
				>
					<IconString
						value     = {frameResult.runningScore?.toString() ?? '-'}
						height    = {SCORE_GLYPH_HEIGHT}
						iconColor = {alpha(theme.colors.light, frameResult.isPending ? 0.25 : 1)}
						atlases   = {SCORE_ATLASES}
					/>
				</UiBox>
			</UiBox>,
		)
	}

	return ui
}


// MARK: renderScoreboard
/**
 * Ranked or live scoreboard rows. Callers supply the scorecard so this view
 * still works after the local lane index is cleared.
 */
export function renderScoreboard(props: ScoreboardViewProps): ReactEcs.JSX.Element[] {
	const theme        = getTheme()
	const frameResults = getScoreboardFrameResults(
		props.frames,
		props.leaves,
		props.frameCount,
		props.showRanks,
	)
	const rowWidth = getScoreboardRowWidth(props.frameCount, props.showRanks, props.showTotalScore)
	const ui       : ReactEcs.JSX.Element[] = []
	let rank       = 0

	for (const [userId, frameResult] of frameResults.entries()) {
		rank++
		ui.push(
			<UiBox
				key           = {`${props.keyPrefix}_row_${userId}`}
				width         = {rowWidth}
				height        = {FRAME_CELL_HEIGHT}
				alignItems    = "flex-start"
				margin        = {{ bottom: 5 }}
				borderWidth   = {0}
				uiTransform   = {{ flexDirection: 'row' }}
			>
				<UiBox
					key             = {`${props.keyPrefix}_row_${userId}_rank`}
					width           = {FRAME_CELL_HEIGHT}
					height          = {FRAME_CELL_HEIGHT}
					backgroundColor = {theme.colors.info}
					borderRadius    = {8}
					margin          = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
					alignItems      = "center"
					justifyContent  = "center"
					uiTransform     = {{
						display      : props.showRanks ? 'flex' : 'none',
						flexDirection: 'column',
					}}
				>
					<IconString
						value     = {rank.toString() + getOrdinalSuffix(rank)}
						height    = {BADGE_GLYPH_HEIGHT}
						iconColor = {theme.colors.light}
						atlases   = {SCORE_ATLASES}
					/>
				</UiBox>
				<IconString
					key         = {`${props.keyPrefix}_row_${userId}_displayName`}
					value       = {getRowDisplayName(userId)}
					height      = {NAME_GLYPH_HEIGHT}
					width       = {DISPLAY_NAME_WIDTH}
					iconColor   = {theme.colors.light}
					atlases     = {SCORE_ATLASES}
					margin      = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
					uiTransform = {{
						justifyContent: 'flex-start',
						alignSelf     : 'center',
					}}
				/>
				<AvatarIcon
					key          = {`${props.keyPrefix}_row_${userId}_avatar`}
					userId       = {userId}
					width        = {FRAME_CELL_HEIGHT}
					height       = {FRAME_CELL_HEIGHT}
					borderRadius = {8}
					margin       = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
				/>
				<UiBox
					key           = {`${props.keyPrefix}_row_${userId}_scores`}
					width         = "auto"
					height        = {45}
					alignItems    = "flex-start"
					borderWidth   = {0}
					uiTransform   = {{ flexDirection: 'row' }}
				>
					{getFramesUi(userId, frameResult, props.frameCount, props.keyPrefix)}
				</UiBox>
				<UiBox
					key    = {`${props.keyPrefix}_row_${userId}_spacer`}
					width  = {0}
					height = {FRAME_CELL_HEIGHT}
					uiTransform = {{
						flexGrow  : 1,
						flexShrink: 0,
						display   : props.showTotalScore ? 'flex' : 'none',
					}}
				/>
				<UiBox
					key             = {`${props.keyPrefix}_row_${userId}_totalScore`}
					width           = {FRAME_CELL_HEIGHT}
					height          = {FRAME_CELL_HEIGHT}
					backgroundColor = {theme.colors.info}
					borderRadius    = {8}
					margin          = {{ left: FRAME_CELL_MARGIN / 2, right: FRAME_CELL_MARGIN / 2 }}
					alignItems      = "center"
					justifyContent  = "center"
					uiTransform     = {{
						display      : props.showTotalScore ? 'flex' : 'none',
						alignSelf    : 'flex-end',
						flexDirection: 'column',
					}}
				>
					<IconString
						value     = {getPlayerTotalScore(frameResult).toString()}
						height    = {BADGE_GLYPH_HEIGHT}
						iconColor = {theme.colors.light}
						atlases   = {SCORE_ATLASES}
					/>
				</UiBox>
			</UiBox>,
		)
	}

	return ui
}
