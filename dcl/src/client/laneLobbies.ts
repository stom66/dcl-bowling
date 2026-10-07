import {
	ColliderLayer,
	engine,
	Entity,
	GltfContainer,
	GltfNodeModifiers,
	Material,
	MaterialTransparencyMode,
	MeshRenderer,
	TextureWrapMode,
	Transform,
	TriggerArea,
	triggerAreaEventsSystem,
	VisibilityComponent,
} from '@dcl/sdk/ecs'
import { Color3, Color4, Vector2, Vector3 } from '@dcl/sdk/math'

import { LanePhase } from 'src/shared/enums'
import { LaneStore } from 'src/shared/laneStore'
import { GameSettings } from 'src/shared/settings'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { getLaneLobbyPosition } from 'src/client/data/lanePositions'
import { HideLaneLobbyUI, ShowLaneLobbyUI } from 'src/client/ui/themes/bowling/layers/laneLobbyUi'


/** Draw each lobby trigger volume as a translucent sphere. */
const SHOW_LOBBY_TRIGGER_DEBUG = false

const LOBBY_ZONE_MODEL_SRC      = 'assets/models/lobby-zone.gltf'
const HOLOGRAM_NODE_PATH        = 'lobby-zone.armature/root/spin/lobby-zone.hologram'
const HOLOGRAM_ALBEDO_TEXTURE   = 'assets/models/tex/texture-lobbyHologram-baseColor-texture-lobbyHologram-alpha.png'
const HOLOGRAM_EMISSIVE_TEXTURE = 'assets/models/tex/texture-lobbyHologram-baseColor.png'

const TRIGGER_SCALE = 4

/** Mesh UVs already cover the top third (open). Shift V down one row per state. */
const HOLOGRAM_OFFSET_OPEN     = 0
const HOLOGRAM_OFFSET_STARTING = -1 / 3
const HOLOGRAM_OFFSET_BUSY     = -2 / 3

const TRIGGER_DEBUG_COLOR = Color4.create(0.2, 0.6, 1, 0.3)

type LobbyEntities = {
	trigger   : Entity
	model     : Entity
	debugMesh : Entity
}

const lobbies: LobbyEntities[] = []
const lastHologramPhase: (LanePhase | undefined)[] = []
const clientStore = ClientStore.getInstance()

/** Lane the local player means to be enrolled in. Cleared when they leave the lobby. */
let desiredLane: number | undefined = undefined


// MARK: isLaneJoinable
/** True when a player may enroll in this lane's lobby. */
function isLaneJoinable(phase: LanePhase): boolean {
	return (
		phase === LanePhase.NONE
		|| phase === LanePhase.LOBBY
		|| phase === LanePhase.GAME_STARTING
	)
}


// MARK: isLaneOccupied
/** True when the lane is mid-game and not accepting lobby joins. */
function isLaneOccupied(phase: LanePhase): boolean {
	return !isLaneJoinable(phase)
}


// MARK: hologramOffsetForPhase
/** UV V offset that shows the open / starting / busy row of the hologram atlas. */
function hologramOffsetForPhase(phase: LanePhase): number {
	if (phase === LanePhase.GAME_STARTING) return HOLOGRAM_OFFSET_STARTING
	if (isLaneOccupied(phase)) return HOLOGRAM_OFFSET_BUSY
	return HOLOGRAM_OFFSET_OPEN
}


// MARK: hologramMaterial
/** PBR override for `lobby-hologram`, shifted to the row for the current lobby state. */
function hologramMaterial(offsetY: number) {
	const texture = Material.Texture.Common({
		src     : HOLOGRAM_ALBEDO_TEXTURE,
		wrapMode: TextureWrapMode.TWM_CLAMP,
		offset  : Vector2.create(0, offsetY),
	})
	const emissive = Material.Texture.Common({
		src     : HOLOGRAM_EMISSIVE_TEXTURE,
		wrapMode: TextureWrapMode.TWM_CLAMP,
		offset  : Vector2.create(0, offsetY),
	})

	return {
		material: {
			$case: 'pbr' as const,
			pbr  : {
				texture,
				emissiveTexture  : emissive,
				emissiveColor    : Color3.create(0.25, 0.25, 0.25),
				emissiveIntensity: 1,
				metallic         : 0,
				roughness        : 0.845,
				transparencyMode : MaterialTransparencyMode.MTM_ALPHA_BLEND,
			},
		},
	}
}


// MARK: applyHologramStatus
/** Updates the hologram atlas row for a lane's current phase. */
function applyHologramStatus(
	laneIndex: number,
	phase    : LanePhase,
): void {
	if (lastHologramPhase[laneIndex] === phase) return
	lastHologramPhase[laneIndex] = phase

	const lobby = lobbies[laneIndex]
	if (!lobby) return

	GltfNodeModifiers.createOrReplace(lobby.model, {
		modifiers: [{
			path    : HOLOGRAM_NODE_PATH,
			material: hologramMaterial(hologramOffsetForPhase(phase)),
		}],
	})
}


// MARK: isLobbyJoinDesired
/**
 * True when a join confirm for this 0-based lane should enroll the local player.
 * Confirms for a lobby they already walked out of are ignored.
 */
export function isLobbyJoinDesired(laneIndex: number): boolean {
	return desiredLane === laneIndex
}


// MARK: onLobbyEnter
/** Shows lobby UI and joins the lane when it is free / starting. */
function onLobbyEnter(laneIndex: number): void {
	console.log('LaneLobbies: onLobbyEnter: laneIndex', laneIndex)

	const phase = LaneStore.areLanesReady()
		? LaneStore.getPhase(laneIndex)
		: LanePhase.NONE

	ShowLaneLobbyUI(laneIndex, isLaneOccupied(phase))

	if (!isLaneJoinable(phase)) return
	if (clientStore.getLaneIndex() === laneIndex) {
		desiredLane = laneIndex
		return
	}

	desiredLane = laneIndex
	ClientMessaging.requestJoinLobby(laneIndex + 1)
}


// MARK: onLobbyExit
/**
 * Hides lobby UI. Leaves the server lobby only while still waiting
 * (not after the game has started and the player was moved to the lane).
 * Also leaves when the join was sent but the confirm has not arrived yet.
 */
function onLobbyExit(laneIndex: number): void {
	console.log('LaneLobbies: onLobbyExit: laneIndex', laneIndex)

	HideLaneLobbyUI()

	const enrolledHere = clientStore.getLaneIndex() === laneIndex
	const joinPending  = desiredLane === laneIndex && !enrolledHere
	if (!enrolledHere && !joinPending) return

	const phase = LaneStore.areLanesReady()
		? LaneStore.getPhase(laneIndex)
		: LanePhase.NONE
	const matchStarted = (
		phase !== LanePhase.NONE
		&& phase !== LanePhase.LOBBY
		&& phase !== LanePhase.GAME_STARTING
	)
	if (matchStarted) return

	desiredLane = undefined
	ClientMessaging.requestLeaveLobby()
}


// MARK: setupLaneLobbies
/**
 * Spawns the lobby-zone model and a join trigger at each lane lobby position.
 */
export function setupLaneLobbies(): void {
	for (let laneIndex = 0; laneIndex < GameSettings.MAX_LANES; laneIndex++) {
		const position = getLaneLobbyPosition(laneIndex)

		const trigger = engine.addEntity()
		Transform.create(trigger, {
			position: Vector3.create(position.x, position.y + 0.5, position.z),
			scale   : Vector3.create(TRIGGER_SCALE, TRIGGER_SCALE, TRIGGER_SCALE),
		})
		TriggerArea.setSphere(trigger, ColliderLayer.CL_PLAYER)

		const debugMesh = engine.addEntity()
		Transform.create(debugMesh, {
			parent: trigger,
		})
		MeshRenderer.setSphere(debugMesh)
		Material.setPbrMaterial(debugMesh, {
			albedoColor      : TRIGGER_DEBUG_COLOR,
			transparencyMode : MaterialTransparencyMode.MTM_ALPHA_BLEND,
			metallic         : 0,
			roughness        : 1,
			castShadows      : false,
		})
		VisibilityComponent.create(debugMesh, { visible: SHOW_LOBBY_TRIGGER_DEBUG })

		const model = engine.addEntity()
		Transform.create(model, {
			position: Vector3.create(position.x, position.y, position.z),
		})
		GltfContainer.create(model, {
			src                         : LOBBY_ZONE_MODEL_SRC,
			visibleMeshesCollisionMask  : ColliderLayer.CL_NONE,
			invisibleMeshesCollisionMask: ColliderLayer.CL_NONE,
		})
		GltfNodeModifiers.create(model, {
			modifiers: [{
				path    : HOLOGRAM_NODE_PATH,
				material: hologramMaterial(HOLOGRAM_OFFSET_OPEN),
			}],
		})

		lobbies[laneIndex] = { trigger, model, debugMesh }

		const capturedIndex = laneIndex
		triggerAreaEventsSystem.onTriggerEnter(trigger, (event) => {
			if (event.trigger && event.trigger.entity !== engine.PlayerEntity) return
			onLobbyEnter(capturedIndex)
		})
		triggerAreaEventsSystem.onTriggerExit(trigger, (event) => {
			if (event.trigger && event.trigger.entity !== engine.PlayerEntity) return
			onLobbyExit(capturedIndex)
		})
	}

	engine.addSystem(() => {
		if (!LaneStore.areLanesReady()) return
		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			applyHologramStatus(i, LaneStore.getPhase(i))
		}
	})
}
