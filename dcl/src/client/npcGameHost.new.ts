import { AvatarShape, ColliderLayer, ColorRange, engine, Entity, Material, MeshRenderer, Transform, TriggerArea, triggerAreaEventsSystem, TriggerAreaEventType } from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import type { Dialog } from 'dcl-npc-toolkit'
import * as npc from 'dcl-npc-toolkit'

import { ClientMessaging } from 'src/client/clientMessaging'
import { HideJoinGameUI, ShowJoinGameUI } from './ui-screen/layers/lobby.joinGame'

let bowlingHostNpc: Entity
let triggerZone: Entity

const TRIGGER_SCALE = 8

export function setupBowlingHostNpc(): void {

	bowlingHostNpc = engine.addEntity()
	Transform.create(bowlingHostNpc, {
		position: Vector3.create(16, 0.3, 14.5),
		rotation: Quaternion.fromEulerDegrees(0, 180, 0),
		scale   : Vector3.create(1, 1, 1)
	})

	AvatarShape.create(bowlingHostNpc, {
		id       : 'bowling-host    ',
		name     : 'Bowling Host',
		bodyShape: 'urn: decentraland: off-chain: base-avatars: BaseMale',
		eyeColor : Color3.create(0.22, 0.49, 0.69),
		skinColor: Color3.create(0.98, 0.82, 0.51),
		hairColor: Color3.create(0.15, 0.12, 0.1),
		wearables: [
			'urn:decentraland:off-chain:base-avatars:eyes_00',
			'urn:decentraland:off-chain:base-avatars:eyebrows_00',
			'urn:decentraland:off-chain:base-avatars:mouth_00',
			'urn:decentraland:off-chain:base-avatars:casual_shoes',
			'urn:decentraland:off-chain:base-avatars:concrete_pants',
			'urn:decentraland:off-chain:base-avatars:yellow_tshirt'
		],
		emotes: [],
	})
	
	triggerZone = engine.addEntity()
	Transform.create(triggerZone, {
		position: Vector3.create(16, 0.5, 14.5),
		scale   : Vector3.create(TRIGGER_SCALE, TRIGGER_SCALE, TRIGGER_SCALE)
	})
	
/* 	MeshRenderer.setSphere(triggerZone)
	Material.create(triggerZone, {
		material: {
			$case: 'pbr',
			pbr: {
				albedoColor: Color4.create(1, 0, 0, 0.5)
			}
		} 
	}) */

	TriggerArea.setSphere(triggerZone, ColliderLayer.CL_PLAYER)
	triggerAreaEventsSystem.onTriggerEnter(triggerZone, (event) => {
		if (event.trigger && event.trigger.entity !== engine.PlayerEntity) return
		console.log('Player entered trigger zone')
		ShowJoinGameUI()
	})
	triggerAreaEventsSystem.onTriggerExit(triggerZone, (event) => {
		if (event.trigger && event.trigger.entity !== engine.PlayerEntity) return
		console.log('Player exited trigger zone')
		HideJoinGameUI()
	})
}
