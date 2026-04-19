import { RefreshCw } from 'lucide-react'
import { memo, type ReactNode } from 'react'

import { Button } from '@components/ui/button'
import { useHomeOrdersPanel } from '@hooks/useHomeOrdersPanel'
import type { HomeEventSettlementRow } from '@typings/homeSettlementTypes'
import { rowDisplayInstant } from '@utils/eventSettlementAggregation'
import { formatInstantLocal, formatSignedUsd, formatUsdPlain } from '@utils/homeOrdersDisplayFormat'

import { HomeOrderSettlementRow, type HomeOrderSettlementRowProps } from './HomeOrderSettlementRow'

import './homeOrdersPanel.css'

function buildSettlementRowProps(
  row: HomeEventSettlementRow,
  titles: Record<string, string | null>,
): Omit<HomeOrderSettlementRowProps, 'style'> {
  const title = titles[row.eventTicker]
  const titleLabel = title === undefined ? row.eventTicker : (title ?? row.eventTicker)
  const signed = formatSignedUsd(row.netUsd)
  const { ms: displayMs, source: timeSource } = rowDisplayInstant(row)
  const showSettledNote = timeSource === 'settlement' && displayMs != null

  return {
    row,
    titleLabel,
    grossPayoutDisplay: formatUsdPlain(row.grossPayoutUsd),
    signedPnlDisplay: signed,
    timeDisplay: formatInstantLocal(displayMs),
    timeDateTimeIso: displayMs != null ? new Date(displayMs).toISOString() : undefined,
    timeTitle:
      timeSource === 'settlement'
        ? 'Market settlement time (fill not in live portfolio history)'
        : undefined,
    showSettledNote,
  }
}

export const HomeOrdersPanel = memo(function HomeOrdersPanel() {
  const { rows, titles, busy, parentRef, virtualizer, refresh } = useHomeOrdersPanel()

  const virtualItems = virtualizer.getVirtualItems()
  let listContent: ReactNode = null
  if (rows.length > 0) {
    listContent = (
      <div
        className="home-orders__virtual-root"
        style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
      >
        {virtualItems.map((vi) => {
          const row = rows[vi.index]
          if (row === undefined) {
            return null
          }

          return (
            <HomeOrderSettlementRow
              key={row.eventTicker}
              {...buildSettlementRowProps(row, titles)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="home-orders">
      <div className="home-orders__toolbar">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={busy}
          aria-busy={busy}
        >
          <RefreshCw className={busy ? 'animate-spin' : ''} aria-hidden />
          Refresh
        </Button>
      </div>
      <div ref={parentRef} className="home-orders__scroll" tabIndex={0}>
        {listContent}
      </div>
    </div>
  )
})
