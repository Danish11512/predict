import { memo } from 'react'

import { useCalendarLiveExplorerPoll } from '@hooks/useCalendarLiveExplorerPoll'
import {
  CALENDAR_LIVE_SPORTS_POLL_EXTRA_PATHS,
  KALSHI_CALENDAR_LIVE_SPORTS_ENDPOINT,
} from '@constants/apiEndpointsConstants'
import type { SportsCalendarLivePayload } from '@typings/calendarLiveTypes'

import { HomeGamesColumn } from './HomeGamesColumn'
import './homePage.css'

function HomePageInner() {
  useCalendarLiveExplorerPoll<SportsCalendarLivePayload>(KALSHI_CALENDAR_LIVE_SPORTS_ENDPOINT, {
    extraPathnames: CALENDAR_LIVE_SPORTS_POLL_EXTRA_PATHS,
  })

  return (
    <div className="home-page">
      <div className="home-page__grid">
        <div className="home-page__col">
          <HomeGamesColumn />
        </div>
        <section className="home-page__col home-page__aside" aria-label="Side panel reserved" />
      </div>
    </div>
  )
}

export default memo(HomePageInner)
