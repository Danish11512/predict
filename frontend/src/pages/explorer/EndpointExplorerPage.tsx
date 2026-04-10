import { memo, useMemo } from 'react'
import { useLocation } from 'react-router'

import { EndpointResponsePanel } from '@components/explorer/EndpointResponsePanel'
import { getEndpointByPathname } from '@constants/apiEndpointsConstants'

function EndpointExplorerPage() {
  const location = useLocation()
  const endpoint = useMemo(() => getEndpointByPathname(location.pathname), [location.pathname])

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
