# Authoritative Servers

## Overview

Decentraland runs scenes locally in a player's machine. By default, players are able to see each other and interact directly, but each one interacts with the environment independently. Changes in the environment aren't shared between players by default.

Allowing all players to see a scene as having the same content in the same state is extremely important to for players to interact in more meaningful ways. Without this, if a player opens a door and walks into a house, other players will see that door as still closed, and the first player will appear to walk directly through the closed door to other players.

An **authoritative server** is a headless server process that runs your scene code, validates state changes, and broadcasts the result to all connected players. Instead of trusting each client to report its own actions, the server acts as the single source of truth. This makes it the recommended approach for syncing multiplayer scenes.

An authoritative server is ideal whenever fairness is important for game mechanics, as you can implement elaborate anti-cheat validations that run server-side. You can also store private keys and other sensitive information on the server, avoiding ever needing to expose them directly to the user.

Having an authoritative server also solves a real problem: in a peer-to-peer setup, two players controlling something like a floating platform can produce conflicting outcomes. Each client sets the platform to a different height, and no one has the authority to decide which is correct. An authoritative server resolves every change in one place, so all clients converge on the same state.

It also gives you a place to **persist data across sessions**: leaderboards, player progression, unlocked achievements, or environment changes like doors opened or items placed. When players come back, the world reflects what happened before.

Decentraland hosts and deploys the server for you. Publishing your scene via the normal process also seamlessly publishes the server, with no extra steps or needing to pay for any hosting.

## Setup

### 1. Install the auth-server SDK version

The native authoritative server APIs (`isServer`, `registerMessages`, `Storage`, `EnvVar`, etc.) are available on a separate SDK branch. Run the following commands to install it in your project instead of the standard SDK branch:

```bash
npm install @dcl/sdk@auth-server
npm install @dcl/js-runtime@auth-server
```

### 2. Configure scene.json

Optionally add the following to your `scene.json` at root level:

```json
{
 "logsPermissions": ["0xYourWalletAddress"]
}
```

Add `logsPermissions` to list wallet addresses that can see `console.log()` from the server. The listed users can then view server logs in production by running the following command:

`npx sdk-commands sdk-server-logs`

### 3. Run the preview

Use the standard preview command, no extra steps needed. When using the auth-server branch of the SDK, the preview automatically starts a local version of the authoritative server in the background.

The local session of the server is not connected to the one in production, so you're free to test things without affecting players who are in your published scene.

## Server / Client Branching

The scene code in your project's `src` folder runs on both server and client. Use the `isServer()` function to split execution paths.:

```typescript
import { isServer } from '@dcl/sdk/network'
import { initServer } from './server/server'
import { initClient } from './client/setup'
import { setupUi } from './client/ui'

function main() {
 if (isServer()) {
  // Server-only: game logic, validation, state management
  initServer()
  return
 } else {
  // Client-only: UI, input handling, message sending
  initClient()
  setupUi()
 }
}
```

The server runs your scene headlessly with no rendering. It has verified access to all player positions, wearables and other data via `PlayerIdentityData` and is the sole authority over game state.

## Synced Components and Validation

### Syncing Entities to All Clients

Use `syncEntity` to broadcast any changes in the indicated components of that entity:

```typescript
import { syncEntity } from '@dcl/sdk/network'

syncEntity(
 entity,
 [Transform.componentId, GameState.componentId],
 /* enumId */ 1
)
```

The syntax is identical to what's used by the [Serverless multiplayer](/creator/scenes-sdk7/networking/serverless-multiplayer.md) feature, making it trivial to upgrade a scene from using this architecture to the authoritative server. When a scene uses the authoritative server, state updates are no longer sent between all players, instead all state updates are now routed and validated via the server.

### Validating changes

Use `validateBeforeChange()` to restrict any state updates in a specific component of an entity. It allows you to run a custom validation function, and changes are only successful when the validation test is met.

If the validation returns the value *true*, then the change is accepted and propagated to all players. If the validation returns the value *false*, then the change is rejected. A rejected change won't be passed to other players and is reverted for the player who attempted to make it.

#### Validate values

The simplest case is to validate that the new *value* being written is within certain parameters. For example, only accept changes to a `Transform` when the new Y position is above 0:

```typescript
import { engine, Transform } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'

const entity = engine.addEntity()
Transform.create(entity, { position: Vector3.create(10, 2, 10) })

if (isServer()) {
 Transform.validateBeforeChange(entity, (value) => {
  // Reject any update that would place the entity at or below Y = 0
  return value.position.y > 0
 })
}
```

Because `validateBeforeChange()` only has meaning on the server, always guard it with `isServer()`. On the client the call does nothing useful.

You can use this to prevent changes that are against your game logic, as anti cheat mechanisms.

#### Validate proximity to the player

You can combine `validateBeforeChange()` with server-verified player positions to check that a player is close enough to an object before allowing them to interact with it. For example, when a player tries to pick up an object by changing its `Transform`, you can reject the change if the object is more than 5 meters away from the player:

```typescript
import { engine, Transform, PlayerIdentityData } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'

const pickableEntity = engine.addEntity()
Transform.create(pickableEntity, { position: Vector3.create(8, 1, 8) })

if (isServer()) {
 Transform.validateBeforeChange(pickableEntity, (value) => {
  // Find the player who sent this change
  for (const [playerEntity, identity] of engine.getEntitiesWith(
   PlayerIdentityData
  )) {
   if (identity.address.toLowerCase() !== value.senderAddress.toLowerCase())
    continue

   const playerTransform = Transform.getOrNull(playerEntity)
   if (!playerTransform) return false

   // Get the current position of the object, before the change
   const objectTransform = Transform.getOrNull(pickableEntity)
   if (!objectTransform) return false

   const distance = Vector3.distance(
    playerTransform.position,
    objectTransform.position
   )

   // Only allow the change if the player is within 5 meters
   return distance <= 5
  }

  // Sender not found among connected players — reject
  return false
 })
}
```

This pattern is useful as an anti-cheat mechanism: it prevents players from reaching across the scene to grab objects they shouldn't be able to interact with.

#### Only allow changes by admins

You can also validate based on *who* is sending the change. Every incoming value includes a `senderAddress` field with the wallet address of the sender. Use this to only allow changes from certain players. For example, to only allow scene admins to modify a `VideoPlayer` component:

```typescript
import { engine, VideoPlayer } from '@dcl/sdk/ecs'
import { isServer, isPreview } from '@dcl/sdk/network'
import { getSceneAdmins } from '@dcl/sdk/server'

const videoEntity = engine.addEntity()
VideoPlayer.create(videoEntity, { src: 'videos/intro.mp4' })

if (isServer()) {
 // Cache of admin wallet addresses, refreshed from the scene admin list
 let adminAddresses = new Set<string>()

 async function updateAdminAddresses() {
  if (isPreview()) return
  try {
   const [error, response] = await getSceneAdmins()
   if (error) {
    console.error('[SERVER] Error fetching admin list:', error)
    adminAddresses = new Set()
    return
   }
   adminAddresses = new Set(
    (response ?? []).map((admin) => admin.admin.toLowerCase())
   )
   console.log(
    '[SERVER] Updated admin addresses cache:',
    Array.from(adminAddresses)
   )
  } catch (error) {
   console.error('[SERVER] Error updating admin addresses:', error)
   adminAddresses = new Set()
  }
 }

 // Populate the cache before wiring up validation
 await updateAdminAddresses()

 VideoPlayer.validateBeforeChange(videoEntity, (value) => {
  // Always allow changes while running in preview, so local testing is easier
  if (isPreview()) return true

  const senderAddress = value.senderAddress.toLowerCase()
  if (!adminAddresses.has(senderAddress)) {
   console.log(
    '[SERVER] Unauthorized VideoPlayer change blocked from:',
    senderAddress
   )
   return false
  }
  return true
 })
}
```

See [Scene Admin](/creator/scene-editor/operate-live/scene-admin.md) for more context about how players become admins on a scene.

#### Only allow changes by the server

The strictest case is to only accept writes that originate from the server itself, rejecting any change coming from a client. This is the go-to pattern for state that should be fully authoritative: scores, game phase, spawned entities, etc.

Every incoming value includes a `senderAddress` field. When the sender is the server, this field matches the constant `AUTH_SERVER_PEER_ID`, exported from `@dcl/sdk/network/message-bus-sync`.

The example below defines a small `protectServerEntity()` helper that applies this check to one or more components on a given entity. It's a convenient way to protect multiple components (like `Transform` and `GltfContainer`) in a single call:

```typescript
import { Entity, Transform, GltfContainer } from '@dcl/sdk/ecs'
import { AUTH_SERVER_PEER_ID } from '@dcl/sdk/network/message-bus-sync'

type ComponentWithValidation = {
 validateBeforeChange: (
  entity: Entity,
  cb: (value: { senderAddress: string }) => boolean
 ) => void
}

function protectServerEntity(
 entity: Entity,
 components: ComponentWithValidation[]
) {
 for (const component of components) {
  component.validateBeforeChange(entity, (value) => {
   return value.senderAddress === AUTH_SERVER_PEER_ID
  })
 }
}

// After creating a server-managed entity:
const entity = engine.addEntity()
Transform.create(entity, { position: Vector3.create(10, 5, 10) })
GltfContainer.create(entity, { src: 'assets/model.glb' })
protectServerEntity(entity, [Transform, GltfContainer])
```

#### Custom Components

You can also apply `validateBeforeChange()` on custom components defined by the scene.

```typescript
import { engine, Schemas } from '@dcl/sdk/ecs'
import { AUTH_SERVER_PEER_ID } from '@dcl/sdk/network/message-bus-sync'

export const GameState = engine.defineComponent('game:State', {
 phase: Schemas.String,
 score: Schemas.Int,
 timeRemaining: Schemas.Int,
})

// Only the server can modify this component
GameState.validateBeforeChange((value) => {
 return value.senderAddress === AUTH_SERVER_PEER_ID
})
```

## Messages

Synced components are great for state that all players should see continuously: things like positions, scores, or game phase. But not everything fits that model. Sometimes a player just needs to tell the server "I clicked this button" or "I want to join the game", and the server needs to reply with a one-time response like "round started" or "here are your stats". These are events, not ongoing state.

That's what messages are for. Use `registerMessages()` for typed, schema-validated communication between clients and the server. Messages are fire-and-forget: a client sends one to the server, the server processes it and optionally sends one back. They don't directly create any persistent state on their own.

### Define Messages

Define all messages in a shared file that both server and client import. This way both sides always agree on what messages exist and what data they carry. Each message is a `Schemas.Map` describing its payload:

```typescript
import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const Messages = {
 // Client → Server
 playerReady: Schemas.Map({ displayName: Schemas.String }),
 playerAction: Schemas.Map({ action: Schemas.String, targetId: Schemas.Int }),

 // Server → Client
 gameStarted: Schemas.Map({ roundNumber: Schemas.Int }),
 gameEnded: Schemas.Map({ winnerId: Schemas.String }),
}

export const room = registerMessages(Messages)
```

### Send Messages

Clients can only send messages to the server. There is no direct client-to-client messaging. The server can broadcast to all clients or target specific players by address.

```typescript
// Client → Server (broadcast, server receives it)
room.send('playerReady', { displayName: 'Alice' })

// Server → all clients
room.send('gameStarted', { roundNumber: 1 })

// Server → one specific client (by wallet address)
room.send('gameEnded', { winnerId: 'Alice' }, { to: [playerAddress] })
```

### Receive Messages

```typescript
// Client receives from server
room.onMessage('gameStarted', (data) => {
 console.log(`Round ${data.roundNumber} started!`)
})

// Server receives from client
room.onMessage('playerReady', (data, context) => {
 if (!context) return
 const senderAddress = context.from // verified wallet address
 console.log(`[Server] ${data.displayName} is ready (${senderAddress})`)
})
```

On the server, every received message includes a `context` object with the sender's verified wallet address. Use this to know which player sent the message (never rely on self-reported identity in the payload).

### Wait for State Sync Before Sending

Clients should wait until the scene state is synced before sending their first message, to avoid race conditions on join:

```typescript
import { isStateSyncronized } from '@dcl/sdk/network'

engine.addSystem(() => {
 if (!isStateSyncronized()) return

 // Safe to send messages now
 room.send('playerReady', { displayName: 'Alice' })
})
```

### Available Schema Types

All message payloads and custom components use `Schemas` for binary serialization. Here is a quick reference of the types available:

```typescript
// Basic types
Schemas.String // "hello"
Schemas.Int // 42
Schemas.Float // 3.14
Schemas.Bool // true / false
Schemas.Int64 // Date.now()

// Vector types
Schemas.Vector3 // { x: 1, y: 2, z: 3 }
Schemas.Quaternion // { x, y, z, w }

// Complex types
Schemas.Array(Schemas.String) // ["a", "b", "c"]
Schemas.Entity // Entity reference
Schemas.Optional(Schemas.String) // "hello" or undefined
Schemas.Optional(Schemas.Int) // 42 or undefined

// Nested objects
Schemas.Map({
 name: Schemas.String,
 health: Schemas.Int,
 position: Schemas.Vector3,
 playerId: Schemas.Optional(Schemas.String),
})
```

{% hint style="warning" %}
**📔 Note**: Messages *must* be defined using `Schemas.Map(...)`. You cannot send plain JavaScript objects, they will fail binary serialization.
{% endhint %}

## Server Reading Player Positions

The server can read **verified** player positions;clients cannot spoof these. This is the foundation of position-based anti-cheat:

```typescript
import { engine, PlayerIdentityData, Transform } from '@dcl/sdk/ecs'

engine.addSystem(() => {
 for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
  const transform = Transform.getOrNull(entity)
  if (!transform) continue

  const address = identity.address
  const position = transform.position
  // This position is server-verified — never trust client-reported position
 }
})
```

{% hint style="warning" %}
**📔 Note**: Always use `PlayerIdentityData` + `Transform` on the server to get player positions. Never trust values reported by the client itself.
{% endhint %}

## Data Storage

Persist data across server restarts. Storage is **server-only**, always guard calls with `isServer()`. The server can both write and read this data.

```typescript
import { Storage } from '@dcl/sdk/server'
```

Data can be stored at two levels:

* **World**: Use this for data that is relevant to all players, like leaderboards or persistent environment changes.
* **Player**: Use this for player-specific data, like saving progress or preferences for that player.

{% hint style="info" %}
**💡 Tip**: Storage only accepts strings. Use `JSON.stringify()` / `JSON.parse()` for objects and `String()` / `parseInt()` for numbers.

During local development, storage is written to `node_modules/@dcl/sdk-commands/.runtime-data/server-storage.json`.
{% endhint %}

### World Storage — Shared Across All Players

```typescript
// Write
await Storage.world.set(
 'leaderboard',
 JSON.stringify([
  { name: 'Alice', score: 100 },
  { name: 'Bob', score: 85 },
 ])
)

// Read
const raw = await Storage.world.get<string>('leaderboard')
const leaderboard = raw ? JSON.parse(raw) : []

// Delete
await Storage.world.delete('leaderboard')
```

You can also manage scene storage via the command line, using `npx sdk-commands storage scene`:

```bash
# Set a value
npx sdk-commands storage scene set high_score --value 100

# Get a value
npx sdk-commands storage scene get high_score

# Delete a value
npx sdk-commands storage scene delete high_score

# Delete all scene storage data
npx sdk-commands storage scene clear --confirm
```

### Player Storage — Per Wallet Address

```typescript
// Write
await Storage.player.set(
 playerAddress,
 'progress',
 JSON.stringify({
  level: 5,
  coins: 250,
 })
)

// Read
const saved = await Storage.player.get<string>(playerAddress, 'progress')
const progress = saved ? JSON.parse(saved) : { level: 1, coins: 0 }

// Delete
await Storage.player.delete(playerAddress, 'progress')
```

You can also manage player storage via the command line, using `npx sdk-commands storage player`:

```bash
# Set a value for a specific player
npx sdk-commands storage player set level --value 10 --address 0x1234...

# Get a value for a specific player
npx sdk-commands storage player get level --address 0x1234...

# Delete a value for a specific player
npx sdk-commands storage player delete level --address 0x1234...

# Delete all data for a specific player
npx sdk-commands storage player clear --address 0x1234... --confirm

# Delete all player data (all players)
npx sdk-commands storage player clear --confirm
```

### Access stored data

You can see and edit the live stored data on your server via the storage UI, by entering this link:

[decentraland.org/storage](https://decentraland.org/storage)

You can also reach this page via the Creator Hub. Open the **Manage** tab, click the three dots next to a place where you have published content, and select **View server data**.

There you can see a list of all the worlds and land where you can publish scenes.

Open your scene and then the **Scene** or **Player** tab.

In the **Scene** tab you'll see a list of all the stored variables. From here you can edit or remove any of these variables by clicking the pencil or trash icon.

![Activate stream](/files/87djyX4SBJ4W1bCByqyG)

In the **Player** tab you'll see a list of all the players who have any data stored on your server. You can search them by address or name, and then see all their associated data. You can also edit or remove this data by clicking the pencil or trash icon.

### Changing the data structure

Stored data in production is **not cleared when you publish a new version of your scene**. This is great for leaderboards, player progress, and persistent environment changes possible that players expect to live on beyond any small updates to your scene.

The flip side is that the data sitting in storage was written by an older version of your code. If your new code expects a different shape, parsing or reading that old data can fail in subtle ways. A field you renamed will be missing. A field that used to be a string and is now an object will throw when you try to access a property on it. A player who hasn't logged in for months may load data that predates a structure your code no longer knows how to handle.

{% hint style="warning" %}
**📔 Note**: Schema changes don't just affect the very first read after a deploy. Stored data lives until it's overwritten or deleted, so an old-format value can surface at any time, often from a returning player you'd forgotten about.
{% endhint %}

#### Best practices

* *Always parse defensively*. Treat anything coming out of storage as untrusted input, even though you wrote it. Wrap `JSON.parse()` in a `try/catch`, check that fields exist before reading them, and have a sensible default ready when they don't:

  ```typescript
  const raw = await Storage.player.get<string>(playerAddress, 'progress')
  let progress = { level: 1, coins: 0 }
  if (raw) {
   try {
    const parsed = JSON.parse(raw)
    progress = {
     level: typeof parsed.level === 'number' ? parsed.level : 1,
     coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
    }
   } catch {
    // Old or corrupt data — fall back to defaults
   }
  }
  ```

* *Add fields, don't rename or remove them*. The safest schema change is an additive one: introduce a new field with a default, and leave existing fields alone. Old data will simply be missing the new field, which your defensive parsing already handles. Renaming a field forces every old record to break.
* *Version your stored objects*. Include a `version` field from day one. When you read data, branch on the version and migrate older shapes into the current one before using them. This keeps the rest of your code working with a single, current shape:

  ```typescript
  type ProgressV2 = { version: 2; level: number; coins: number; xp: number }

  function migrate(raw: any): ProgressV2 {
   const version = raw?.version ?? 1
   if (version === 1) {
    // v1 had no xp field — default it
    return { version: 2, level: raw.level ?? 1, coins: raw.coins ?? 0, xp: 0 }
   }
   return raw as ProgressV2
  }
  ```

* *Write back the migrated value*. Once you've upgraded a record in memory, save it back so the next read is already in the new format. Over time this drains the pool of old-shape records without needing a one-shot migration script.
* *For breaking changes, use a new key*. If the new structure is genuinely incompatible and migrating isn't worth it, write to a new storage key (for example `progress_v2`) and ignore the old one. The old key sits harmlessly in storage and you avoid any read path that has to interpret it. You can clean up the old keys later via the [storage UI](https://decentraland.org/storage) or the `npx sdk-commands storage` commands.
* *Test against real production data*. Before deploying a structural change, pull a few real records from the storage UI and run your new parsing code against them. The corner cases that cause problems are usually records you didn't know existed.
* *Leaving an escape hatch*. Keep in mind that you can edit or delete individual records from the storage UI or via `npx sdk-commands storage`. If a single player ends up wedged in a bad state after a schema change, you can fix their record directly without redeploying.

## Environment Variables

Configure your scene without hardcoding values into the code. Environment variables are useful for sensitive data, and also for feature flags or parameters that can be easily changed without republishing your scene.

Environment variables are **server-only**. Guard them with `isServer()`. The server can read environment variables, but not change their values.

```typescript
import { EnvVar } from '@dcl/sdk/server'

const maxPlayers = parseInt((await EnvVar.get('MAX_PLAYERS')) || '4')
const gameDuration = parseInt((await EnvVar.get('GAME_DURATION')) || '300')
const debugMode = ((await EnvVar.get('DEBUG')) || 'false') === 'true'
```

### Sensitive data

Environment variables are especially useful for storing private keys, reward claim codes, and other sensitive data that would be risky to expose in the public scene's compiled code.

You can store private keys in the server's storage, and have only the server read these with `isServer()`. That way the sensitive data never travels through the player's machine.

### Local Development

To use environment variables while running your project locally, create a `.env` file in your project root:

```
MAX_PLAYERS=8
GAME_DURATION=300
DEBUG=true
```

Important: Add `.env` to your `.gitignore`, so that these potentially sensitive values are never uploaded to the public content servers.

### Change environment variables

The easiest way to change the values of your environment variables is via the storage UI.

You can access the data that is stored by the scene's storage by entering this link:

[decentraland.org/storage](https://decentraland.org/storage)

You can also reach this page via the Creator Hub. Open the **Manage** tab, click the three dots next to a place where you have published content, and select **View server data**.

There you can see a list of all the worlds and land where you can publish scenes.

Open your scene and then the **Environment** tab. You should see all of the environment variables in the project.

![Activate stream](/files/hkSxy2F1SvdETJcP1yhz)

Note that you cannot read the values of any of these environment variables (that's to protect sensitive data) but you can delete or overwrite any of them. Simply click the pencil or trash-can icon.

You can also manage environment variables via the command line, using `npx sdk-commands storage env`:

```bash
# Set a variable
npx sdk-commands storage env set MAX_PLAYERS --value 8

# Delete a variable
npx sdk-commands storage env delete OLD_VAR

# Delete all environment variables
npx sdk-commands storage env clear --confirm
```

You can also target a specific environment with the `--target` flag:

```bash
# Deploy to staging
npx sdk-commands storage env set MY_KEY --value my_value --target https://storage.decentraland.zone

# Deploy to a local development server
npx sdk-commands storage env set MY_KEY --value my_value --target http://localhost:8000
```

Deployed environment variables take precedence over `.env` values.

## Recommended Project Structure

Separating server, client, and shared code keeps the codebase readable as it grows:

```
src/
├── index.ts              # Entry point — isServer() branch
├── client/
│   ├── setup.ts          # Input handlers, message senders
│   └── ui.tsx            # React ECS UI (reads synced state)
├── server/
│   ├── server.ts         # Game loop, message handlers, state mutations
│   └── gameState.ts      # Helper functions for server state
└── shared/
    ├── schemas.ts        # Component definitions + validateBeforeChange
    └── messages.ts       # registerMessages() — imported by both sides
```

{% hint style="info" %}
**💡 Tip**: Keep all `registerMessages()` calls and custom component definitions in `shared/`. Both server and client import from there, ensuring they always agree on message schemas.
{% endhint %}

## Performance Best Practices

Every component change sends the *entire* component data over the network. This is different from what Colyseus does, which sends only diffs. When designing custom components, keep this in mind. The optimal solution may be to store data in separate components, based on change frequency.

### ❌ Avoid monolithic components

```typescript
// BAD — changing the score also sends the positions array
const GameState = engine.defineComponent('GameState', {
 playerAScore: Schemas.Int,
 playerBScore: Schemas.Int,
 timer: Schemas.Int,
 playerPositions: Schemas.Array(Schemas.Vector3), // large payload
})
```

### ✅ Prefer atomic components

```typescript
// GOOD — each update is small and independent
const PlayerScore = engine.defineComponent('PlayerScore', {
 playerA: Schemas.Int,
 playerB: Schemas.Int,
})

const GameTimer = engine.defineComponent('GameTimer', {
 secondsLeft: Schemas.Int,
})
```

*Rule of thumb*: group fields that change together and at a similar frequency. Separate fast-changing data (timers, positions) from slow-changing data (scores, configuration).

### Throttle frequent messages

Avoid sending messages on every frame. Batch or throttle where possible:

```typescript
let lastSend = 0
engine.addSystem((dt) => {
 lastSend += dt
 if (lastSend > 0.1) {
  // every 100 ms
  room.send('position', transform.position)
  lastSend = 0
 }
})
```

For example if the server controls a countdown timer, it's not necessary to send updates to all players every second. It's best to have each client calculate passage of time on their own, and have the server broadcast its current state every 30 seconds or so, to ensure consistency.

## Common Pitfalls

### Forgetting validation on server-only state

Without `validateBeforeChange`, clients can write to any component:

```typescript
// ❌ BAD — clients can cheat
const Score = engine.defineComponent('Score', { value: Schemas.Int })

// ✅ GOOD — server-only
Score.validateBeforeChange((v) => v.senderAddress === AUTH_SERVER_PEER_ID)
```

### Trusting client-supplied values

Never let a client dictate its own values for important data like health, score, or position:

```typescript
// ❌ BAD
room.onMessage('setHealth', (data) => {
 player.health = data.health // client controls the value!
})

// ✅ GOOD — server calculates the result
room.onMessage('takeDamage', (data) => {
 const damage = calculateDamage(data.source)
 player.health = Math.max(0, player.health - damage)
})
```

### Sending messages before state sync

Clients must wait until state is synchronized before interacting:

```typescript
import { isStateSyncronized } from '@dcl/sdk/network'

engine.addSystem(() => {
 if (!isStateSyncronized()) return
 // safe to send messages
})
```

### Wait for the server to start up

The server is only active if there's at least one player present in the scene. If nobody's currently there, the server shuts down after a few minutes.

When a first player comes into the scene after a while of inactivity, the server takes a few seconds to start up. Your scene's code should be prepared to have to have to wait for the server to be online. Initial requests to the server should have catch and retry mechanisms to provide resilience.

## Complete Example

A minimal multiplayer counter: click a button, the server increments a synced score. The server persists the counter to `Storage.world` so the value survives server restarts. Remember that the server shuts down when no players are in the scene, so without storage the count would reset to zero every time the scene is left empty of players.

```typescript
import { engine, Schemas } from '@dcl/sdk/ecs'
import { registerMessages, isServer, syncEntity } from '@dcl/sdk/network'
import { AUTH_SERVER_PEER_ID } from '@dcl/sdk/network/message-bus-sync'
import { pointerEventsSystem } from '@dcl/sdk/ecs'
import { Storage } from '@dcl/sdk/server'

// 1. Define messages (shared)
const Messages = {
 increment: Schemas.Map({}),
 stateUpdate: Schemas.Map({
  count: Schemas.Int,
  lastPlayer: Schemas.String,
 }),
}

// 2. Define a server-only component (shared)
const Counter = engine.defineComponent('Counter', {
 value: Schemas.Int,
 lastPlayer: Schemas.String,
})

Counter.validateBeforeChange((v) => v.senderAddress === AUTH_SERVER_PEER_ID)

// 3. Create the room
const room = registerMessages(Messages)

export async function main() {
 if (isServer()) {
  // === SERVER ===

  // Restore the counter from storage in case the server restarted
  const savedCount = await Storage.world.get<string>('counter')
  const savedPlayer = await Storage.world.get<string>('lastPlayer')
  const initialCount = savedCount ? parseInt(savedCount) : 0
  const initialPlayer = savedPlayer ?? 'none'

  const counterEntity = engine.addEntity()
  syncEntity(counterEntity, [Counter.componentId], 1)
  Counter.create(counterEntity, {
   value: initialCount,
   lastPlayer: initialPlayer,
  })

  room.onMessage('increment', async (_data, context) => {
   if (!context) return
   const counter = Counter.getMutable(counterEntity)
   counter.value += 1
   counter.lastPlayer = context.from

   // Persist to storage so the value survives server restarts
   await Storage.world.set('counter', String(counter.value))
   await Storage.world.set('lastPlayer', counter.lastPlayer)

   room.send('stateUpdate', {
    count: counter.value,
    lastPlayer: context.from,
   })
  })
 } else {
  // === CLIENT ===
  const button = engine.addEntity()
  // ... add Transform, MeshRenderer, etc.

  pointerEventsSystem.onPointerDown(button, () => {
   room.send('increment', {})
  })

  room.onMessage('stateUpdate', (data) => {
   console.log(`Count: ${data.count} (last click by ${data.lastPlayer})`)
  })
 }
}
```

## Testing Locally

The standard preview handles everything. When using the auth-server branch of the SDK, the local server starts automatically in the background alongside the client preview.

To test multiplayer interactions locally, open the preview in two separate windows, each window is treated as a separate player. Connect each window with a different address. Both clients will connect to the same local server instance.

Using the Creator Hub, click the Preview button a second time, and that opens a second Decentraland explorer window. You must connect on both windows with different addresses. The same sessions will remain open as the scene reloads.

As an alternative, you can open a second Decentraland explorer window by writing the following into a browser URL:

> `decentraland://realm=http://127.0.0.1:8000&local-scene=true&debug=true`

### Debugging tips

* *Prefix your logs* with `[SERVER]` or `[CLIENT]` so you can tell them apart in the terminal:

  ```typescript
  if (isServer()) {
   console.log('[SERVER] Starting...')
  } else {
   console.log('[CLIENT] Starting...')
  }
  ```

* *Verify component sync* on the client by logging entity counts:

  ```typescript
  engine.addSystem(() => {
   const entities = Array.from(engine.getEntitiesWith(MyComponent))
   console.log('[CLIENT] Synced entities:', entities.length)
  })
  ```

## Debug in Production

To see `console.log()` output from your published server, your wallet address must be listed in the `logsPermissions` array in `scene.json`:

```json
{
 "logsPermissions": ["0xYourWalletAddress"]
}
```

Without this, server logs are hidden in production, even from the scene owner.

Stream live server logs from the command line by running this in your project folder

```bash
npx sdk-commands sdk-server-logs
```

You can also manually specify the world name the logs with:

```bash
npx sdk-commands sdk-server-logs --world WORLD_NAME.dcl.eth
```

You'll be prompted to sign a message with one of the wallets listed in `logsPermissions` to authenticate. Once connected, you'll see server-side `console.log()` output in real time, which is useful for diagnosing issues without needing to redeploy.

### View storage data

You can access the data that is stored by the scene's storage by entering this link:

[decentraland.org/storage](https://decentraland.org/storage)

You can also reach this page via the Creator Hub. Open the **Manage** tab, click the three dots next to a place where you have published content, and select **View server data**.

There you can see a list of all the worlds and land where you can publish scenes.

Open the world or the player data to see the info that's stored for each.

For example if a particular player has an issue when playing your scene, you could look up this player via address, and see what data is stored for them to understand their situation. Maybe they stumbled upon a corner case where they ended up with contradicting data. You can even clear or edit that player's data from this page, to restore them into a stable state.

## Version Control

Every published version of your scene gets its own unique hash ID, and each hash is paired with its own server instance. This means that the client code and the server code always move together, there is no window where a client running old logic talks to a server running new logic (or vice versa).

When you publish an update:

* *Players already in the scene* keep seeing the old version of the scene until they leave and come back. Their clients stay connected to the server instance that matches the old hash.
* *New players arriving* after the update load the new scene version and connect to the new server instance.

This guarantees that client and server state never fall out of sync because of a schema change or a renamed component. An update can never break the session of a player who is already in your scene.

The trade-off is that, for a short window right after a deploy, players can end up split across two different server instances. A player who was already there and a player who just arrived may not see each other or be able to interact via the scene, even though they are in the same scene, until the older players leave and rejoin.

{% hint style="info" %}
**💡 Tip**: Data stored via the [Storage](#data-storage) service (like leaderboards, player progress, or persistent environment changes) is *not* wiped between versions. Storage is persisted at the location level and shared across all server instances that point to the same scene, so new versions pick up right where the previous one left off.
{% endhint %}

## Migrating from Colyseus

If you have an existing scene built on Colyseus, the table below maps common Colyseus patterns to their SDK7 equivalents:

| Colyseus                      | SDK7 Authoritative Server                       |
| ----------------------------- | ----------------------------------------------- |
| `room.send(type, data)`       | `room.send(type, data)` — same API              |
| `room.onMessage(type, cb)`    | `room.onMessage(type, cb)` — same API           |
| `room.state.players` (schema) | `syncEntity` + custom components                |
| JSON serialization            | Binary serialization (automatic via `Schemas`)  |
| Separate server application   | Same codebase — `isServer()` branching          |
| Custom server hosting         | Built-in: preview runs the server automatically |

Key differences to keep in mind:

* *Serialization*: Colyseus sends JSON diffs; the SDK sends the full component on every change. Keep components small (see [Performance Best Practices](#performance-best-practices)).
* *State model*: Colyseus uses a mutable state tree with automatic diffing. The SDK uses ECS components synced via `syncEntity` and protected with `validateBeforeChange`.
* *Hosting*: No separate server deployment. The authoritative server is deployed automatically together with the scene.

---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.decentraland.org/creator/scenes-sdk7/networking/authoritative-servers.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
