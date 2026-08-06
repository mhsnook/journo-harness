// The Plan: its schema, its Scope resolution, and its word-count arithmetic.
// Pure modules with no Worker and no React, so both sides of the socket import
// the same rules — `validateStateChange` in the Article Agent, the Plan Panel in
// the client, and `generateObject` when the Chat proposes.

export * from './schema'
export * from './scope'
export * from './word-count'
