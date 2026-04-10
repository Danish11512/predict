/* eslint-disable react-refresh/only-export-components -- route module exports links + layout */
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'

import { rootLinks } from '@app/rootLinks'
import type { RootLayoutProps } from '@typings/rootTypes'
import '@styles/index.css'

export const links = rootLinks

export function Layout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return <Outlet />
}
