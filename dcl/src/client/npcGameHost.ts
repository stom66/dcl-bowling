import { Entity } from '@dcl/sdk/ecs'
import { Color3, Quaternion, Vector3 } from '@dcl/sdk/math'
import type { Dialog } from 'dcl-npc-toolkit'
import * as npc from 'dcl-npc-toolkit'

import { ClientMessaging } from 'src/client/clientMessaging'

let bowlingHostNpc: Entity

/**
 * Dialog indices — `dcl-npc-toolkit` only honors numeric `goToDialog`.
 *
 * Keyboard (in-world): Secondary action → button 0 (left/top pair). Primary → button 1.
 * We order buttons so: [0] = Next / Forward (F), [1] = Cancel / Back (E). Lanes [2],[3].
 *
 * Line breaks: the toolkit re-wraps at ~45 chars and splits only on spaces. Literal `\\n`
 * glues to the next word and causes ugly wraps. Use short sentences separated by spaces, or
 * separate short clauses (each under ~40 chars) so automatic wrapping lands cleanly.
 */
const D = {
	firstPage: 0,
	lanes12  : 1,
	lanes34  : 2,
	lanes56  : 3,
	joined   : 4,
	bye      : 5
} as const

let dialogue: Dialog[]

function mkJoinLane(laneIndex: number): () => void {
	return () => {
		console.log('mkJoinLane: joining lane', laneIndex)
		dialogue[D.joined].text = `You are signed up for lane ${laneIndex}. Good luck!`
		ClientMessaging.requestJoinLane(laneIndex)
	}
}

dialogue = [
	{
		name: 'firstPage',
		text: dialogLines(
			'Want to join a game of bowling?        \n\n\nChoose a lane'
		),
		isQuestion: true,
		typeSpeed: -10,
		windowHeight: 'auto',
		buttons: [
			{ label: 'Next page', goToDialog: D.lanes12, size: 'auto' },
			{ label: 'Cancel', goToDialog: D.bye, size: 'auto' },
			{ label: 'Lane 1', goToDialog: D.joined, size: 'auto', triggeredActions: mkJoinLane(1) },
			{ label: 'Lane 2', goToDialog: D.joined, size: 'auto', triggeredActions: mkJoinLane(2) }
		]
	},
	{
		name: 'lanes12',
		text: dialogLines(
			'Want to join a game of bowling?        \n\n\nChoose a lane'
		),
		isQuestion: true,
		typeSpeed: -1,
		windowHeight: 'auto',
		buttons: [
			{ label: 'Forward', goToDialog: D.lanes56, size: 'auto' },
			{ label: 'Back', goToDialog: D.lanes12, size: 'auto' },
			{ label: 'Lane 1', goToDialog: D.joined, size: 'auto', triggeredActions: mkJoinLane(1) },
			{ label: 'Lane 2', goToDialog: D.joined, size: 'auto', triggeredActions: mkJoinLane(2) }
		]
	},
	{
		name: 'lanes34',
		text: dialogLines(
			'Want to join a game of bowling?        \n\n\nChoose a lane'
		),
		isQuestion: true,
		typeSpeed: -1,
		windowHeight: 'auto',
		buttons: [
			{ label: 'Forward', goToDialog: D.lanes56, size: 'auto' },
			{ label: 'Back', goToDialog: D.lanes12, size: 'auto' },
			{ label: 'Lane 3', goToDialog: D.joined, size: 'auto', triggeredActions: mkJoinLane(3) },
			{ label: 'Lane 4', goToDialog: D.joined, size: 'auto', triggeredActions: mkJoinLane(4) }
		]
	},
	{
		name: 'lanes56',
		text: dialogLines(
			'Want to join a game of bowling?        \n\n\nChoose a lane'
		),
		isQuestion: true,
		typeSpeed: -1,
		windowHeight: 'auto',
		buttons: [
			{ label: 'Forward', goToDialog: D.lanes12, size: 'auto' },
			{ label: 'Back', goToDialog: D.lanes34, size: 'auto' },
			{ label: 'Lane 5', goToDialog: D.joined, size: 'auto', triggeredActions: mkJoinLane(5) },
			{ label: 'Lane 6', goToDialog: D.joined, size: 'auto', triggeredActions: mkJoinLane(6) }
		]
	},
	{
		name: 'joined',
		typeSpeed: -1,
		text: `You are signed up for lane {laneIndex}. Good luck!`,
		isEndOfDialog: true
	},
	{
		name: 'bye',
		typeSpeed: -1,
		text: 'No problem. Come back anytime.',
		isEndOfDialog: true
	}
]

/** Join intended “lines” with spaces; each chunk is short so auto-wrap stays sane. */
function dialogLines(...chunks: string[]): string {
	return chunks.join(' ')
}

export function setupBowlingHostNpc(): void {
	const script = dialogue

	bowlingHostNpc = npc.create(
		{
			position: Vector3.create(16, 0.3, 14.5),
			rotation: Quaternion.fromEulerDegrees(0, 180, 0),
			scale   : Vector3.create(1, 1, 1)
		},
		{
			type     : npc.NPCType.AVATAR,
			name     : 'Bowling Host',
			bodyShape: 'urn:decentraland:off-chain:base-avatars:BaseMale',
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
			faceUser     : true,
			reactDistance: 6,
			hoverText    : 'Join bowling',
			onActivate   : (_other: Entity) => {
				npc.talk(bowlingHostNpc, script, D.lanes12)
			},
			
		}
	)
}
