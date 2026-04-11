const dev = import.meta.env.DEV

function prefix(args: unknown[]): unknown[] {
  return ['[predict]', ...args]
}

/** Logs only in development; stripped in production builds. */
export const devLog = {
  debug: (...args: unknown[]) => {
    if (dev) console.debug(...prefix(args))
  },
  info: (...args: unknown[]) => {
    if (dev) console.info(...prefix(args))
  },
  warn: (...args: unknown[]) => {
    if (dev) console.warn(...prefix(args))
  },
  error: (...args: unknown[]) => {
    if (dev) console.error(...prefix(args))
  },
}
