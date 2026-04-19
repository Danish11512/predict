import { useVirtualizer } from '@tanstack/react-virtual'
import { RefreshCw } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { Button } from '@components/ui/button'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import { devLog } from '@shared/lib/devLog'
import { fetchJsonObject } from '@shared/lib/fetchJsonObject'
import type {
  HomeEventSettlementRow,
  KalshiGetEventResponse,
  KalshiGetFillsResponse,
  KalshiGetSettlementsResponse,
} from '@typings/homeSettlementTypes'
import {
  aggregatesToSortedRows,
  mergeFillPage,
  rowDisplayInstant,
  type LatestFillEntry,
  type SettlementAggregateBucket,
  upsertSettlement,
} from '@utils/eventSettlementAggregation'

const SETTLEMENT_PAGE_LIMIT = 100
const FILLS_PAGE_LIMIT = 1000
const EVENTS_PER_FETCH = 50
const ROW_HEIGHT_PX = 118
const SCROLL_LOAD_THRESHOLD_PX = 140

function buildQuery(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) {
      continue
    }
    u.set(k, String(v))
  }
  const q = u.toString()
  return q ? `?${q}` : ''
}

function formatSignedUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  }).format(amount)
}

function formatUsdPlain(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatInstantLocal(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) {
    return '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms))
}

const HomeOrdersPanelInner = memo(function HomeOrdersPanelInner() {
  const aggRef = useRef(new Map<string, SettlementAggregateBucket>())
  const fillMapRef = useRef(new Map<string, LatestFillEntry>())

  const [rows, setRows] = useState<HomeEventSettlementRow[]>([])
  const [settlementCursor, setSettlementCursor] = useState<string | null>(null)
  const [settlementExhausted, setSettlementExhausted] = useState(true)
  const [busy, setBusy] = useState(false)
  const [titles, setTitles] = useState<Record<string, string | null>>({})

  const parentRef = useRef<HTMLDivElement>(null)
  const titleStartedRef = useRef(new Set<string>())
  const loadingMoreRef = useRef(false)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 6,
  })

  const fetchAllFills = useCallback(async (): Promise<Map<string, LatestFillEntry> | null> => {
    const latestByTicker = new Map<string, LatestFillEntry>()
    let cursor: string | undefined
    while (true) {
      const url = toProxiedUrl('/portfolio/fills') + buildQuery({ limit: FILLS_PAGE_LIMIT, cursor })
      const res = await fetchJsonObject<KalshiGetFillsResponse>(url)
      if (!res.ok) {
        devLog.warn('portfolio fills fetch failed', { message: res.message })
        return null
      }
      mergeFillPage(latestByTicker, res.data.fills)
      const next = res.data.cursor?.trim()
      if (!next) {
        break
      }
      cursor = next
    }
    return latestByTicker
  }, [])

  const fetchSettlementGrowth = useCallback(
    async (
      startDistinct: number,
      initialCursor: string | null,
    ): Promise<{ cursor: string | null; done: boolean }> => {
      let cursor: string | null = initialCursor
      const fillMap = fillMapRef.current
      while (true) {
        const url =
          toProxiedUrl('/portfolio/settlements') +
          buildQuery({ limit: SETTLEMENT_PAGE_LIMIT, cursor: cursor ?? undefined })
        const res = await fetchJsonObject<KalshiGetSettlementsResponse>(url)
        if (!res.ok) {
          devLog.warn('portfolio settlements fetch failed', { message: res.message })
          return { cursor: null, done: true }
        }
        for (const s of res.data.settlements) {
          upsertSettlement(aggRef.current, s)
        }
        setRows(aggregatesToSortedRows(aggRef.current, fillMap))
        const nextRaw = res.data.cursor
        const next = typeof nextRaw === 'string' && nextRaw.trim() !== '' ? nextRaw.trim() : null

        const distinct = aggRef.current.size
        const goal = startDistinct + EVENTS_PER_FETCH
        if (distinct >= goal || next === null) {
          return { cursor: next, done: next === null }
        }
        cursor = next
      }
    },
    [],
  )

  const refresh = useCallback(async () => {
    setBusy(true)
    aggRef.current = new Map()
    fillMapRef.current = new Map()
    titleStartedRef.current = new Set()
    setTitles({})
    setRows([])
    setSettlementCursor(null)
    setSettlementExhausted(true)

    const fills = await fetchAllFills()
    if (fills === null) {
      setBusy(false)
      return
    }
    fillMapRef.current = fills

    const { cursor, done } = await fetchSettlementGrowth(0, null)
    setSettlementCursor(cursor)
    setSettlementExhausted(done)
    setBusy(false)
  }, [fetchAllFills, fetchSettlementGrowth])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || busy || settlementExhausted || settlementCursor === null) {
      return
    }
    loadingMoreRef.current = true
    const before = aggRef.current.size
    try {
      const { cursor, done } = await fetchSettlementGrowth(before, settlementCursor)
      setSettlementCursor(cursor)
      setSettlementExhausted(done)
    } finally {
      loadingMoreRef.current = false
    }
  }, [busy, settlementCursor, settlementExhausted, fetchSettlementGrowth])

  const cursorRef = useRef(settlementCursor)
  const exhaustedRef = useRef(settlementExhausted)
  cursorRef.current = settlementCursor
  exhaustedRef.current = settlementExhausted

  useEffect(() => {
    const el = parentRef.current
    if (!el) {
      return
    }
    const onScroll = () => {
      if (loadingMoreRef.current || busy || exhaustedRef.current || cursorRef.current === null) {
        return
      }
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight - scrollTop - clientHeight < SCROLL_LOAD_THRESHOLD_PX) {
        void loadMore()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [busy, loadMore, rows.length])

  useEffect(() => {
    for (const r of rows) {
      if (titleStartedRef.current.has(r.eventTicker)) {
        continue
      }
      titleStartedRef.current.add(r.eventTicker)
      const ticker = r.eventTicker
      const url = `${toProxiedUrl('/events')}/${encodeURIComponent(ticker)}`
      void fetchJsonObject<KalshiGetEventResponse>(url).then((res) => {
        if (!res.ok) {
          setTitles((p) => ({ ...p, [ticker]: null }))
          return
        }
        const title = res.data.event?.title ?? null
        setTitles((p) => ({ ...p, [ticker]: title }))
      })
    }
  }, [rows])

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
          const title = titles[row.eventTicker]
          const label = title === undefined ? row.eventTicker : (title ?? row.eventTicker)
          const signed = formatSignedUsd(row.netUsd)
          const isGain = row.netUsd > 0
          const isLoss = row.netUsd < 0
          const { ms: displayMs, source: timeSource } = rowDisplayInstant(row)
          return (
            <article
              key={row.eventTicker}
              className="home-orders__row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
              aria-label={`${row.eventTicker} settlement row`}
            >
              <div className="home-orders__row-title">{label}</div>
              <div className="home-orders__row-meta">
                <span className="home-orders__mono">{row.eventTicker}</span>
                <span
                  className="home-orders__settlement-payout"
                  aria-label={`Settlement payout total ${formatUsdPlain(row.grossPayoutUsd)}`}
                  title="Sum of settlement payouts (API revenue) for this event"
                >
                  {formatUsdPlain(row.grossPayoutUsd)}
                </span>
              </div>
              <time
                className="home-orders__row-order-time"
                dateTime={displayMs != null ? new Date(displayMs).toISOString() : undefined}
                title={
                  timeSource === 'settlement'
                    ? 'Market settlement time (fill not in live portfolio history)'
                    : undefined
                }
              >
                {formatInstantLocal(displayMs)}
                {timeSource === 'settlement' && displayMs != null ? (
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
                {signed}
              </div>
            </article>
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

export const HomeOrdersPanel = memo(HomeOrdersPanelInner)
