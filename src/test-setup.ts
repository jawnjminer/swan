// Test environment shims. The tween engine uses requestAnimationFrame, which
// isn't present in the node test environment. A minimal setTimeout-based
// polyfill lets the fireEvent/tween paths run under vitest.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 16) as unknown as number) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) =>
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>)) as typeof cancelAnimationFrame
}
