# Querying Components

You can [query components](/creator/scenes-sdk7/architecture/querying-components.md) with the method `engine.getEntitiesWith(...components)` to keep track of all entities in the scene that have certain components.

[Systems](/creator/scenes-sdk7/architecture/systems.md) typically iterate over the entities in these queries, performing the same operations on each. Having a predefined group of valid entities is a great way to save resources, specially for functions that run on every tick of the game loop. If on every tick your system would have to iterate over every single entity in the scene looking for the ones it needs, that would be very inefficient.

You can access the entities in a query in the following way.

```ts
for (const [entity] of engine.getEntitiesWith(Transform)) {
 //...
}
```

## Required components

When making a query, specify what components need to be present in every entity that's added to the group. You can list as many components as you want, the query will only return entities that have **all** of the listed components.

```ts
for (const [entity] of engine.getEntitiesWith(
 Transform,
 Physics,
 NextPosition
)) {
 //...
}
```

{% hint style="info" %}
**💡 Tip**: If your query returns entities that you don't need to deal with, consider creating a custom component to act as a [flag](/creator/scenes-sdk7/architecture/entities-components.md#components-as-flags). This component doesn't need to have any properties in it, but can be used to mark a specific subgroup of entities that you might want to treat differently.
{% endhint %}

## Use queries in a system

```ts
// Define a System
function PhysicsSystem(dt: number) {

  // query for entities that include both a Transform and a Physics component
  for (const [entity] of engine.getEntitiesWith(Transform, Physics)) {
    const transform = Transform.getMutable(entity)
 cons vel = Physics.get(entity).velocity
 position.x += vel.x
 position.y += vel.y
 position.z += vel.z

  }
}

// Add the system to the engine
engine.addSystem(rotationSystem)

```

In the example above, the `PhysicsSystem` function iterates over the entities in the query, that is executed on every tick of the game loop.

* If the scene has several *ball* entities, each with a `Position` and a `Physics` component, then they will be handled, and their position will be updated on each tick.
* If your scene also has other entities, for example a *hoop* and a *scoreBoard* that only have a `Transform` but not a `Physics` component, then they won't be affected by `PhysicsSystem`.

## Dealing with the entities and components

The `getEntitiesWith` function returns a collection, that includes references to a set of entities and can also optionally include references to the listed components.

Using the simplest syntax, you fetch only a list of references to the corresponding entities.

```ts
const [entity] of engine.getEntitiesWith(myComponent, myOtherComponent)
```

While iterating on this list of entities, you can then fetch read-only or mutable versions of their components, by using `.get` or `getMutable`.

```ts
for (const [entity] of engine.getEntitiesWith(Transform)) {
 //get read-only version
 const transformReadOnly = Transform.get(entity)

 // get mutable version
 const transformMutable = Transform.getMutable(entity)
}
```

You can optionally also fetch references to each of the listed components directly on as part of the collection returned by the query. To do this, simply declare multiple references together, one for each component you want to fetch. Adding these references is optional, and you don't need to declare references to *all* the components in the query either.

```ts
// returns references to the entity and the first listed component
for (const [entity, component1] of engine.getEntitiesWith(
 MyCustomComponent1,
 MyCustomComponent2
)) {
 // iterate over list of entities
}

// returns references to the entity and the first two listed components
for (const [entity, component1, component2] of engine.getEntitiesWith(
 MyCustomComponent1,
 MyCustomComponent2
)) {
 // iterate over list of entities
}
```

{% hint style="warning" %}
**📔 Note**: These references are read-only. To fetch mutable versions of those components, you need to use the `.getMutable` function referencing the entity.
{% endhint %}

You can then refer to these references as you iterate over the collection of results, in each entry you'll have access to the entity and its corresponding component references.

```ts
for (const [entity, transformReadOnly] of engine.getEntitiesWith(Transform)) {
 console.log('entity id: ', entity)
 console.log('has position : ', transformReadOnly.position)
}
```

## Subscribe to changes

A common use case is to only run a function in case the data in a certain component changes. Use the [OnChange](/creator/scenes-sdk7/architecture/subscribe-to-changes.md) function to avoid having to define a system and having to explicitly compare old values with new values.

---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.decentraland.org/creator/scenes-sdk7/architecture/querying-components.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
