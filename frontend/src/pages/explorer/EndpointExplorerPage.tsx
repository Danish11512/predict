import { memo, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router'

import { EndpointResponsePanel } from '@components/explorer/EndpointResponsePanel'
import { API_EXPLORER_ENDPOINT_BY_PATHNAME } from '@constants/apiEndpointsConstants'
import { devLog } from '@shared/lib/devLog'
import { normalizeAppPathname } from '@utils/explorerNavPathUtils'

function EndpointExplorerPage() {
  const location = useLocation()
  const endpoint = useMemo(
    () => API_EXPLORER_ENDPOINT_BY_PATHNAME.get(normalizeAppPathname(location.pathname)),
    [location.pathname],
  )

  useEffect(() => {
    if (endpoint === undefined) {
      devLog.warn('unknown explorer route', { pathname: location.pathname })
    }
  }, [endpoint, location.pathname])

  if (endpoint === undefined) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Unknown route: <code>{location.pathname}</code>
      </p>
    )
  }

  return <EndpointResponsePanel key={endpoint.id} endpoint={endpoint} />
}

export default memo(EndpointExplorerPage)
