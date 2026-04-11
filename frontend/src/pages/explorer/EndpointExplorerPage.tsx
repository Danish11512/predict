import { memo, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router'

import { EndpointResponsePanel } from '@components/explorer/EndpointResponsePanel'
import { getEndpointByPathname } from '@constants/apiEndpointsConstants'
import { devLog } from '@shared/lib/devLog'

function EndpointExplorerPage() {
  const location = useLocation()
  const endpoint = useMemo(() => getEndpointByPathname(location.pathname), [location.pathname])

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
