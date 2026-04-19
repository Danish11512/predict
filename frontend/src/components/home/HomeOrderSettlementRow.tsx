import { memo, type CSSProperties } from 'react'

import type { HomeEventSettlementRow } from '@typings/homeSettlementTypes'

export type HomeOrderSettlementRowProps = {
  row: HomeEventSettlementRow
  titleLabel: string
  grossPayoutDisplay: string
  signedPnlDisplay: string
  timeDisplay: string
  timeDateTimeIso: string | undefined
  timeTitle: string | undefined
  showSettledNote: boolean
  style?: CSSProperties
}

export const HomeOrderSettlementRow = memo(function HomeOrderSettlementRow({
  row,
  titleLabel,
  grossPayoutDisplay,
  signedPnlDisplay,
  timeDisplay,
  timeDateTimeIso,
  timeTitle,
  showSettledNote,
  style,
}: HomeOrderSettlementRowProps) {
  const isGain = row.netUsd > 0
  const isLoss = row.netUsd < 0

  return (
    <article
      className="home-orders__row"
      style={style}
      aria-label={`${row.eventTicker} settlement row`}
    >
      <div className="home-orders__row-title">{titleLabel}</div>
      <div className="home-orders__row-meta">
        <span className="home-orders__mono">{row.eventTicker}</span>
        <span
          className="home-orders__settlement-payout"
          aria-label={`Settlement payout total ${grossPayoutDisplay}`}
          title="Sum of settlement payouts (API revenue) for this event"
        >
          {grossPayoutDisplay}
        </span>
      </div>
      <time className="home-orders__row-order-time" dateTime={timeDateTimeIso} title={timeTitle}>
        {timeDisplay}
        {showSettledNote ? (
          <span className="home-orders__row-order-time-note"> · settled</span>
        ) : null}
      </time>
      <div
        className={
          isGain
            ? 'home-orders__pnl home-orders__pnl--gain'
            : isLoss
              ? 'home-orders__pnl home-orders__pnl--loss'
              : 'home-orders__pnl'
        }
      >
        {signedPnlDisplay}
      </div>
    </article>
  )
})
