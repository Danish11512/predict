import { useEffect, useRef } from 'react'

export function useVisibleInterval(callback: () => void, intervalMs: number, enabled = true): void {
  const cbRef = useRef(callback)

  useEffect(() => {
    cbRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) {
      return
    }
    const run = () => {
      if (document.visibilityState === 'visible') {
        cbRef.current()
      }
    }
    run()
    const id = window.setInterval(run, intervalMs)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        cbRef.current()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs, enabled])
}
