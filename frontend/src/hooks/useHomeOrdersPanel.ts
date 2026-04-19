import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_FILLS,
  API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_SETTLEMENTS,
  KALSHI_EVENTS_PROXY_PATH,
} from '@constants/apiEndpointsConstants'
import {
  HOME_ORDERS_EVENTS_PER_FETCH,
  HOME_ORDERS_FILLS_PAGE_LIMIT,
  HOME_ORDERS_ROW_HEIGHT_PX,
  HOME_ORDERS_SCROLL_LOAD_THRESHOLD_PX,
  HOME_ORDERS_SETTLEMENT_PAGE_LIMIT,
} from '@constants/homeOrdersConstants'
import { toProxiedUrl } from '@shared/lib/apiProxy'
import { devLog } from '@shared/lib/devLog'
import { fetchJsonObject } from '@shared/lib/fetchJsonObject'
import type {
  HomeEventSettlementRow,
  KalshiGetEventResponse,
  KalshiGetFillsResponse,
  KalshiGetSettlementsResponse,
} from '@typings/homeSettlementTypes'
import { buildQueryString } from '@utils/httpQueryString'
import {
  aggregatesToSortedRows,
  mergeFillPage,
  type LatestFillEntry,
  type SettlementAggregateBucket,
  upsertSettlement,
} from '@utils/eventSettlementAggregation'

export function useHomeOrdersPanel() {
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
    estimateSize: () => HOME_ORDERS_ROW_HEIGHT_PX,
    overscan: 6,
  })

  const fetchAllFills = useCallback(async (): Promise<Map<string, LatestFillEntry> | null> => {
    const latestByTicker = new Map<string, LatestFillEntry>()
    let cursor: string | undefined
    while (true) {
      const url =
        toProxiedUrl(API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_FILLS.proxyPath) +
        buildQueryString({ limit: HOME_ORDERS_FILLS_PAGE_LIMIT, cursor })
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
          toProxiedUrl(API_EXPLORER_ENDPOINT_KALSHI_PORTFOLIO_SETTLEMENTS.proxyPath) +
          buildQueryString({
            limit: HOME_ORDERS_SETTLEMENT_PAGE_LIMIT,
            cursor: cursor ?? undefined,
          })
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
        const goal = startDistinct + HOME_ORDERS_EVENTS_PER_FETCH
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
      if (scrollHeight - scrollTop - clientHeight < HOME_ORDERS_SCROLL_LOAD_THRESHOLD_PX) {
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
      const url = `${toProxiedUrl(KALSHI_EVENTS_PROXY_PATH)}/${encodeURIComponent(ticker)}`
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

  return {
    rows,
    titles,
    busy,
    parentRef,
    virtualizer,
    refresh,
  }
}
