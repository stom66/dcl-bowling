import { Color4 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import ReactEcs from '@dcl/sdk/react-ecs'
import { atlasIconsFontAwesome, ButtonText, Column, Divider, easingFunctions, getTheme, Grid, Icon, Layer, lighten, playOnce, PropsController, Pulse, Row, Shake, Text, UiBox, Wiggle } from '@stom66/dcl-ui-component-kit'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerTickets } from 'src/shared/components/definitions/shared.playerTickets'
import { PlayerUnlocks } from 'src/shared/components/definitions/shared.playerUnlocks'
import { getAllCatalogEntries, isItemOwned } from 'src/shared/data/unlocks'
import { resolvePlayerLoadout } from 'src/shared/data/unlocks/resolveLoadout'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { sfx, SoundManager } from 'src/client/soundManager'
import { bowlingIconAtlas, bowlingThemeAssets, gameIconsAtlas } from 'src/client/ui/themes/bowling/atlases'


type CatalogEntryRow = ReturnType<typeof getAllCatalogEntries>[number]


// MARK: isCustomizationVisible
/**
 * Disabled catalog rows and unshipped scoring animations stay out of this
 * window. Scoring catalogs stay on the server.
 */
function isCustomizationVisible(entry: CatalogEntryRow): boolean {
	if (entry.item.disabled) return false
	if (entry.kind === 'scoring') return false
	return true
}

const CATALOG_ENTRIES            = getAllCatalogEntries().filter(isCustomizationVisible)
const GRID_COLUMNS               = 4
const CATALOG_GROW               = 2
const PREVIEW_GROW               = 1
const THUMB_SIZE                 = 180
const HEADER_ART_WIDTH           = 1024
const HEADER_ART_HEIGHT          = 64
const HEADER_ASPECT              = HEADER_ART_WIDTH / HEADER_ART_HEIGHT
const CLOSE_SIZE                 = 44
const TICKET_CHIP_WIDTH          = 168
const TICKET_CHIP_HEIGHT         = 40
const CATEGORY_BUTTON_HEIGHT     = 48
const ACTION_BUTTON_HEIGHT       = 48
const CATEGORY_ICON_SIZE         = 36
const TICKET_ICON_SIZE           = 32
const EQUIPPED_BADGE_SIZE        = 28
const EQUIPPED_BADGE_INSET       = -8
const PANEL_WIDTH                = 1024
const PANEL_MAX_HEIGHT_DESKTOP   = '70vh'
const PANEL_MAX_HEIGHT_MOBILE    = '90vh'
const PANEL_PADDING              = 20
const PANEL_BORDER               = 3
const CATALOG_CELL_PADDING       = 8
const CATALOG_CELL_BORDER        = 2
const CATALOG_SCROLL_PAD_RIGHT   = 4
const PREVIEW_PADDING            = 16
const PREVIEW_BORDER             = 2
const PREVIEW_TITLE_HEIGHT       = 32
const PREVIEW_DESC_HEIGHT        = 36
const VIRTUAL_HEIGHT_DESKTOP     = 1080
const VIRTUAL_HEIGHT_MOBILE      = 720
const IDLE_CATEGORY_LIGHTEN      = 0.12
const HOVER_BORDER_LIGHTEN        = 0.28
const THUMB_HOVER_WIGGLE_INTERVAL = 2
const PURCHASE_PULSE_SCALE        = 1.08
const PURCHASE_PULSE_ID           = 'customization-purchase-pulse'
const PURCHASE_SHAKE_ID           = 'customization-purchase-shake'

const clientStore = ClientStore.getInstance()
const categoryHover: Record<string, boolean> = {}
const catalogHover : Record<string, boolean> = {}
let actionButtonHover = false

const CATEGORIES = [
	{ kind: 'ball',           label: 'Balls'      },
	{ kind: 'pin',            label: 'Pins'       },
	{ kind: 'lane',           label: 'Lanes'      },
	{ kind: 'spotlight',      label: 'Spotlights' },
	{ kind: 'spotlightColor', label: 'Colors'     },
	{ kind: 'trail',          label: 'Trails'     },
] as const

type CatalogCategory = (typeof CATEGORIES)[number]['kind']

type CustomizationProps = {
	selectedId  : string
	selectedKind: CatalogCategory
}


// MARK: firstIdForKind
/** First catalog id for a category, or an empty string when the category is empty. */
function firstIdForKind(kind: CatalogCategory): string {
	return CATALOG_ENTRIES.find((entry) => entry.kind === kind)?.id ?? ''
}


// MARK: getFrameOutline
/** Light purple used for idle frames, matching the locker reference. */
function getFrameOutline() {
	return lighten(getTheme().colors.secondary, 0.38)
}


// MARK: getIdleCategoryFill
/** Slightly lighter purple than the panel so idle tabs read as buttons. */
function getIdleCategoryFill() {
	return lighten(getTheme().colors.secondary, IDLE_CATEGORY_LIGHTEN)
}


// MARK: getPanelInnerWidth
/** Content width inside panel padding and border. */
function getPanelInnerWidth(): number {
	return PANEL_WIDTH - PANEL_PADDING * 2 - PANEL_BORDER * 2
}


// MARK: getPanelMaxHeight
/** Locker cap: 70vh on desktop, 90vh on mobile. Call at render, not at import. */
function getPanelMaxHeight(): typeof PANEL_MAX_HEIGHT_DESKTOP | typeof PANEL_MAX_HEIGHT_MOBILE {
	return isMobile() ? PANEL_MAX_HEIGHT_MOBILE : PANEL_MAX_HEIGHT_DESKTOP
}


// MARK: getPanelMaxHeightPx
/** Pixel height of the locker cap on the current virtual canvas. */
function getPanelMaxHeightPx(): number {
	return isMobile()
		? VIRTUAL_HEIGHT_MOBILE  * 0.9
		: VIRTUAL_HEIGHT_DESKTOP * 0.7
}


// MARK: getLocalUnlockedIds
/** Synced unlock ids for the local player, or an empty list before the profile lands. */
function getLocalUnlockedIds(): readonly string[] {
	const userId = clientStore.getUserId()
	if (!userId) return []

	const unlocks = ComponentStore.getOrNull(PlayerUnlocks, { key: userId })
	return unlocks?.unlockedItemIds ?? []
}


// MARK: getLocalTicketBalance
/** Synced ticket balance for the local player, or 0 before the profile lands. */
function getLocalTicketBalance(): number {
	const userId = clientStore.getUserId()
	if (!userId) return 0

	return ComponentStore.getOrNull(PlayerTickets, { key: userId })?.balance ?? 0
}


// MARK: isLocalItemOwned
/** True when the local player already owns this catalog row. */
function isLocalItemOwned(itemId: string): boolean {
	return isItemOwned(itemId, getLocalUnlockedIds())
}


// MARK: isLocalItemEquipped
/** True when this catalog row is on the local player's loadout. */
function isLocalItemEquipped(entry: CatalogEntryRow): boolean {
	const loadout = resolvePlayerLoadout(clientStore.getUserId())

	switch (entry.kind) {
		case 'ball':           return loadout.ballId === entry.id
		case 'pin':            return loadout.pinId === entry.id
		case 'lane':           return loadout.laneId === entry.id
		case 'trail':          return loadout.trailId === entry.id
		case 'spotlight':      return loadout.spotlightId === entry.id
		case 'spotlightColor': return loadout.spotlightColorId === entry.id
		case 'scoring':        return loadout.scoringAnimIds.includes(entry.id)
	}
}


// MARK: getEntrySwatch
/** RGB fill for color-catalog thumbs; undefined for texture items. */
function getEntrySwatch(entry: CatalogEntryRow | undefined): { r: number, g: number, b: number } | undefined {
	if (!entry || entry.kind !== 'spotlightColor') return undefined
	return entry.item.color
}


// MARK: formatTicketCount
/** Formats a ticket balance with thousands separators. */
function formatTicketCount(balance: number): string {
	const value = Math.max(0, Math.floor(balance)).toString()
	return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}


// MARK: categoryIcon
/** Atlas cell for a category tab. Balls, pins, and lanes use themed atlases. */
function categoryIcon(kind: CatalogCategory): { src?: string, uvs: number[] } {
	switch (kind) {
		case 'ball':
			return { src: gameIconsAtlas.source, uvs: gameIconsAtlas.uv.ball }
		case 'pin':
			return { src: gameIconsAtlas.source, uvs: gameIconsAtlas.uv.pin }
		case 'lane':
			return { src: bowlingIconAtlas.source, uvs: bowlingIconAtlas.uv.lane1 }
		case 'spotlight':
			return { uvs: atlasIconsFontAwesome.uv.lightbulb }
		case 'spotlightColor':
			return { uvs: (atlasIconsFontAwesome.uv as Record<string, number[]>).palette ?? atlasIconsFontAwesome.uv.lightbulb }
		case 'trail':
			return { uvs: atlasIconsFontAwesome.uv.wind }
	}
}


// MARK: ticketGlyph
/**
 * Ticket glyph from `gameIconsAtlas`. Defaults to theme primary (orange);
 * pass `iconColor` on orange fills so the glyph stays readable.
 */
function ticketGlyph(
	size     : number,
	iconColor?: Color4,
) {
	return (
		<Icon
			src       = {gameIconsAtlas.source}
			uvs       = {gameIconsAtlas.uv.ticket}
			width     = {size}
			height    = {size}
			iconColor = {iconColor ?? getTheme().colors.primary}
		/>
	)
}


// MARK: ticketCostLabel
/** Ticket glyph plus cost, sized for a catalog row or the purchase button. */
function ticketCostLabel(
	cost     : number,
	fontSize : number,
	height   : number,
	iconColor?: Color4,
) {
	return [
		ticketGlyph(TICKET_ICON_SIZE, iconColor),
		<Text
			value     = {`${cost}`}
			fontSize  = {fontSize}
			textWrap  = "nowrap"
			width     = "auto"
			height    = {height}
		/>,
	]
}


// MARK: getCatalogThumbSize
/**
 * Square thumb size that fits one grid cell, never larger than `THUMB_SIZE`.
 */
function getCatalogThumbSize(): number {
	const theme        = getTheme()
	const inner        = getPanelInnerWidth()
	const catalogWidth = (inner - theme.spacing) * CATALOG_GROW / (CATALOG_GROW + PREVIEW_GROW) - CATALOG_SCROLL_PAD_RIGHT
	const gaps         = theme.spacing * (GRID_COLUMNS - 1)
	const cell         = Math.floor((catalogWidth - gaps) / GRID_COLUMNS)
	const thumbInner   = cell - CATALOG_CELL_PADDING * 2 - CATALOG_CELL_BORDER * 2
	return Math.max(48, Math.min(THUMB_SIZE, thumbInner))
}


// MARK: getPreviewImageSize
/**
 * Square preview image that leaves room for title, copy, and the action button.
 * Width-fit is the usual size; height-fit keeps the pane inside the locker on
 * short mobile canvases when the catalog has several scrollable rows.
 */
function getPreviewImageSize(): number {
	const theme        = getTheme()
	const inner        = getPanelInnerWidth()
	const previewWidth = (inner - theme.spacing) * PREVIEW_GROW / (CATALOG_GROW + PREVIEW_GROW)
	const frameInset   = PREVIEW_PADDING * 2 + PREVIEW_BORDER * 2
	const widthFit     = Math.floor(previewWidth - frameInset)

	const headerHeight  = inner / HEADER_ASPECT
	const categoryBlock = 16 + CATEGORY_BUTTON_HEIGHT + 16
	const panelChrome   = PANEL_PADDING * 2 + PANEL_BORDER * 2
	const previewChrome = frameInset + PREVIEW_TITLE_HEIGHT + PREVIEW_DESC_HEIGHT + 12 + ACTION_BUTTON_HEIGHT
	const heightFit     = Math.floor(
		getPanelMaxHeightPx() - panelChrome - headerHeight - categoryBlock - previewChrome,
	)

	return Math.max(96, Math.min(widthFit, heightFit))
}


// MARK: getCatalogRowHeight
/**
 * Remaining locker height under the header and category tabs. Keeps the
 * catalog/preview row flush with `PANEL_PADDING` instead of leaving a taller
 * empty band on the short mobile canvas.
 */
function getCatalogRowHeight(): number {
	const headerHeight  = getPanelInnerWidth() / HEADER_ASPECT
	const categoryBlock = 16 + CATEGORY_BUTTON_HEIGHT + 16
	const panelChrome   = PANEL_PADDING * 2 + PANEL_BORDER * 2
	return Math.max(120, Math.floor(
		getPanelMaxHeightPx() - panelChrome - headerHeight - categoryBlock,
	))
}


// MARK: CustomizationLayer
/**
 * Centered cosmetics window: scrollable catalog grid on the left, selected
 * thumbnail on the right.
 */
export class CustomizationLayer extends Layer {
	private customizationProps: PropsController<CustomizationProps>
	private pendingUnlockId   : string | undefined
	private watchedUserId     : string | undefined

	constructor() {
		super({
			id         : 'bowling-customization',
			canBeHidden: true,
			startHidden: true,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			zIndex     : 500,
			uiTransform: {
				width    : PANEL_WIDTH,
				height   : PANEL_MAX_HEIGHT_DESKTOP,
				maxHeight: PANEL_MAX_HEIGHT_DESKTOP,
			},
		})

		this.customizationProps = new PropsController<CustomizationProps>({
			selectedKind: 'ball',
			selectedId  : firstIdForKind('ball'),
		})
	}


	// MARK: render
	/**
	 * Caps the locker to 70vh on desktop and 90vh on mobile. Evaluated here
	 * so `isMobile()` is not frozen at construction.
	 */
	render() {
		const maxHeight = getPanelMaxHeight()
		if (this.uiTransform) {
			this.uiTransform.height    = maxHeight
			this.uiTransform.maxHeight = maxHeight
		}
		return super.render()
	}


	// MARK: selectCategory
	/**
	 * Shows one unlock category and selects its first item when the current
	 * selection is not in that category.
	 */
	selectCategory(kind: CatalogCategory) {
		const selectedId = this.customizationProps.get('selectedId')
		const stillValid = CATALOG_ENTRIES.some((entry) => {
			return entry.id === selectedId && entry.kind === kind
		})

		this.customizationProps.update({
			selectedKind: kind,
			selectedId  : stillValid ? selectedId : firstIdForKind(kind),
		})
	}


	// MARK: selectItem
	/**
	 * Sets the catalog item shown in the preview column.
	 */
	selectItem(itemId: string) {
		this.customizationProps.set('selectedId', itemId)
	}


	// MARK: close
	/** Hides the locker window. */
	close() {
		this.hide()
	}


	// MARK: ensureProfileWatch
	/**
	 * Subscribes to the local player's unlocks once `userId` is known so a
	 * successful first-time purchase can pulse the action button.
	 */
	private ensureProfileWatch() {
		const userId = clientStore.getUserId()
		if (!userId || this.watchedUserId === userId) return

		this.watchedUserId = userId
		ComponentStore.onChange(PlayerUnlocks, (data) => {
			this.onUnlocksChanged(data?.unlockedItemIds ?? [])
		}, { key: userId })
	}


	// MARK: onUnlocksChanged
	/**
	 * Plays the purchase-success pulse and SFX when a pending unlock lands.
	 */
	private onUnlocksChanged(unlockedItemIds: readonly string[]) {
		const itemId = this.pendingUnlockId
		if (!itemId) return
		if (!isItemOwned(itemId, unlockedItemIds)) return

		this.pendingUnlockId = undefined
		playOnce(PURCHASE_PULSE_ID)
		SoundManager.playSound(sfx.ui_purchase_success)
	}


	// MARK: requestItemAction
	/**
	 * Equips an owned item, or asks the server to spend tickets unlocking it.
	 */
	private requestItemAction(entry: CatalogEntryRow) {
		this.selectItem(entry.id)

		if (isLocalItemOwned(entry.id)) {
			if (isLocalItemEquipped(entry)) return
			ClientMessaging.requestEquipItem(entry.id)
			SoundManager.playSound(sfx.ui_equip)
			return
		}

		const cost    = entry.item.ticketCost
		const balance = getLocalTicketBalance()
		if (balance < cost) {
			console.log('CustomizationLayer: requestItemAction: not enough tickets', entry.id, 'cost', cost, 'balance', balance)
			playOnce(PURCHASE_SHAKE_ID)
			SoundManager.playSound(sfx.ui_purchase_error)
			return
		}

		this.pendingUnlockId = entry.id
		ClientMessaging.requestUnlockItem(entry.id)
	}


	// MARK: getSelectedEntry
	private getSelectedEntry() {
		const selectedId = this.customizationProps.get('selectedId')
		return CATALOG_ENTRIES.find((entry) => entry.id === selectedId)
	}


	// MARK: getVisibleEntries
	private getVisibleEntries() {
		const selectedKind = this.customizationProps.get('selectedKind')
		return CATALOG_ENTRIES.filter((entry) => entry.kind === selectedKind)
	}


	// MARK: header
	/**
	 * Full-width banner sized to the 1024×64 art. `aspectRatio` sizes the box;
	 * DCL textures stretch to fill, so the box has to carry the ratio.
	 */
	private header() {
		const headerWidth = getPanelInnerWidth()

		return (
			<UiBox
				key         = "customization-header"
				width       = {headerWidth}
				aspectRatio = {HEADER_ASPECT}
				overflow    = "hidden"
				flexShrink  = {0}
			>
				<UiBox
					width        = {headerWidth}
					aspectRatio  = {HEADER_ASPECT}
					positionType = "absolute"
					position     = {{ top: 0, left: 0 }}
					uiBackground = {{
						texture    : { src: bowlingThemeAssets.lockerHeader, wrapMode: 'clamp' },
						textureMode: 'stretch',
					}}
				/>
				<Row height="100%" justifyContent="flex-end">
					{this.ticketChip()}
					{this.closeButton()}
				</Row>
			</UiBox>
		)
	}


	// MARK: ticketChip
	/** Live ticket balance with a ticket icon, top-right of the header. */
	private ticketChip() {
		const theme = getTheme()

		return (
			<Row
				key             = "customization-tickets"
				width           = {TICKET_CHIP_WIDTH}
				spacing         = {0}
				height          = {TICKET_CHIP_HEIGHT}
				padding         = {{ left: 14, right: 16 }}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.tertiary}
				borderWidth     = {2}
				borderRadius    = {theme.border.radiusSmall}
				justifyContent  = "space-between"
			>
				{ticketGlyph(TICKET_ICON_SIZE)}
				<Text
					value     = {formatTicketCount(getLocalTicketBalance())}
					fontSize  = {theme.typography.size.h4}
					textAlign = "middle-right"
					textWrap  = "nowrap"
					width     = "auto"
					alignSelf = "center"
				/>
			</Row>
		)
	}


	// MARK: closeButton
	/** Closes the locker. */
	private closeButton() {
		const theme = getTheme()

		return (
			<ButtonText
				id              = "btn_customization_close"
				width           = {CLOSE_SIZE}
				height          = {CLOSE_SIZE}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {getFrameOutline()}
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


	// MARK: categoryButton
	/**
	 * Selected tab is orange. Idle tabs are purple with a light-purple outline.
	 */
	private categoryButton(
		kind : CatalogCategory,
		label: string,
	) {
		const theme      = getTheme()
		const isSelected = kind === this.customizationProps.get('selectedKind')
		const isHovered  = !!categoryHover[kind]
		const fillBase   = isSelected ? theme.colors.primary : getIdleCategoryFill()
		const fill       = isHovered ? lighten(fillBase, 0.1) : fillBase
		const icon       = categoryIcon(kind)

		return (
			<UiBox
				key             = {`customization-category-${kind}`}
				width           = "100%"
				height          = {CATEGORY_BUTTON_HEIGHT}
				padding         = {{ left: 12, right: 10 }}
				backgroundColor = {fill}
				borderColor     = {isSelected ? theme.colors.primary : getFrameOutline()}
				borderWidth     = {2}
				borderRadius    = {theme.border.radiusSmall}
				alignItems      = "center"
				onMouseEnter    = {() => { categoryHover[kind] = true }}
				onMouseLeave    = {() => { categoryHover[kind] = false }}
				onMouseDown     = {() => { this.selectCategory(kind) }}
			>
				<Row height="100%">
					<Icon
						src       = {icon.src}
						uvs       = {icon.uvs}
						width     = {CATEGORY_ICON_SIZE}
						height    = {CATEGORY_ICON_SIZE}
						iconColor = {icon.src ? undefined : theme.colors.light}
					/>
					<Text
						value     = {label}
						fontSize  = {theme.typography.size.h5}
						textWrap  = "nowrap"
						height    = "100%"
					/>
				</Row>
			</UiBox>
		)
	}


	// MARK: itemActionButton
	/**
	 * Purchase or Equip control at the bottom of the preview frame.
	 */
	private itemActionButton(entry: CatalogEntryRow) {
		const theme    = getTheme()
		const owned    = isLocalItemOwned(entry.id)
		const equipped = isLocalItemEquipped(entry)
		const fill     = equipped ? theme.colors.primary : owned ? theme.colors.secondary : theme.colors.primary
		const outline  = equipped ? theme.colors.primary : owned ? getFrameOutline() : theme.colors.primary
		const bg       = actionButtonHover ? lighten(fill, 0.1) : fill

		return (
			<Pulse
				id           = {PURCHASE_PULSE_ID}
				playing      = {false}
				looping      = {false}
				burstCount   = {1}
				scaleMin     = {1}
				scaleMax     = {PURCHASE_PULSE_SCALE}
				easingGrow   = {easingFunctions.easeOutBack}
				easingShrink = {easingFunctions.easeOutBounce}
			>
				<Shake
					id      = {PURCHASE_SHAKE_ID}
					playing = {false}
					looping = {false}
					width   = "100%"
					height  = {ACTION_BUTTON_HEIGHT}
				>
					<UiBox
						key             = {`customization-action-${entry.id}`}
						width           = "100%"
						height          = {ACTION_BUTTON_HEIGHT}
						backgroundColor = {bg}
						borderColor     = {outline}
						borderWidth     = {2}
						borderRadius    = {theme.border.radiusSmall}
						alignItems      = "center"
						justifyContent  = "center"
						onMouseEnter    = {() => { actionButtonHover = true }}
						onMouseLeave    = {() => { actionButtonHover = false }}
						onMouseDown     = {() => { this.requestItemAction(entry) }}
					>
						{owned ? (
							<Text
								value     = {equipped ? 'Equipped' : 'Equip'}
								fontSize  = {theme.typography.size.h5}
								textAlign = "middle-center"
								textWrap  = "nowrap"
								height    = {ACTION_BUTTON_HEIGHT}
							/>
						) : (
							<Row height="100%" justifyContent="center">
								<Text
									value     = "Purchase"
									fontSize  = {theme.typography.size.h5}
									textAlign = "middle-center"
									textWrap  = "nowrap"
									width     = "auto"
									height    = {ACTION_BUTTON_HEIGHT}
								/>
								{ticketCostLabel(entry.item.ticketCost, theme.typography.size.h5, ACTION_BUTTON_HEIGHT, theme.colors.light)}
							</Row>
						)}
					</UiBox>
				</Shake>
			</Pulse>
		)
	}


	// MARK: catalogStatusRow
	/**
	 * Ticket cost, or teal Owned, under a catalog thumb.
	 */
	private catalogStatusRow(entry: CatalogEntryRow) {
		const theme = getTheme()

		if (isLocalItemOwned(entry.id)) {
			return (
				<Text
					value     = "Owned"
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.info}
					textAlign = "middle-center"
					height    = {TICKET_ICON_SIZE}
				/>
			)
		}

		return (
			<Row height={TICKET_ICON_SIZE} spacing={4} justifyContent="center">
				{ticketCostLabel(entry.item.ticketCost, theme.typography.size.small, TICKET_ICON_SIZE)}
			</Row>
		)
	}


	// MARK: squareThumb
	/**
	 * Square item image. Width and height are the same pixel size so Yoga cannot
	 * stretch the texture to the parent cell. Equipped items get an orange
	 * circle-check overlay. Catalog cells pass `wiggle` to rotate the image
	 * while the cell is hovered.
	 */
	private squareThumb(
		src          : string | undefined,
		size         : number,
		showEquipped : boolean,
		swatch?      : { r: number, g: number, b: number },
		wiggle?      : { id: string, playing: boolean, looping?: boolean },
	) {
		const theme = getTheme()

		const image = swatch ? (
			<UiBox
				width           = {size}
				height          = {size}
				backgroundColor = {Color4.create(swatch.r, swatch.g, swatch.b, 1)}
				borderColor     = {theme.colors.light}
				borderWidth     = {2}
				borderRadius    = {theme.border.radiusSmall}
				pointerFilter   = "none"
			/>
		) : src ? (
			<Icon
				src           = {src}
				width         = {size}
				height        = {size}
				pointerFilter = "none"
			/>
		) : null

		const thumb = wiggle && image ? (
			<Wiggle
				id            = {wiggle.id}
				playing       = {wiggle.playing}
				looping       = {wiggle.looping}
				burstInterval = {THUMB_HOVER_WIGGLE_INTERVAL}
			>
				{image}
			</Wiggle>
		) : image

		return (
			<UiBox
				width          = {size}
				height         = {size}
				alignItems     = "center"
				justifyContent = "center"
				alignSelf      = "center"
			>
				{thumb}
				{showEquipped ? (
					<Icon
						uvs           = {atlasIconsFontAwesome.uv.circleCheck}
						width         = {EQUIPPED_BADGE_SIZE}
						height        = {EQUIPPED_BADGE_SIZE}
						iconColor     = {theme.colors.primary}
						pointerFilter = "none"
						positionType  = "absolute"
						position      = {{
							top  : EQUIPPED_BADGE_INSET,
							right: EQUIPPED_BADGE_INSET,
						}}
					/>
				) : null}
			</UiBox>
		)
	}


	// MARK: catalogCell
	private catalogCell(entry: CatalogEntryRow) {
		const theme      = getTheme()
		const thumbSize  = getCatalogThumbSize()
		const isSelected = entry.id === this.customizationProps.get('selectedId')
		const isHovered  = !!catalogHover[entry.id]
		const outline    = isSelected ? theme.colors.primary : getFrameOutline()
		const border     = isHovered ? lighten(outline, HOVER_BORDER_LIGHTEN) : outline

		return (
			<Column
				key             = {`customization-cell-${entry.id}`}
				width           = "100%"
				padding         = {CATALOG_CELL_PADDING}
				spacing         = {0}
				flexShrink      = {0}
				backgroundColor = {theme.colors.dark}
				borderColor     = {border}
				borderWidth     = {CATALOG_CELL_BORDER}
				borderRadius    = {theme.border.radiusSmall}
				alignItems      = "stretch"
				onMouseEnter    = {() => { catalogHover[entry.id] = true }}
				onMouseLeave    = {() => { catalogHover[entry.id] = false }}
				onMouseDown     = {() => { this.selectItem(entry.id) }}
			>
				{this.squareThumb(
					entry.item.thumbSrc,
					thumbSize,
					isLocalItemEquipped(entry),
					getEntrySwatch(entry),
					{
						id     : `customization-cell-wiggle-${entry.id}`,
						playing: isHovered,
					},
				)}
				<Divider
					thickness = {1}
					margin    = {{ top: 6, bottom: 6 }}
					backgroundColor = {getFrameOutline()}
				/>
				<Text
					value     = {entry.item.name}
					fontSize  = {theme.typography.size.small}
					textAlign = "middle-center"
					textWrap  = "nowrap"
					height    = {18}
				/>
				{this.catalogStatusRow(entry)}
			</Column>
		)
	}


	// MARK: previewPane
	/**
	 * Selected item: title, description, image, and action, all inside one frame.
	 */
	private previewPane() {
		const theme     = getTheme()
		const selected  = this.getSelectedEntry()
		const owned     = selected ? isLocalItemOwned(selected.id) : false
		const imageSize = getPreviewImageSize()

		return (
			<Column
				key             = "customization-preview"
				width           = "100%"
				height          = "100%"
				minHeight       = {0}
				padding         = {PREVIEW_PADDING}
				spacing         = {0}
				overflow        = "hidden"
				backgroundColor = {theme.colors.dark}
				borderColor     = {getFrameOutline()}
				borderWidth     = {PREVIEW_BORDER}
				borderRadius    = {theme.border.radiusSmall}
				alignItems      = "stretch"
			>
				<Row height={PREVIEW_TITLE_HEIGHT} justifyContent="space-between" flexShrink={0}>
					<Text
						value     = {selected?.item.name ?? ''}
						fontSize  = {theme.typography.size.h4}
						textWrap  = "nowrap"
						width     = "auto"
						height    = {PREVIEW_TITLE_HEIGHT}
						flexGrow  = {1}
					/>
					{owned ? (
						<Text
							value     = "Owned"
							fontSize  = {theme.typography.size.small}
							fontColor = {theme.colors.info}
							textAlign = "middle-right"
							width     = "auto"
							height    = {PREVIEW_TITLE_HEIGHT}
						/>
					) : null}
				</Row>
				<Text
					value     = {selected?.item.description ?? ''}
					fontSize  = {theme.typography.size.small}
					fontColor = {theme.colors.tertiary}
					textWrap  = "wrap"
					width     = "100%"
					height    = {PREVIEW_DESC_HEIGHT}
					margin    = {{ bottom: 12 }}
				/>
				<UiBox
					width          = "100%"
					flexGrow       = {1}
					flexShrink     = {1}
					minHeight      = {0}
					overflow       = "hidden"
					alignItems     = "center"
					justifyContent = "center"
				>
					{this.squareThumb(
						selected?.item.thumbSrc,
						imageSize,
						selected ? isLocalItemEquipped(selected) : false,
						getEntrySwatch(selected),
					)}
				</UiBox>
				{selected ? this.itemActionButton(selected) : null}
			</Column>
		)
	}


	// MARK: body
	protected body() {
		this.ensureProfileWatch()
		const theme = getTheme()

		return [
			<Column
				key             = "customization-content"
				width           = {PANEL_WIDTH}
				height          = "100%"
				maxHeight       = {getPanelMaxHeight()}
				padding         = {PANEL_PADDING}
				spacing         = {0}
				borderWidth     = {PANEL_BORDER}
				overflow        = "hidden"
				alignItems      = "stretch"
				backgroundColor = {theme.colors.secondary}
				borderColor     = {getFrameOutline()}
				borderRadius    = {16}
			>
				{this.header()}
				<Grid
					key        = "customization-categories"
					limit      = {CATEGORIES.length}
					margin     = {{ top: 16, bottom: 16 }}
					flexShrink = {0}
				>
					{CATEGORIES.map((category) => this.categoryButton(category.kind, category.label))}
				</Grid>
				<Row
					height     = {getCatalogRowHeight()}
					alignItems = "stretch"
					minHeight  = {0}
					overflow   = "hidden"
					flexShrink = {0}
				>
					<Column
						height        = "100%"
						width         = {0}
						flexGrow      = {CATALOG_GROW}
						flexShrink    = {1}
						flexBasis     = {0}
						minHeight     = {0}
						spacing       = {0}
						padding       = {{ right: CATALOG_SCROLL_PAD_RIGHT }}
						overflow      = "scroll"
						alignItems    = "stretch"
						pointerFilter = "block"
					>
						<Grid limit={GRID_COLUMNS} flexShrink={0}>
							{this.getVisibleEntries().map((entry) => this.catalogCell(entry))}
						</Grid>
					</Column>
					<UiBox
						height     = "100%"
						width      = {0}
						flexGrow   = {PREVIEW_GROW}
						flexShrink = {1}
						flexBasis  = {0}
						minHeight  = {0}
						overflow   = "hidden"
					>
						{this.previewPane()}
					</UiBox>
				</Row>
			</Column>,
		]
	}
}

export const customizationLayer = new CustomizationLayer()
