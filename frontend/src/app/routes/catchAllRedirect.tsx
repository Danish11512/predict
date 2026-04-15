import { Navigate } from 'react-router'

export default function CatchAllRedirect() {
  return <Navigate to="/" replace />
}
