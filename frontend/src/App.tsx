import { useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  status: string
  kalshi_credentials_configured: boolean
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json() as Promise<HealthResponse>
      })
      .then(setHealth)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Request failed')
      })
  }, [])

  return (
    <main className="app-shell">
      <h1>Predict</h1>
      <p>
        Fullstack scaffold: Bun, Vite, React, and FastAPI. Kalshi REST and
        WebSocket wiring comes next; credentials stay on the server only.
      </p>
      <section aria-live="polite">
        <h2>API via Vite proxy</h2>
        <p>
          The dev server proxies <code>/api/*</code> to{' '}
          <code>http://127.0.0.1:8000</code>.
        </p>
        {error !== null ? <p role="alert">{error}</p> : null}
        {health !== null ? (
          <pre>{JSON.stringify(health, null, 2)}</pre>
        ) : null}
        {health === null && error === null ? <p>Loading…</p> : null}
      </section>
    </main>
  )
}

export default App
