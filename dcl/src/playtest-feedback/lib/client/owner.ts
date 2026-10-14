import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { getRealm, getSceneInformation } from '~system/Runtime'

// .zone realm (testnet Worlds): the .zone server, else mainnet
const WORLDS_SERVER = 'https://worlds-content-server.decentraland.org'
const WORLDS_SERVER_ZONE = 'https://worlds-content-server.decentraland.zone'
const WALLET = /^0x[0-9a-fA-F]{40}$/

export function isWallet(value: string): boolean {
  return WALLET.test(value)
}

// Lowercase. owner: scene.json "owner" if a wallet, else the World NAME's owner.
// deployers: the World's deployment allow-list (public endpoint, no signature). Looked up once.
type SceneTeam = { owner: string | null; deployers: string[] }
let team: Promise<SceneTeam> | null = null
function findSceneTeam(): Promise<SceneTeam> {
  if (!team) team = lookUpSceneTeam()
  return team
}

async function lookUpSceneTeam(): Promise<SceneTeam> {
  try {
    const { metadataJson } = await getSceneInformation({})
    const metadata = JSON.parse(metadataJson) as { owner?: unknown; worldConfiguration?: { name?: unknown } }
    const declared = typeof metadata.owner === 'string' && isWallet(metadata.owner) ? metadata.owner.toLowerCase() : null
    const world = metadata.worldConfiguration?.name
    if (typeof world !== 'string' || world === '') return { owner: declared, deployers: [] }
    const { realmInfo } = await getRealm({})
    const server = realmInfo?.baseUrl.includes('decentraland.zone') ? WORLDS_SERVER_ZONE : WORLDS_SERVER
    const response = await fetch(`${server}/world/${encodeURIComponent(world)}/permissions`)
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    const body = (await response.json()) as {
      owner?: unknown
      permissions?: { deployment?: { wallets?: unknown } }
    }
    const owner = declared ?? (typeof body.owner === 'string' && isWallet(body.owner) ? body.owner.toLowerCase() : null)
    const wallets = body.permissions?.deployment?.wallets
    const deployers = Array.isArray(wallets)
      ? wallets.filter((w): w is string => typeof w === 'string' && isWallet(w)).map((w) => w.toLowerCase())
      : []
    return { owner, deployers }
  } catch (e) {
    console.log('[FEEDBACK] Could not look up the scene owner:', e)
    return { owner: null, deployers: [] }
  }
}

// for the Intro's default avatar. null in Genesis City without "owner", or if the lookup fails.
export async function findSceneOwner(): Promise<string | null> {
  return (await findSceneTeam()).owner
}

// Preview: anyone. Deployed: only owner and deployers, so a DEBUG left on never reaches players.
export async function canSeeDebug(): Promise<boolean> {
  const { realmInfo } = await getRealm({})
  if (realmInfo?.isPreview) return true
  const { owner, deployers } = await findSceneTeam()
  const player = await localPlayer()
  return player === owner || deployers.includes(player)
}

// lowercase; userId appears a few frames after main()
function localPlayer(): Promise<string> {
  return new Promise((resolve) => {
    function waitForPlayer() {
      const userId = getPlayer()?.userId
      if (!userId) return
      engine.removeSystem(waitForPlayer)
      resolve(userId.toLowerCase())
    }
    engine.addSystem(waitForPlayer)
  })
}
