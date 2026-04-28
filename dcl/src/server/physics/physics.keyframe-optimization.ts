import { DEFAULT_STORED_ROTATION, quaternionToStoredRotation, storedRotationToQuaternion } from './physics.utils'
import type { OptimizationSettings, QuaternionType, SimulationRunResult, SimObjectKeyframe, SimObjectKeyframes, Vector3Type } from './types'

/**
 * `keyframeReductionEpsilon` is in **world units** (meters) for position. For rotation, stored Euler
 * (degrees) is compared via the geodesic quaternion distance after `fromEulerDegrees` — same
 * `1 - |dot(q1,q2)|` scale. Reusing the same number as for meters
 * (e.g. 0.002) treats ~5–7° differences as "equal" and drops real rotation changes from keyframes.
 */
const KEYFRAME_QUAT_ONE_MINUS_ABS_DOT = 1e-4

// MARK: compressKeyframeTrack
export function removeRedundantKeyframes(
	keyframes: SimObjectKeyframe[],
	epsilon  : number,
): SimObjectKeyframe[] {
	const reducedKeyframes: SimObjectKeyframe[] = []

	for (const [index, keyframe] of keyframes.entries()) {
		const nextKeyframe     = keyframes[index + 1]
		const previousKeyframe = keyframes[index - 1]
		const reducedKeyframe  : SimObjectKeyframe = { time: keyframe.time }

		if (
			!previousKeyframe?.position ||
			!nextKeyframe?.position ||
			!keyframe.position ||
			!areVec3Equal(previousKeyframe.position, keyframe.position, epsilon) ||
			!areVec3Equal(keyframe.position, nextKeyframe.position, epsilon)
		) {
			reducedKeyframe.position = keyframe.position
		}

		if (
			!previousKeyframe?.rotation ||
			!nextKeyframe?.rotation ||
			!keyframe.rotation ||
			!areStoredRotationsEqual(
				previousKeyframe.rotation,
				keyframe.rotation,
				KEYFRAME_QUAT_ONE_MINUS_ABS_DOT,
			) ||
			!areStoredRotationsEqual(
				keyframe.rotation,
				nextKeyframe.rotation,
				KEYFRAME_QUAT_ONE_MINUS_ABS_DOT,
			)
		) {
			reducedKeyframe.rotation = keyframe.rotation
		}

		if (reducedKeyframe.position || reducedKeyframe.rotation) {
			reducedKeyframes.push(reducedKeyframe)
		}
	}

	return reducedKeyframes
}

// MARK: RDP (combined) —

type MaterializedRdpSample = {
	time    : number
	position: Vector3Type
	rotation: QuaternionType
}

const IDENTITY_QUAT: QuaternionType = { x: 0, y: 0, z: 0, w: 1 }

/** Deduplicate by time when merging a precontact anchor. */
const PRECONTACT_KEY_TIME_DEDUP = 1e-4

/**
 * Two RDP passes; **kept** sample indices are merged by union. A keyframe at time T only stores `position` if the
 * position RDP pass kept that index, and `rotation` if the rotation pass kept it—so a straight pre-stroke path can
 * use ~2 **position** anchors on the wire while interleaved rotation keys carry spin; playback interposes in time
 * (see `materializeKeyframes`).
 */
export function rdpSimplifyMaterializedTrack(
	samples: MaterializedRdpSample[],
	maxPositionErrorM: number,
	maxRotationErrorDeg: number,
): SimObjectKeyframe[] {
	return rdpSimplifyToSparseSamples(samples, maxPositionErrorM, maxRotationErrorDeg)
}

function rdpSimplifyToSparseSamples(
	samples: MaterializedRdpSample[],
	maxPositionErrorM: number,
	maxRotationErrorDeg: number,
): SimObjectKeyframe[] {
	const n = samples.length
	if (n === 0) {
		return []
	}
	if (n === 1) {
		const s = samples[0]!
		return [
			{
				time    : s.time,
				position: { ...s.position },
				rotation: quaternionToStoredRotation(s.rotation),
			},
		]
	}
	const usePosRdp = isRdpChannelEnabled(maxPositionErrorM)
	const useRotRdp = isRdpChannelEnabled(maxRotationErrorDeg)
	if (!usePosRdp && !useRotRdp) {
		return samples.map(
			(s) =>
				({
					time    : s.time,
					position: { ...s.position },
					rotation: quaternionToStoredRotation(s.rotation),
				}) as SimObjectKeyframe,
		)
	}
	const keepPos   = new Set<number>()
	const keepRot   = new Set<number>()
	const maxRotRad = (maxRotationErrorDeg * Math.PI) / 180
	if (usePosRdp) {
		rdpRecursePosition(
			samples,
			0,
			n - 1,
			Math.max(maxPositionErrorM, 1e-12),
			keepPos,
		)
		keepPos.add(0)
		keepPos.add(n - 1)
	}
	else {
		for (let i = 0; i < n; i += 1) {
			keepPos.add(i)
		}
	}
	if (useRotRdp) {
		rdpRecurseRotation(
			samples,
			0,
			n - 1,
			Math.max(maxRotRad, 1e-12),
			keepRot,
		)
		keepRot.add(0)
		keepRot.add(n - 1)
	}
	else {
		for (let i = 0; i < n; i += 1) {
			keepRot.add(i)
		}
	}
	const union   = new Set([...keepPos, ...keepRot])
	const ordered = Array.from(union, (i) => i as number).sort(
		(a, b) => a - b,
	)
	return ordered.map(
		(i) => {
			const s  = samples[i]!
			const kf: SimObjectKeyframe = { time: s.time }
			if (keepPos.has(i)) {
				kf.position = { x: s.position.x, y: s.position.y, z: s.position.z }
			}
			if (keepRot.has(i)) {
				kf.rotation = quaternionToStoredRotation(s.rotation)
			}
			return kf
		},
	)
}

export function rdpSimplifyKeyframeTrack(
	keyframes: SimObjectKeyframe[],
	maxPositionErrorM: number,
	maxRotationErrorDeg: number,
): SimObjectKeyframe[] {
	const m = materializeRdpFromKeyframes(keyframes)
	return rdpSimplifyToSparseSamples(
		m,
		maxPositionErrorM,
		maxRotationErrorDeg,
	)
}

// MARK: compressSimulationResult
export function compressSimulationResult(
	result: SimulationRunResult,
	optimization: OptimizationSettings,
): SimulationRunResult {
	const compressStartedAt = Date.now()
	const out: SimulationRunResult = {
		ballKeyframes : compressTrack(result.ballKeyframes, optimization),
		pinsKeyframes : result.pinsKeyframes.map((track) => injectPrecontactRestAnchorForPinTrack(
			track,
			compressTrack(track, optimization),
			optimization,
		)),
		finalPinStates: [...result.finalPinStates],
		computeTimeMs : Date.now() - compressStartedAt,
	}
	return out
}

// MARK: compressTrack
export function compressTrack(
	track        : SimObjectKeyframes,
	optimization: OptimizationSettings,
): SimObjectKeyframes {
	const { keyframeRdpMaxPositionErrorM, keyframeRdpMaxRotationErrorDeg, keyframeReductionEpsilon } = optimization
	const rdp = rdpSimplifyKeyframeTrack(
		track.keyframes,
		keyframeRdpMaxPositionErrorM,
		keyframeRdpMaxRotationErrorDeg,
	)
	return {
		index    : track.index,
		label    : track.label,
		keyframes: removeRedundantKeyframes(rdp, keyframeReductionEpsilon),
	}
}

// MARK: Precontact rest anchor (sparse pin tracks)

/**
 * RDP+dedup can leave one early key and one late key. Time-based interpolation (lerp/slerp) over that span makes
 * pins “ease” or drift before real contact. Using the *original* (full) sim track, we find the last sample that is
 * at rest (vs t=0 materialized sample) before the first real motion, then insert a *full* position+rotation key at that time into the *compressed* track, so
 * hold segments stay flat through precontact.
 */
function injectPrecontactRestAnchorForPinTrack(
	originalTrack: SimObjectKeyframes,
	compressed   : SimObjectKeyframes,
	optimization : OptimizationSettings,
): SimObjectKeyframes {
	const {
		keyframePrecontactMotionMinPosM: posM,
		keyframePrecontactMotionMinRotDeg: rotDeg,
	} = optimization
	const usePos = posM >= 0
	const useRot = rotDeg >= 0
	if (!usePos && !useRot) {
		return compressed
	}
	const posTh = usePos ? posM : Number.POSITIVE_INFINITY
	const rotTh = useRot
		? (rotDeg * Math.PI) / 180
		: Number.POSITIVE_INFINITY
	const o = originalTrack.keyframes
	if (o.length === 0) {
		return compressed
	}
	const samples = materializeRdpFromKeyframes(o)
	if (samples.length < 2) {
		return compressed
	}
	const p0    = samples[0]!.position
	const q0    = samples[0]!.rotation
	let firstJ  = -1
	for (let j = 1; j < samples.length; j += 1) {
		const s = samples[j]!
		const d = Math.hypot(
			s.position.x - p0.x,
			s.position.y - p0.y,
			s.position.z - p0.z,
		)
		const a = quatGeodesicAngleRad(q0, s.rotation)
		if (d > posTh || a > rotTh) {
			firstJ = j
			break
		}
	}
	if (firstJ <= 0) {
		return compressed
	}
	const pre  = samples[firstJ - 1]!
	const tPre = pre.time
	if (!Number.isFinite(tPre)) {
		return compressed
	}
	const anchor: SimObjectKeyframe = {
		time    : tPre,
		position: { x: pre.position.x, y: pre.position.y, z: pre.position.z },
		rotation: quaternionToStoredRotation(pre.rotation),
	}
	const keys = compressed.keyframes
	let match   = -1
	let bestAbs = Number.POSITIVE_INFINITY
	for (let i = 0; i < keys.length; i += 1) {
		const dt = Math.abs(keys[i]!.time - tPre)
		if (dt < bestAbs) {
			bestAbs = dt
			match   = i
		}
	}
	let nextKeyframes: SimObjectKeyframe[]
	if (match >= 0 && bestAbs <= PRECONTACT_KEY_TIME_DEDUP) {
		const merged: SimObjectKeyframe = {
			time    : tPre,
			position: {
				x: pre.position.x,
				y: pre.position.y,
				z: pre.position.z,
			},
			rotation: quaternionToStoredRotation(pre.rotation),
		}
		// If merge target had time-only, keep; we always set full pos+rot.
		const copy = keys.slice()
		copy[match] = merged
		nextKeyframes = copy
	}
	else {
		nextKeyframes = [...keys, anchor].sort((a, b) => a.time - b.time)
	}
	return {
		...compressed,
		keyframes: nextKeyframes,
	}
}

// MARK: countTrackKeyframes
export function countTrackKeyframes(track: SimObjectKeyframes): number {
	return track.keyframes.length
}

// MARK: countSimulationKeyframes
export function countSimulationKeyframes(result: SimulationRunResult): number {
	return (
		countTrackKeyframes(result.ballKeyframes) +
		result.pinsKeyframes.reduce((sum, track) => sum + countTrackKeyframes(track), 0)
	)
}

// MARK: Utils (flat dedup)

function areVec3Equal(
	left    : Vector3Type,
	right   : Vector3Type,
	epsilon : number,
): boolean {
	return (
		Math.abs(left.x - right.x) <= epsilon &&
		Math.abs(left.y - right.y) <= epsilon &&
		Math.abs(left.z - right.z) <= epsilon
	)
}

function areQuatEqual(
	left    : QuaternionType,
	right   : QuaternionType,
	epsilon : number,
): boolean {
	const dot = left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
	return 1 - Math.abs(dot) <= epsilon
}

function areStoredRotationsEqual(
	left    : Vector3Type,
	right   : Vector3Type,
	epsilon : number,
): boolean {
	return areQuatEqual(
		normalizeQuat(storedRotationToQuaternion(left)),
		normalizeQuat(storedRotationToQuaternion(right)),
		epsilon,
	)
}

// MARK: RDP intern

function isRdpChannelEnabled(tolerance: number): boolean {
	// 0 and positive finite: active. Use -1 in UIs to mean “skip this layer”.
	return Number.isFinite(tolerance) && tolerance >= 0
}

function materializeRdpFromKeyframes(
	keyframes: SimObjectKeyframe[],
): MaterializedRdpSample[] {
	if (keyframes.length === 0) {
		return []
	}
	let position = keyframes.find((k) => k.position)?.position ?? { x: 0, y: 0, z: 0 }
	let rotationStored: Vector3Type = keyframes.find((k) => k.rotation)?.rotation ?? {
		...DEFAULT_STORED_ROTATION,
	}
	const base = keyframes.map((kf) => {
		if (kf.position) {
			position = kf.position
		}
		if (kf.rotation) {
			rotationStored = kf.rotation
		}
		return {
			time    : kf.time,
			position: { x: position.x, y: position.y, z: position.z },
			rotation: normalizeQuat(storedRotationToQuaternion(rotationStored)),
		}
	})
	unwrapQuaternionHemisphere(base)
	return base
}

/** Consecutive quaternions: prefer +q with dot(prev,q) > 0 so the series is slerp-friendly. */
function unwrapQuaternionHemisphere(samples: MaterializedRdpSample[]) {
	if (samples.length < 2) {
		return
	}
	for (let i = 1; i < samples.length; i += 1) {
		const prev = samples[i - 1]!.rotation
		let r = samples[i]!.rotation
		if (
			prev.x * r.x + prev.y * r.y + prev.z * r.z + prev.w * r.w
			< 0
		) {
			r = { x: -r.x, y: -r.y, z: -r.z, w: -r.w }
			samples[i]!.rotation = r
		}
	}
}


// MARK: distPointToLine3D
/** Perpendicular distance from p to the infinite 3D line through a and b. Collinear points yield ~0. */
function distPointToLine3D(
	p         : Vector3Type,
	a         : Vector3Type,
	b         : Vector3Type,
): number {
	const abx = b.x - a.x
	const aby = b.y - a.y
	const abz = b.z - a.z
	const apx = p.x - a.x
	const apy = p.y - a.y
	const apz = p.z - a.z
	const ab2 = abx * abx + aby * aby + abz * abz
	if (ab2 <= 1e-24) {
		return Math.hypot(apx, apy, apz)
	}
	const cx = apy * abz - apz * aby
	const cy = apz * abx - apx * abz
	const cz = apx * aby - apy * abx
	return Math.hypot(cx, cy, cz) / Math.sqrt(ab2)
}


// MARK: normalizeQuat
function normalizeQuat(
	q: QuaternionType,
): QuaternionType {
	const len = Math.hypot(q.x, q.y, q.z, q.w)
	if (len <= 1e-20) {
		return { ...IDENTITY_QUAT }
	}
	return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len }
}


// MARK: slerpQuat
function slerpQuat(
	a         : QuaternionType,
	b         : QuaternionType,
	t         : number,
): QuaternionType {
	let cosHalfTheta = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z
	if (cosHalfTheta < 0) {
		cosHalfTheta = -cosHalfTheta
		b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w }
	}
	if (Math.abs(cosHalfTheta) >= 1 - 1e-6) {
		return { x: a.x, y: a.y, z: a.z, w: a.w }
	}
	const sqrSinHalfTheta = 1 - cosHalfTheta * cosHalfTheta
	if (sqrSinHalfTheta <= 1e-12) {
		return {
			x: a.x * 0.5 + b.x * 0.5,
			y: a.y * 0.5 + b.y * 0.5,
			z: a.z * 0.5 + b.z * 0.5,
			w: a.w * 0.5 + b.w * 0.5,
		}
	}
	const sinHalfTheta = Math.sqrt(sqrSinHalfTheta)
	const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta)
	const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta
	const ratioB = Math.sin(t * halfTheta) / sinHalfTheta
	return {
		x: a.x * ratioA + b.x * ratioB,
		y: a.y * ratioA + b.y * ratioB,
		z: a.z * ratioA + b.z * ratioB,
		w: a.w * ratioA + b.w * ratioB,
	}
}


// MARK: quatGeodesicAngleRad
/** Shortest 3D angle between quaternions (radians) when both are used as orientations. */
function quatGeodesicAngleRad(
	left : QuaternionType,
	right: QuaternionType,
): number {
	const dot = Math.min(
		1,
		Math.max(-1, Math.abs(
			left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w,
		)),
	)
	return 2 * Math.acos(dot)
}

function rdpRecursePosition(
	samples: MaterializedRdpSample[],
	i0     : number,
	j0     : number,
	maxErrM: number,
	out    : Set<number>,
): void {
	if (j0 <= i0 + 1) {
		out.add(i0)
		out.add(j0)
		return
	}
	const tI = samples[i0]!.time
	const tJ = samples[j0]!.time
	const span = tJ - tI
	if (span <= 1e-12) {
		for (let h = i0; h <= j0; h += 1) {
			out.add(h)
		}
		return
	}
	const pI = samples[i0]!.position
	const pJ = samples[j0]!.position
	let maxD  = 0
	let bestK = i0 + 1
	for (let k = i0 + 1; k < j0; k += 1) {
		const pK = samples[k]!.position
		const d  = distPointToLine3D(pK, pI, pJ)
		if (d > maxD) {
			maxD = d
			bestK = k
		}
	}
	if (maxD <= maxErrM) {
		out.add(i0)
		out.add(j0)
		return
	}
	rdpRecursePosition(samples, i0, bestK, maxErrM, out)
	rdpRecursePosition(samples, bestK, j0, maxErrM, out)
}

function rdpRecurseRotation(
	samples: MaterializedRdpSample[],
	i0     : number,
	j0     : number,
	maxAngleErrRad: number,
	out   : Set<number>,
): void {
	if (j0 <= i0 + 1) {
		out.add(i0)
		out.add(j0)
		return
	}
	const tI = samples[i0]!.time
	const tJ = samples[j0]!.time
	const span = tJ - tI
	if (span <= 1e-12) {
		for (let h = i0; h <= j0; h += 1) {
			out.add(h)
		}
		return
	}
	const qI = samples[i0]!.rotation
	const qJ = samples[j0]!.rotation
	let maxA  = 0
	let bestK = i0 + 1
	for (let k = i0 + 1; k < j0; k += 1) {
		const tK  = samples[k]!.time
		const u   = (tK - tI) / span
		const qK  = samples[k]!.rotation
		const qHat = slerpQuat(qI, qJ, u)
		const ang  = quatGeodesicAngleRad(qK, qHat)
		if (ang > maxA) {
			maxA = ang
			bestK = k
		}
	}
	if (maxA <= maxAngleErrRad) {
		out.add(i0)
		out.add(j0)
		return
	}
	rdpRecurseRotation(samples, i0, bestK, maxAngleErrRad, out)
	rdpRecurseRotation(samples, bestK, j0, maxAngleErrRad, out)
}
