import { engine, Entity, Font, Material, MeshRenderer, TextAlignMode, TextShape, Transform, VisibilityComponent } from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PerfectGames, SceneScoreboards } from 'src/shared/components/definitions/shared.scoreboards'
import { admins } from 'src/shared/data/admins'
import { GameFrameCount } from 'src/shared/settings'
import { LeaderboardScoreRow, PerfectGameEntry } from 'src/shared/types/shared-types'

import { getAnchorFrameCount, getAnchorPeriod, isHallOfFameAnchor, leaderboardAnchors, LeaderboardAnchor, RankedLeaderboardPeriod } from 'src/client/data/leaderboardAnchors'


// Temporary preview: dummy rows on every board. Turn off before shipping.
const DEBUG_FORCE_SHOW = true

const FIRST_ROW_OFFSET_Y     = 1.15
const ROW_WIDTH              = 1.70
const HOF_FIRST_ROW_OFFSET_Y = 1.5
const HOF_ROW_WIDTH          = 1.20
const ROW_HEIGHT             = 0.10
const ROW_SPACING            = 0.0075
const ROW_FORWARD_Z          = 0.0375
const MAX_RANKED_ROWS        = 10
const MAX_HALL_OF_FAME_ROWS  = 10
/** Glyph height as a fraction of `ROW_HEIGHT`. 1 fills the row; 0.85 matches the avatars. */
const TEXT_FONT_SIZE         = 1
const AVATAR_SIZE_RATIO      = 0.85
const DISPLAY_NAME_MAX_CHARS = 16
/**
 * Metres produced by TextShape `fontSize` 1. Explorer does not treat fontSize
 * as world metres — without this, avatars (real metres) dwarf the column text.
 */
const TEXT_SHAPE_METERS_PER_UNIT = 0.13

const RANKED_COLUMNS = {
	rank  : 0.12,
	avatar: 0.16,
	name  : 0.48,
	score : 0.24,
}

const HOF_COLUMNS = {
	avatar: 0.22,
	name  : 0.48,
	date  : 0.30,
}

const TEXT_COLOR   = Color4.White()
const TEXT_OUTLINE = Color3.Black()


type ColumnLayout = {
	left  : number
	width : number
	center: number
	right : number
}

type RankedRowEntities = {
	rank  : Entity
	name  : Entity
	score : Entity
	avatar: Entity
}

type HallOfFameRowEntities = {
	name  : Entity
	date  : Entity
	avatar: Entity
}


/** stom — first address in the admin list, used so sample avatars resolve. */
const SAMPLE_AVATAR_USER_ID = admins[0]

const SAMPLE_NAMES = [
	'Alice',
	'Bob',
	'Cora',
	'Diego',
	'Elena',
	'Farid',
	'Gwen',
	'Hiro',
	'Imani',
	'Jules',
]


// MARK: getDummyRankedRows
/**
 * Fake ranked rows for layout preview.
 */
function getDummyRankedRows(frameCount: GameFrameCount): LeaderboardScoreRow[] {
	const perfect = frameCount === 10 ? 300 : frameCount === 6 ? 180 : 90
	return SAMPLE_NAMES.map((displayName, index) => ({
		userId     : SAMPLE_AVATAR_USER_ID,
		displayName: displayName,
		score      : Math.max(0, perfect - index * 11),
		rank       : index + 1,
	}))
}


// MARK: getDummyHallOfFameRows
/**
 * Fake Hall of Fame rows for one game length.
 */
function getDummyHallOfFameRows(frameCount: GameFrameCount): PerfectGameEntry[] {
	const start = Date.UTC(2026, 0, 4)
	return SAMPLE_NAMES.map((displayName, index) => ({
		displayName: displayName,
		userId     : SAMPLE_AVATAR_USER_ID,
		achievedAt : start + index * 86400000 * 9,
		frameCount : frameCount,
	}))
}


// MARK: formatAchievedAt
/**
 * UTC calendar date for a wall timestamp.
 */
function formatAchievedAt(achievedAt: number): string {
	const date  = new Date(achievedAt)
	const month = String(date.getUTCMonth() + 1).padStart(2, '0')
	const day   = String(date.getUTCDate()).padStart(2, '0')
	return `${date.getUTCFullYear()}-${month}-${day}`
}


// MARK: truncateName
/**
 * Shortens a display name so it fits the name column.
 */
function truncateName(name: string): string {
	if (name.length <= DISPLAY_NAME_MAX_CHARS) return name
	return `${name.slice(0, DISPLAY_NAME_MAX_CHARS - 1)}...`
}


// MARK: layoutColumns
/**
 * Builds left/center/right edges for weighted columns centered on X=0.
 */
function layoutColumns(
	weights : { [key: string]: number },
	rowWidth: number,
): { [key: string]: ColumnLayout } {
	const layouts: { [key: string]: ColumnLayout } = {}
	let cursor = -rowWidth / 2

	for (const key of Object.keys(weights)) {
		const width = rowWidth * weights[key]
		layouts[key] = {
			left  : cursor,
			width : width,
			center: cursor + width / 2,
			right : cursor + width,
		}
		cursor += width
	}

	return layouts
}


// MARK: rowPitch
/**
 * Vertical distance from one row centre to the next.
 */
function rowPitch(): number {
	return ROW_HEIGHT + ROW_SPACING
}


// MARK: rowY
/**
 * Local Y for the centre of row `rowIndex`.
 */
function rowY(
	rowIndex : number,
	firstRowY: number,
): number {
	return firstRowY - rowIndex * rowPitch()
}


// MARK: pickRankedRows
/**
 * Returns the ranked rows for one length + period pair.
 */
function pickRankedRows(
	boards    : ReturnType<typeof SceneScoreboards.getOrNull> | null | undefined,
	period    : RankedLeaderboardPeriod,
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


// MARK: copyScoreRows
/**
 * Copies synced score rows into mutable local arrays.
 */
function copyScoreRows(rows: readonly LeaderboardScoreRow[] | undefined): LeaderboardScoreRow[] {
	return (rows ?? []).map((row) => ({
		userId     : row.userId,
		displayName: row.displayName,
		score      : row.score,
		rank       : row.rank,
	}))
}


// MARK: copyPerfectEntries
/**
 * Copies synced perfect-game rows into a mutable local array.
 */
function copyPerfectEntries(entries: readonly PerfectGameEntry[] | undefined): PerfectGameEntry[] {
	return (entries ?? []).map((entry) => ({
		displayName: entry.displayName,
		userId     : entry.userId,
		achievedAt : Number(entry.achievedAt) || 0,
		frameCount : entry.frameCount,
	}))
}


// MARK: createBoardRoot
/**
 * Spawns a board root in world space from the anchor position and Euler.
 */
function createBoardRoot(anchor: LeaderboardAnchor): Entity {
	const entity = engine.addEntity()
	Transform.create(entity, {
		position: anchor.position,
		rotation: Quaternion.fromEulerDegrees(anchor.rotation.x, anchor.rotation.y, anchor.rotation.z),
	})
	return entity
}


// MARK: rowFontSize
/**
 * TextShape fontSize that draws a glyph `TEXT_FONT_SIZE` of `ROW_HEIGHT` tall.
 */
function rowFontSize(): number {
	return (ROW_HEIGHT * TEXT_FONT_SIZE) / TEXT_SHAPE_METERS_PER_UNIT
}


// MARK: createRowRoot
/**
 * Empty transform at a row centre. Rank, name, score, and avatar parent here.
 */
function createRowRoot(
	parent : Entity,
	offsetY: number,
): Entity {
	const entity = engine.addEntity()
	Transform.create(entity, {
		parent  : parent,
		position: Vector3.create(0, offsetY, ROW_FORWARD_Z),
	})
	return entity
}


// MARK: createRowText
/**
 * One TextShape on a single row, middle-aligned to the row centre.
 */
function createRowText(
	parent   : Entity,
	offsetX  : number,
	align    : TextAlignMode,
	textWidth: number,
): Entity {
	const entity = engine.addEntity()
	Transform.create(entity, {
		parent  : parent,
		position: Vector3.create(offsetX, 0, 0),
	})
	TextShape.create(entity, {
		text        : '',
		font        : Font.F_SANS_SERIF,
		fontSize    : rowFontSize(),
		textAlign   : align,
		textColor   : TEXT_COLOR,
		width       : textWidth,
		textWrapping: false,
		outlineWidth: 0.12,
		outlineColor: TEXT_OUTLINE,
	})
	VisibilityComponent.create(entity, { visible: false })
	return entity
}


// MARK: setRowText
/**
 * Writes a single-line value and hides the shape when empty.
 */
function setRowText(
	entity: Entity,
	value : string,
): void {
	const shape = TextShape.getMutableOrNull(entity)
	if (shape) shape.text = value
	setEntityVisible(entity, value.length > 0)
}


// MARK: createAvatarEntity
/**
 * Adds a square avatar plane on a row.
 */
function createAvatarEntity(
	parent : Entity,
	offsetX: number,
): Entity {
	const size   = ROW_HEIGHT * AVATAR_SIZE_RATIO
	const entity = engine.addEntity()
	Transform.create(entity, {
		parent  : parent,
		position: Vector3.create(offsetX, 0, 0),
		scale   : Vector3.create(size, size, 1),
	})
	MeshRenderer.setPlane(entity)
	VisibilityComponent.create(entity, { visible: false })
	return entity
}


// MARK: setEntityVisible
/**
 * Shows or hides an overlay entity without destroying it.
 */
function setEntityVisible(
	entity : Entity,
	visible: boolean,
): void {
	VisibilityComponent.createOrReplace(entity, { visible })
}


// MARK: setAvatar
/**
 * Applies an avatar texture, or hides the plane when `userId` is empty.
 */
function setAvatar(
	entity: Entity,
	userId: string,
): void {
	if (!userId) {
		setEntityVisible(entity, false)
		return
	}

	Material.setPbrMaterial(entity, {
		texture  : Material.Texture.Avatar({ userId }),
		metallic : 0,
		roughness: 1,
	})
	setEntityVisible(entity, true)
}


// MARK: RankedBoard
/**
 * One weekly or all-time overlay, up to ten rows.
 */
class RankedBoard {
	private readonly frameCount: GameFrameCount
	private readonly period    : RankedLeaderboardPeriod
	private readonly rows      : RankedRowEntities[]

	constructor(anchor: LeaderboardAnchor) {
		this.frameCount = getAnchorFrameCount(anchor.id)
		this.period     = getAnchorPeriod(anchor.id) ?? 'weekly'

		const root   = createBoardRoot(anchor)
		const layout = layoutColumns(RANKED_COLUMNS, ROW_WIDTH)
		this.rows    = []

		for (let index = 0; index < MAX_RANKED_ROWS; index++) {
			const rowRoot = createRowRoot(root, rowY(index, FIRST_ROW_OFFSET_Y))
			this.rows.push({
				rank  : createRowText(rowRoot, layout.rank.center,  TextAlignMode.TAM_MIDDLE_CENTER, layout.rank.width),
				name  : createRowText(rowRoot, layout.name.left,    TextAlignMode.TAM_MIDDLE_LEFT,   layout.name.width),
				score : createRowText(rowRoot, layout.score.right,  TextAlignMode.TAM_MIDDLE_RIGHT,  layout.score.width),
				avatar: createAvatarEntity(rowRoot, layout.avatar.center),
			})
		}
	}


	// MARK: applyRows
	/**
	 * Fills visible rows from ranked data and hides the rest.
	 */
	applyRows(rows: LeaderboardScoreRow[]): void {
		const visible = rows.slice(0, MAX_RANKED_ROWS)

		for (let index = 0; index < this.rows.length; index++) {
			const row  = this.rows[index]
			const data = visible[index]
			setRowText(row.rank,  data ? String(data.rank) : '')
			setRowText(row.name,  data ? truncateName(data.displayName) : '')
			setRowText(row.score, data ? String(data.score) : '')
			setAvatar(row.avatar, data?.userId ?? '')
		}
	}


	// MARK: applyFromScoreboards
	/**
	 * Picks this board's rows from the synced scene scoreboards.
	 */
	applyFromScoreboards(
		boards: ReturnType<typeof SceneScoreboards.getOrNull> | null | undefined,
	): void {
		this.applyRows(pickRankedRows(boards, this.period, this.frameCount))
	}


	// MARK: applyDummy
	/**
	 * Fills this board from the local sample rows.
	 */
	applyDummy(): void {
		this.applyRows(getDummyRankedRows(this.frameCount))
	}
}


// MARK: HallOfFameBoard
/**
 * One perfect-game overlay for a single game length.
 */
class HallOfFameBoard {
	private readonly frameCount: GameFrameCount
	private readonly rows      : HallOfFameRowEntities[]

	constructor(anchor: LeaderboardAnchor) {
		this.frameCount = getAnchorFrameCount(anchor.id)

		const root   = createBoardRoot(anchor)
		const layout = layoutColumns(HOF_COLUMNS, HOF_ROW_WIDTH)
		this.rows    = []

		for (let index = 0; index < MAX_HALL_OF_FAME_ROWS; index++) {
			const rowRoot = createRowRoot(root, rowY(index, HOF_FIRST_ROW_OFFSET_Y))
			this.rows.push({
				name  : createRowText(rowRoot, layout.name.left,   TextAlignMode.TAM_MIDDLE_LEFT,  layout.name.width),
				date  : createRowText(rowRoot, layout.date.right,  TextAlignMode.TAM_MIDDLE_RIGHT, layout.date.width),
				avatar: createAvatarEntity(rowRoot, layout.avatar.center),
			})
		}
	}


	// MARK: applyEntries
	/**
	 * Shows the newest matching perfect games at the top.
	 */
	applyEntries(entries: PerfectGameEntry[]): void {
		const newestFirst = entries
			.filter((entry) => entry.frameCount === this.frameCount)
			.slice()
			.reverse()
			.slice(0, MAX_HALL_OF_FAME_ROWS)

		for (let index = 0; index < this.rows.length; index++) {
			const row  = this.rows[index]
			const data = newestFirst[index]
			setRowText(row.name, data ? truncateName(data.displayName) : '')
			setRowText(row.date, data ? formatAchievedAt(data.achievedAt) : '')
			setAvatar(row.avatar, data?.userId ?? '')
		}
	}
}


// MARK: WorldLeaderboards
/**
 * In-world ranked boards and Hall of Fame overlays at the scene mesh transforms.
 */
export namespace WorldLeaderboards {

	const rankedBoards    : RankedBoard[]     = []
	const hallOfFameBoards: HallOfFameBoard[] = []


	// MARK: init
	/**
	 * Spawns every leaderboard overlay and binds them to synced board data.
	 */
	export function init(): void {
		for (const anchor of leaderboardAnchors) {
			if (isHallOfFameAnchor(anchor.id)) {
				hallOfFameBoards.push(new HallOfFameBoard(anchor))
			} else {
				rankedBoards.push(new RankedBoard(anchor))
			}
		}

		if (DEBUG_FORCE_SHOW) {
			applyDummyData()
			return
		}

		ComponentStore.onChange(SceneScoreboards, (data) => {
			for (const board of rankedBoards) {
				board.applyFromScoreboards(data)
			}
		})

		ComponentStore.onChange(PerfectGames, (data) => {
			applyHallOfFameBoards(copyPerfectEntries(data?.entries))
		})
	}


	// MARK: applyDummyData
	/**
	 * Fills every board from the local sample rows.
	 */
	function applyDummyData(): void {
		for (const board of rankedBoards) {
			board.applyDummy()
		}

		const dummyHall = [
			...getDummyHallOfFameRows(3),
			...getDummyHallOfFameRows(6),
			...getDummyHallOfFameRows(10),
		]
		for (const board of hallOfFameBoards) {
			board.applyEntries(dummyHall)
		}

		console.log('WorldLeaderboards: applyDummyData: showing sample rows')
	}


	// MARK: applyHallOfFameBoards
	/**
	 * Pushes synced perfect-game rows onto the three Hall of Fame boards.
	 */
	function applyHallOfFameBoards(entries: PerfectGameEntry[]): void {
		for (const board of hallOfFameBoards) {
			board.applyEntries(entries)
		}
	}
}
