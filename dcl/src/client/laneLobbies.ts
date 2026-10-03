import {
	ColliderLayer,
	engine,
	Entity,
	Material,
	MeshRenderer,
	Transform,
	TriggerArea,
	triggerAreaEventsSystem,
} from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'

import { LanePhase } from 'src/shared/enums'
import { LaneStore } from 'src/shared/laneStore'
import { GameSettings } from 'src/shared/settings'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { getLaneLobbyPosition } from 'src/client/data/lanePositions'
import { HideLaneLobbyUI, ShowLaneLobbyUI } from 'src/client/ui/themes/bowling/layers/laneLobby.layer'


const TRIGGER_SCALE = 4
const STUB_HEIGHT   = 2.5
const SHOW_TRIGGER  = false

const STATUS_COLOR_FREE     = Color4.create(0.2, 0.85, 0.45, 0.45)
const STATUS_COLOR_STARTING = Color4.create(0.95, 0.7, 0.15, 0.45)
const STATUS_COLOR_OCCUPIED = Color4.create(0.9, 0.2, 0.25, 0.45)

type LobbyEntities = {
	trigger: Entity
	stub   : Entity
}

const lobbies: LobbyEntities[] = []
const lastStubPhase: (LanePhase | undefined)[] = []
const clientStore = ClientStore.getInstance()


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


// MARK: statusColorForPhase
/** Placeholder hologram tint for free / starting / occupied. */
function statusColorForPhase(phase: LanePhase): Color4 {
	if (phase === LanePhase.GAME_STARTING) return STATUS_COLOR_STARTING
	if (isLaneOccupied(phase)) return STATUS_COLOR_OCCUPIED
	return STATUS_COLOR_FREE
}


// MARK: applyStubStatus
/** Updates the stub marker material for a lane's current phase. */
function applyStubStatus(
	laneIndex: number,
	phase    : LanePhase,
): void {
	if (lastStubPhase[laneIndex] === phase) return
	lastStubPhase[laneIndex] = phase

	const lobby = lobbies[laneIndex]
	if (!lobby) return

	const color = statusColorForPhase(phase)
	Material.setPbrMaterial(lobby.stub, {
		albedoColor      : color,
		emissiveColor    : color,
		emissiveIntensity: 1.2,
		transparencyMode : 1,
	})
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
	if (clientStore.getLaneIndex() === laneIndex) return

	ClientMessaging.requestJoinLobby(laneIndex + 1)
}


// MARK: onLobbyExit
/**
 * Hides lobby UI. Leaves the server lobby only while still waiting
 * (not after the game has started and the player was moved to the lane).
 */
function onLobbyExit(laneIndex: number): void {
	console.log('LaneLobbies: onLobbyExit: laneIndex', laneIndex)

	HideLaneLobbyUI()

	if (clientStore.getLaneIndex() !== laneIndex) return

	const phase = LaneStore.getPhase(laneIndex)
	if (phase !== LanePhase.LOBBY && phase !== LanePhase.GAME_STARTING) return

	ClientMessaging.requestLeaveLobby()
}


// MARK: setupLaneLobbies
/**
 * Spawns a trigger zone and status stub at each lane lobby position.
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

		if (SHOW_TRIGGER) {
			MeshRenderer.setSphere(trigger)
			Material.setBasicMaterial(trigger, {
				diffuseColor: Color4.create(0.2, 0.6, 1, 0.25),
			})
		}

		const stub = engine.addEntity()
		Transform.create(stub, {
			position: Vector3.create(position.x, position.y + STUB_HEIGHT / 2, position.z),
			scale   : Vector3.create(1.4, STUB_HEIGHT, 1.4),
		})
		MeshRenderer.setSphere(stub)
		Material.setPbrMaterial(stub, {
			albedoColor      : STATUS_COLOR_FREE,
			emissiveColor    : STATUS_COLOR_FREE,
			emissiveIntensity: 1.2,
			transparencyMode : 1,
		})

		lobbies[laneIndex] = { trigger, stub }

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
			applyStubStatus(i, LaneStore.getPhase(i))
		}
	})
}
