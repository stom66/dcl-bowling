import { Entity, MapComponentDefinition } from "@dcl/sdk/ecs"


/**
 * Who owns the component and whether it is replicated.
 * - `client` — client-only local data; never synced
 * - `server` — server-only; never synced to clients
 * - `synced` — server-authoritative; replicated to clients
 */
export type ComponentMode = 'client' | 'server' | 'synced'


/**
 * Entity bucket. `'main'` is the single shared gameplay entity.
 * Any other string is a project-defined keyed group (players, lanes, rooms).
 */
export type EntityGroupId = string


/**
 * CRDT validateBeforeChange payload. `currentValue` is the pre-change
 * component; `newValue` is undefined when the component is being deleted.
 */
export type ComponentChangeValidation<T = any> = (change: {
	entity       : Entity
	currentValue : T | undefined
	newValue     : T | undefined
	senderAddress: string
	createdBy    : string
}) => boolean


/**
 * One entry in the project registry.
 */
export type ComponentRegistration<T = any> = {
	component  : MapComponentDefinition<T>
	mode       : ComponentMode
	entityGroup: EntityGroupId
	defaults?  : () => T
	validate?  : ComponentChangeValidation<T>
}


/**
 * Optional lookup for keyed entity groups.
 */
export type EntityKeyOptions = {
	key?: string
}


/**
 * Config for a keyed entity group (one entity per instance key).
 *
 * `keyField` is the property name on `keyComponent` used for discovery.
 * Defaults to `'key'` when omitted. Player groups typically use `'userId'`.
 */
export type KeyedEntityGroupConfig = {
	id           : EntityGroupId
	keyComponent : MapComponentDefinition<any>
	keyField?    : string
}


// MARK: getGroupKeyField
/**
 * Returns the identity field used to look up entities in a keyed group.
 */
export function getGroupKeyField(group: KeyedEntityGroupConfig): string {
	return group.keyField ?? 'key'
}


// MARK: normalizeEntityKey
/**
 * Case-folds keyed-group ids so wallet addresses match across getPlayer and server enter.
 */
export function normalizeEntityKey(key: string): string {
	return key.toLowerCase()
}


// MARK: toIdentityFieldValue
/**
 * Writes integer strings as numbers so Int schema fields (e.g. laneIndex) match.
 * Wallets and other non-integer keys stay strings.
 */
export function toIdentityFieldValue(key: string): string | number {
	if (/^-?\d+$/.test(key)) {
		const asNum = Number(key)
		if (Number.isSafeInteger(asNum)) return asNum
	}
	return key
}


// MARK: readIdentityKey
/**
 * Reads a keyed-group identity field as a string. Accepts string or finite number.
 */
export function readIdentityKey(
	identity: unknown,
	keyField: string
): string | undefined {
	if (!identity || typeof identity !== 'object') return undefined

	const value = (identity as Record<string, unknown>)[keyField]
	if (typeof value === 'string' && value !== '') return value
	if (typeof value === 'number' && Number.isFinite(value)) return String(value)

	return undefined
}
