import { memo } from 'react'

import { HomeAside } from '@components/home/HomeAside'
import {
  API_EXPLORER_ENDPOINT_KALSHI_CALENDAR_LIVE,
  CALENDAR_LIVE_POLL_EXTRA_PATHS,
} from '@constants/apiEndpointsConstants'
import { useCalendarLiveExplorerPoll } from '@hooks/useCalendarLiveExplorerPoll'
import type { SportsCalendarLivePayload } from '@typings/calendarLiveTypes'

import { HomeGamesColumn } from './HomeGamesColumn'
import './homePage.css'

function HomePageInner() {
  useCalendarLiveExplorerPoll<SportsCalendarLivePayload>(
    API_EXPLORER_ENDPOINT_KALSHI_CALENDAR_LIVE,
    {
      extraPathnames: CALENDAR_LIVE_POLL_EXTRA_PATHS,
    },
  )

  return (
    <div className="home-page">
      <div className="home-page__grid">
        <div className="home-page__col">
          <HomeGamesColumn />
        </div>
        <section className="home-page__col home-page__aside" aria-label="Orders and aside">
          <HomeAside />
        </section>
      </div>
    </div>
  )
}

export default memo(HomePageInner)
