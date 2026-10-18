import { engine } from '@dcl/sdk/ecs'
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
	Text,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerRewards } from 'src/shared/components/definitions/shared.playerRewards'
import { PendingRewardOffer } from 'src/shared/data/rewards'
import { getCatalogEntry } from 'src/shared/data/unlocks'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { sfx, SoundManager } from 'src/client/soundManager'
import {
	bowlingRussoOneAlphaNumericAtlas,
	bowlingRussoOneSymbolsAtlas,
	gameIconsAtlas,
	primaryButtonAtlas,
} from 'src/client/ui/themes/bowling/atlases'


const ACTION_BTN_W     = 240
const ACTION_BTN_H     = 92
const TICKET_ICON_SIZE = 72
const PANEL_WIDTH      = 640
const SLIDE_DURATION   = 0.2
/** Extra wait after loading finishes before the first reward slides on. */
const OPEN_DELAY_MS    = 3000
/** Extra wait after a reward slides off before the next one slides on. */
const BETWEEN_DELAY_MS = 500
const COLOR_PANEL_FILL = Color4.fromHexString('#1d0231ff')

const stringAtlases = {
	characters: bowlingRussoOneAlphaNumericAtlas,
	symbols   : bowlingRussoOneSymbolsAtlas,
}

const clientStore = ClientStore.getInstance()


// MARK: RewardLayer
/**
 * One pending login reward at a time. The grant happens when the button is pressed.
 */
export class RewardLayer extends Layer {
	private loadFinished = false
	private showAfterMs  = 0
	private displayed    : PendingRewardOffer | undefined
	private dismissingId : string | undefined
	private replacing    = false

	constructor() {
		super({
			id         : 'bowling-reward',
			zone       : ZoneType.FullScreen,
			canBeHidden: true,
			startHidden: true,
			zIndex     : 1700,
			uiTransform: {
				flexDirection : 'column',
				justifyContent: 'center',
				alignItems    : 'center',
				borderWidth   : 0,
			},
		})

		eventBus.on(ClientEvents.LOAD_COMPLETE, () => {
			this.loadFinished = true
			this.showAfterMs  = Date.now() + OPEN_DELAY_MS
		})
		engine.addSystem(() => { this.syncOffer() })
	}


	// MARK: getOffer
	/** The pending offer at the head of the local player's queue. */
	private getOffer(): PendingRewardOffer | undefined {
		const userId  = clientStore.getUserId()
		const rewards = userId ? ComponentStore.getOrNull(PlayerRewards, { key: userId }) : null
		const raw = rewards?.pending[0]
		if (!raw) return undefined

		return {
			id          : raw.id,
			title       : raw.title,
			message     : raw.message,
			buttonLabel : raw.buttonLabel,
			kind        : raw.kind === 'unlock' ? 'unlock' : 'tickets',
			tickets     : raw.tickets,
			itemId      : raw.itemId,
		}
	}


	// MARK: syncOffer
	/**
	 * Shows one offer after loading finishes, with a short pause before the
	 * first window and between consecutive windows.
	 */
	private syncOffer() {
		if (!this.loadFinished) return

		const offer = this.getOffer()
		if (this.dismissingId) {
			if (!this.visibility.isFullyHidden) return
			if (offer?.id === this.dismissingId) return
			this.dismissingId = undefined
			this.displayed    = undefined
			this.showAfterMs  = Date.now() + BETWEEN_DELAY_MS
		}

		if (this.replacing) {
			if (!this.visibility.isFullyHidden) return
			this.replacing   = false
			this.displayed   = undefined
			this.showAfterMs = Date.now() + BETWEEN_DELAY_MS
		}

		if (!offer) {
			this.displayed = undefined
			if (!this.visibility.isHidden) this.hide(SLIDE_DURATION)
			return
		}

		if (
			this.displayed
			&& !this.visibility.isHidden
			&& !this.sameOffer(this.displayed, offer)
		) {
			this.replacing = true
			this.hide(SLIDE_DURATION)
			return
		}

		if (this.visibility.isHidden) {
			if (Date.now() < this.showAfterMs) return
			this.displayed = offer
			SoundManager.playSound(sfx.ui_reward_popup)
			this.show(SLIDE_DURATION)
		}
	}


	// MARK: sameOffer
	/** True when the stored offer and the one on screen are the same text and grant. */
	private sameOffer(
		shown  : PendingRewardOffer,
		latest : PendingRewardOffer,
	): boolean {
		return shown.id === latest.id
			&& shown.title === latest.title
			&& shown.message === latest.message
			&& shown.buttonLabel === latest.buttonLabel
			&& shown.kind === latest.kind
			&& shown.tickets === latest.tickets
			&& shown.itemId === latest.itemId
	}


	// MARK: claim
	/** Asks the server to grant the offer on screen, then slides the window off. */
	private claim(offer: PendingRewardOffer) {
		if (this.dismissingId || this.replacing) return
		console.log('RewardLayer: claim: rewardId', offer.id)
		SoundManager.playSound(sfx.claim_reward)
		ClientMessaging.requestClaimReward(offer.id)
		this.dismissingId = offer.id
		this.hide(SLIDE_DURATION)
	}


	// MARK: body
	protected body() {
		const offer = this.displayed
		if (!offer) return []

		const theme = getTheme()
		const grant = offer.kind === 'unlock'
			? (getCatalogEntry(offer.itemId)?.item.name ?? offer.itemId)
			: `+${offer.tickets}`

		return [
			<UiBox
				key            = {`reward-panel-${offer.id}`}
				width          = {PANEL_WIDTH}
				height         = "auto"
				alignItems     = "center"
				justifyContent = "center"
				padding        = {{ top: 28, bottom: 24, left: 28, right: 28 }}
				borderWidth    = {0}
				uiTransform    = {{ flexDirection: 'column' }}
			>
				<Background
					key             = "reward-chrome"
					backgroundColor = {alpha(COLOR_PANEL_FILL, 0.92)}
					borderColor     = {theme.colors.primary}
					borderWidth     = {3}
					borderRadius    = {24}
				/>
				<Text
					key       = "reward-title"
					value     = {offer.title}
					fontSize  = {32}
					fontColor = {theme.colors.light}
					textAlign = "middle-center"
					width     = "100%"
					height    = {44}
				/>
				<Text
					key       = "reward-message"
					value     = {offer.message}
					fontSize  = {22}
					fontColor = {theme.colors.light}
					textAlign = "middle-center"
					width     = "100%"
					height    = {150}
					margin    = {{ top: 4, bottom: 0 }}
				/>
				<UiBox
					key            = "reward-grant"
					width          = "auto"
					height         = {TICKET_ICON_SIZE}
					alignItems     = "center"
					justifyContent = "center"
					margin         = {{ bottom: 8, top: 0 }}
					borderWidth    = {0}
					uiTransform    = {{ flexDirection: 'row' }}
				>
					<Icon
						src         = {gameIconsAtlas.source}
						uvs         = {gameIconsAtlas.uv.ticket}
						width       = {TICKET_ICON_SIZE}
						height      = {TICKET_ICON_SIZE}
						iconColor   = {theme.colors.primary}
						uiTransform = {{
							display : offer.kind === 'tickets' ? 'flex' : 'none',
							margin  : { right: 8 },
						}}
					/>
					<IconString
						value     = {grant}
						width     = {offer.kind === 'tickets' ? 80 : 480}
						height    = {TICKET_ICON_SIZE}
					/>
				</UiBox>
				<ButtonImage
					id             = "btn_reward_claim"
					atlas          = {primaryButtonAtlas}
					uvColumn       = {1}
					width          = {ACTION_BTN_W}
					height         = {ACTION_BTN_H}
					alignItems     = "center"
					justifyContent = "center"
					callback       = {() => { this.claim(offer) }}
					uiTransform    = {{
						positionType: 'relative',
						position    : { top: 0, left: 0 },
					}}
				>
					<IconString
						value     = {offer.buttonLabel.toUpperCase()}
						height    = {18}
						iconColor = {Color4.White()}
						atlases   = {stringAtlases}
					/>
				</ButtonImage>
			</UiBox>,
		]
	}
}

export const rewardLayer = new RewardLayer()
