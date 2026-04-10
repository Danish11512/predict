/** Single 1s ticker so components can derive “seconds ago” without Date.now() in render. */

const wallClock = {
  nowMs: 0,
  listeners: new Set<() => void>(),
}

function tick() {
  wallClock.nowMs = Date.now()
  wallClock.listeners.forEach((l) => {
    l()
  })
}

if (typeof window !== 'undefined') {
  wallClock.nowMs = Date.now()
  window.setInterval(tick, 1000)
}

export function subscribeWallClockMs(cb: () => void): () => void {
  wallClock.nowMs = Date.now()
  wallClock.listeners.add(cb)
  return () => {
    wallClock.listeners.delete(cb)
  }
}

export function getWallClockMsSnapshot(): number {
  return wallClock.nowMs
}

export function getWallClockMsServerSnapshot(): number {
  return 0
}
