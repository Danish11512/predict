import { memo, useCallback, useEffect } from 'react'
import { MenuIcon } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { Button } from '@components/ui/button'
import { ScrollArea } from '@components/ui/scrollArea'
import { Separator } from '@components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@components/ui/sheet'
import { API_EXPLORER_ENDPOINTS } from '@constants/apiEndpointsConstants'
import { useExplorerUiStore } from '@stores/explorerUiStore'
import '@styles/explorerLayout.css'
import {
  getExplorerSheetSubtitle,
  isExplorerSheetRouteActive,
  normalizeAppPathname,
} from '@utils/explorerNavPathUtils'

function ExplorerLayoutInner() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeExplorerPath = useExplorerUiStore((s) => s.activeExplorerPath)
  const setActiveExplorerPath = useExplorerUiStore((s) => s.setActiveExplorerPath)

  useEffect(() => {
    setActiveExplorerPath(normalizeAppPathname(location.pathname))
  }, [location.pathname, setActiveExplorerPath])

  const onSelectPath = useCallback(
    (path: string) => {
      setActiveExplorerPath(path)
      void navigate(path)
    },
    [navigate, setActiveExplorerPath],
  )

  return (
    <div className="explorer-shell">
      <header className="explorer-shell__header">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Open endpoint menu">
              <MenuIcon className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="explorer-shell__sheet p-0">
            <SheetHeader className="explorer-shell__sheet-head border-b px-4 py-3 text-left">
              <SheetTitle className="text-base">API endpoints</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-4rem)]">
              <nav className="flex flex-col gap-0.5 p-2" aria-label="API endpoints">
                <button
                  type="button"
                  className={
                    isExplorerSheetRouteActive(activeExplorerPath, '/')
                      ? 'explorer-shell__nav-item explorer-shell__nav-item--active'
                      : 'explorer-shell__nav-item'
                  }
                  onClick={() => onSelectPath('/')}
                >
                  Home
                </button>
                {API_EXPLORER_ENDPOINTS.map((ep) => {
                  const href = `/${ep.routerPath}`
                  const isActive = isExplorerSheetRouteActive(activeExplorerPath, href)
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      className={
                        isActive
                          ? 'explorer-shell__nav-item explorer-shell__nav-item--active'
                          : 'explorer-shell__nav-item'
                      }
                      onClick={() => onSelectPath(href)}
                    >
                      {ep.label}
                    </button>
                  )
                })}
              </nav>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        <div className="explorer-shell__title-block">
          <h1 className="explorer-shell__title">Predict API explorer</h1>
          <p className="explorer-shell__subtitle">{getExplorerSheetSubtitle(activeExplorerPath)}</p>
        </div>
      </header>
      <Separator />
      <main className="explorer-shell__main">
        <Outlet />
      </main>
    </div>
  )
}

export default memo(ExplorerLayoutInner)
