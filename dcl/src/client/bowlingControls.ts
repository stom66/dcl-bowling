import * as utils from "@dcl-sdk/utils"
import { ColliderLayer, EasingFunction, engine, Entity, GltfContainer, GltfContainerLoadingState, InputAction, LoadingState, Material, MeshCollider, MeshRenderer, pointerEventsSystem, Transform, Tween } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
//import { CannonSim } from "src/shared/utils/cannon-sim";
import { ComponentStore } from "src/shared/components/componentStore";
import { PlayerPreferences } from "src/shared/components/definitions/shared.playerPreferences";
import { LaneSnapshot } from "src/shared/types/shared-types";
import { ClientEvents, eventBus } from "src/shared/utils/eventBus";

import { ClientMessaging } from "src/client/clientMessaging";
import { ClientStore } from "src/client/clientStore";
import { lanePositions } from "src/client/data/lanePositions";
import { sfx, SoundManager } from "src/client/soundManager";
import { SetIndicator } from "src/client/ui/themes/bowling/layers/bowlingControls.layer";


enum CONTROL_TYPE {
	POSIITION = "position",
	DIRECTION = "direction",
	STRENGTH  = "strength",
	DISABLED  = "disabled",
}

const ARROW_SCALE = 1.25

/** Lateral swing ±this many meters around the lane X. */
const POSITION_SWING_AMPLITUDE = 0.6
const POSITION_OSCILLATION_SPEED = 1.7

const DIRECTION_YAW_HALF_RANGE_DEG = 15
const DIRECTION_OSCILLATION_SPEED = 0.9

const STRENGTH_OSCILLATION_SPEED = 2.2
const STRENGTH_MIN_SCALE = 0.2

/** Lane-local Y for the ball center (must clear the lane floor; see ballRadius property in server/physics/physics.settings.ts. */
const BALL_SPAWN_LANE_LOCAL_Y = 0.065
const BALL_SPAWN_SIM_Y = 0.32

/** `pin.gltf` root node translates the mesh up; entity pivot sits below the pin center. Match Cannon cylinder center. */
const PIN_GLTF_MESH_OFFSET_Y = 0.18949292600154877
const PIN_VISUAL_SCALE = 1.5

let bumpersEnabled         = false
let bumperPersistPending   = false
let bumperPreferencesBound = false


// MARK: bindBumperPreferences
/**
 * Keeps the local bumper preference in sync with the player's stored
 * {@link PlayerPreferences}. Ignores stale snapshots while a persist is in flight.
 */
function bindBumperPreferences(): void {
	if (bumperPreferencesBound) return

	const userId = ClientStore.getInstance().getUserId()
	if (!userId) {
		console.error('bowlingControls: bindBumperPreferences: no userId')
		return
	}

	bumperPreferencesBound = true
	ComponentStore.onChange(PlayerPreferences, (data) => {
		if (!data) return
		if (bumperPersistPending) {
			if (data.bumpersEnabled === bumpersEnabled) {
				bumperPersistPending = false
			}
			return
		}
		bumpersEnabled = data.bumpersEnabled
	}, { key: userId })
}


// MARK: areLaneBumpersEnabled
/**
 * Current bumper preference, including an optimistic local toggle.
 */
export function areLaneBumpersEnabled(): boolean {
	bindBumperPreferences()
	return bumpersEnabled
}


// MARK: toggleLaneBumpers
/**
 * Flips the bumper preference, persists it, and asks the server to match the
 * current lane. Returns the new enabled state.
 */
export function toggleLaneBumpers(): boolean {
	bindBumperPreferences()
	bumpersEnabled       = !bumpersEnabled
	bumperPersistPending = true
	console.log('bowlingControls: toggleLaneBumpers: enabled', bumpersEnabled)
	ClientMessaging.requestSetPreferences({ bumpersEnabled })
	ClientMessaging.requestSetLaneBumpers(bumpersEnabled)
	return bumpersEnabled
}


// MARK: applyPreferredLaneBumpers
/**
 * Raises bumpers on the current lane when the stored preference is on.
 */
function applyPreferredLaneBumpers(): void {
	bindBumperPreferences()

	const userId = ClientStore.getInstance().getUserId()
	if (userId) {
		const prefs = ComponentStore.getOrNull(PlayerPreferences, { key: userId })
		if (prefs && !bumperPersistPending) bumpersEnabled = prefs.bumpersEnabled
	}

	if (!bumpersEnabled) return
	console.log('bowlingControls: applyPreferredLaneBumpers: requesting bumpers on')
	ClientMessaging.requestSetLaneBumpers(true)
}


export class BowlingControls {

	// MARK: Properties

	private currentControlType: CONTROL_TYPE = CONTROL_TYPE.POSIITION

	private position : Vector3 = Vector3.create(0, 0, 0)
	private direction: Vector3 = Vector3.create(0, 0, 0)
	private strength : number  = 0
	private spin     : number  = 0

	private arrow: Entity

	private lanePosition: Vector3
	private laneIndex: number

	private accumulatedTime: number = 0

	private ball?: Entity

	// MARK: Constructor
	constructor(
		laneIndex: number,
		ball: Entity | undefined
	) {
		console.log("bowlingControls: BowlingControls: laneIndex", laneIndex)
		this.laneIndex    = laneIndex
		this.lanePosition = lanePositions[laneIndex]
		this.ball         = ball

		// Create the arrow entity
		this.arrow = engine.addEntity()
		Transform.create(this.arrow, { 
			position: this.lanePosition,
			scale: Vector3.create(ARROW_SCALE, ARROW_SCALE, ARROW_SCALE)
		})
		GltfContainer.create(this.arrow, {
			src: "assets/models/control.direction.gltf",
			visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
		})

		// Add the position animation system
		engine.addSystem(this.sys_PositionAnimation)

		
		eventBus.on(ClientEvents.ON_GROUP_GAME_END, (data: LaneSnapshot) => {
			if (this.laneIndex == data.laneIndex) {
				this.Destroy()
			}
		})

		eventBus.on(ClientEvents.ON_MY_ROLL_CLICK_TO_SET, () => {
			this.OnClickToSet()
		})

		applyPreferredLaneBumpers()

		//this.ball = this.CreateBall()
		//this.SpawnPins()
	}

	// MARK: On Button Interaction
	OnClickToSet() {
		SoundManager.playSound(sfx.click)

		switch (this.currentControlType) {

			case CONTROL_TYPE.DISABLED:
				return
				
			case CONTROL_TYPE.STRENGTH:
				console.log("bowlingControls: OnArrowInteraction: STRENGTH")
				this.currentControlType = CONTROL_TYPE.DISABLED

				engine.removeSystem(this.sys_StrengthAnimation)
				this.accumulatedTime = 0

				// Get the scale of the arrow
				const arrowScale = Transform.getOrNull(this.arrow)?.scale
				if (!arrowScale) return

				this.strength = arrowScale.x

				// AND NOW, WE BOWL!
				this.RequestBowl()
				return

			case CONTROL_TYPE.DIRECTION:
				console.log("bowlingControls: OnArrowInteraction: DIRECTION")
				// Get the current direction of the arrow
				const arrowDirection = Transform.getOrNull(this.arrow)?.rotation
				if (!arrowDirection) return
				
				this.direction = Vector3.rotate(Vector3.Forward(), arrowDirection)

				// Update the controls
				this.currentControlType = CONTROL_TYPE.STRENGTH

				// Change the animation
				engine.removeSystem(this.sys_DirectionAnimation)
				this.accumulatedTime = 0
				engine.addSystem(this.sys_StrengthAnimation)

				SetIndicator("STRENGTH")
				return

			case CONTROL_TYPE.POSIITION:
				console.log("bowlingControls: OnArrowInteraction: POSIITION")
				// Get the current position of the arrow
				const arrowPosition = Transform.getOrNull(this.arrow)?.position
				if (!arrowPosition) return
				
				const x = arrowPosition.x - this.lanePosition.x
				this.position = Vector3.create(x, BALL_SPAWN_SIM_Y, 0)

				// Update the controls
				this.currentControlType = CONTROL_TYPE.DIRECTION

				// Change the animation
				engine.removeSystem(this.sys_PositionAnimation)
				this.accumulatedTime = 0
				engine.addSystem(this.sys_DirectionAnimation)

				
				SetIndicator("DIRECTION")
				return
		}
	}


	// MARK: Request Bowl
	RequestBowl() {
		console.log("bowlingControls: RequestBowl", this.position, this.direction, this.strength)
		ClientMessaging.requestPlayRoll(this.position, this.direction, this.strength, this.spin)
		eventBus.emit(ClientEvents.ON_MY_ROLL_REQUEST, { position: this.position, direction: this.direction, strength: this.strength, spin: this.spin })
	}


	// MARK: Destroy
	Destroy() {
		engine.removeSystem(this.sys_PositionAnimation)
		engine.removeSystem(this.sys_DirectionAnimation)
		engine.removeSystem(this.sys_StrengthAnimation)

		engine.removeEntity(this.arrow)

		//this.cannonSim?.dispose()
		//this.cannonSim = undefined
		//if (this.ball) engine.removeEntity(this.ball)
		//this.RemovePins()
	}

	/** Sim uses cylinder center; glTF pivot is lower. Offset rotates with the pin. */
	private pinPivotWorldFromSimBody(laneLocal: Vector3, bodyRotation: Quaternion): Vector3 {
		const bodyWorld = Vector3.add(this.lanePosition, laneLocal)
		const offsetModelUp = Vector3.create(0, PIN_GLTF_MESH_OFFSET_Y * PIN_VISUAL_SCALE, 0)
		const offsetWorld = Vector3.rotate(offsetModelUp, bodyRotation)
		return Vector3.create(
			bodyWorld.x - offsetWorld.x,
			bodyWorld.y - offsetWorld.y,
			bodyWorld.z - offsetWorld.z
		)
	}

	// MARK: Create Ball
	CreateBall() {
		const ball = engine.addEntity()
		// `this.position` is lane-local (sim + colliders match that origin); world place = lane anchor + local.
		const worldPos = Vector3.add(this.lanePosition, this.position)
		Transform.create(ball, { position: worldPos, scale: Vector3.create(1, 1, 1) })
		GltfContainer.create(ball, {
			src: "assets/models/bowlingBall.gltf"
		})

		return ball
	}


	// MARK: Systems
	/** Arrow fn so `this` is bound when the engine invokes the system. */
	private sys_PositionAnimation = (dt: number) => {
		this.accumulatedTime += dt
		if (!this.arrow || !this.ball) return

		const lateral = Math.sin(this.accumulatedTime * POSITION_OSCILLATION_SPEED) * POSITION_SWING_AMPLITUDE
		const t = Transform.getMutableOrNull(this.arrow)
		if (!t) return
		t.position = Vector3.create(
			this.lanePosition.x + lateral,
			this.lanePosition.y,
			this.lanePosition.z,
		)

		const tBall = Transform.getMutableOrNull(this.ball)
		if (!tBall) return
		tBall.position = Vector3.create(
			this.lanePosition.x + lateral,
			this.lanePosition.y + BALL_SPAWN_LANE_LOCAL_Y,
			this.lanePosition.z,
		)
	}

	private sys_DirectionAnimation = (dt: number) => {
		this.accumulatedTime += dt
		if (!this.arrow || !this.ball) return

		const yawDegrees = Math.sin(this.accumulatedTime * DIRECTION_OSCILLATION_SPEED) * DIRECTION_YAW_HALF_RANGE_DEG
		const t = Transform.getMutableOrNull(this.arrow)
		if (!t) return
		t.rotation = Quaternion.fromEulerDegrees(0, yawDegrees, 0)
	}

	private sys_StrengthAnimation = (dt: number) => {
		this.accumulatedTime += dt
		if (!this.arrow || !this.ball) return

		var s = (Math.sin(this.accumulatedTime * STRENGTH_OSCILLATION_SPEED) + 1) * 0.5
		var s = s * (1-STRENGTH_MIN_SCALE) + STRENGTH_MIN_SCALE
		
		const t = Transform.getMutableOrNull(this.arrow)
		if (!t) return
		t.scale = Vector3.create(s, s, s)
	}
}
