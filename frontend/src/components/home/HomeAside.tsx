import { memo } from 'react'

import { HomeAsidePlaceholderCard } from './HomeAsidePlaceholderCard'
import { HomeOrdersPanel } from './HomeOrdersPanel'

import './homeAside.css'

export const HomeAside = memo(function HomeAside() {
  return (
    <div className="home-aside">
      <HomeAsidePlaceholderCard />
      <div className="home-aside__orders">
        <HomeOrdersPanel />
      </div>
    </div>
  )
})
