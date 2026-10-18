import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

// Payloads must be Schemas.Map and stay under ~13 KB: bigger messages drop silently, hence MAX_COMMENT_LENGTH.
// Prefixed names: the room registry is shared with the rest of the scene.
export const Messages = {
  // client → server, one Response. rating 0 = none. requestId dedupes resends.
  feedbackSubmit: Schemas.Map({
    requestId: Schemas.String,
    questionId: Schemas.String,
    trigger: Schemas.String,
    rating: Schemas.Int,
    comment: Schemas.String,
    commentShown: Schemas.Boolean,
    secondsInScene: Schemas.Int,
    platform: Schemas.String
  }),

  // server → sender: ok once buffered for Storage
  feedbackSaved: Schemas.Map({ requestId: Schemas.String, ok: Schemas.Boolean }),

  // LOCAL PATCH (bowling): client asks once per visit. Server answers from player storage.
  feedbackPriorQuery: Schemas.Map({ requestId: Schemas.String }),
  feedbackPrior: Schemas.Map({ requestId: Schemas.String, given: Schemas.Boolean })
}

export const room = registerMessages(Messages)
