import { Navigate } from 'react-router'

import { DEFAULT_EXPLORER_PATH } from '@constants/apiEndpointsConstants'

export default function IndexRedirect() {
  return <Navigate to={DEFAULT_EXPLORER_PATH} replace />
}
