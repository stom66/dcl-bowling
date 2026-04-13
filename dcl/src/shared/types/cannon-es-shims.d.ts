// Stub for DOM types referenced by cannon-es but not available in Decentraland's runtime.
// cannon-es's Heightfield.setHeightsFromImage() requires HTMLImageElement in its signature,
// but we never call it — this just satisfies the type checker.
interface HTMLImageElement {}
