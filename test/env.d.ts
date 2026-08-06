declare module 'cloudflare:test' {
  // Gives `env` in tests the same bindings the Worker sees.
  interface ProvidedEnv extends Env {}
}
