import { engine, Schemas } from '@dcl/sdk/ecs'
import { AUTH_SERVER_PEER_ID } from '@dcl/sdk/network/message-bus-sync'

// Server pulses it every HEARTBEAT_MS. The room can look ready while the server is still
// cold-booting, so clients open a Question only after seeing this value advance.
export const ServerHeartbeat = engine.defineComponent('feedback::Heartbeat', {
  beatAt: Schemas.Int64
})

// Server only: clients must accept the server's writes.
export function registerValidators(): void {
  ServerHeartbeat.validateBeforeChange(
    (value) => value.senderAddress.toLowerCase() === AUTH_SERVER_PEER_ID.toLowerCase()
  )
}
