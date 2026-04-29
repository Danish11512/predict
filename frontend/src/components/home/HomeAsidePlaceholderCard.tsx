import { memo } from 'react'

import { useHomeThresholdStore } from '@stores/homeThresholdStore'

export const HomeAsidePlaceholderCard = memo(function HomeAsidePlaceholderCard() {
  const threshold = useHomeThresholdStore((s) => s.threshold)
  const setThreshold = useHomeThresholdStore((s) => s.setThreshold)

  return (
    <div className="home-aside__placeholder-card home-games__article">
      {/* Form 1 — Threshold */}
      <div className="home-aside__form-label">Threshold</div>
      <div className="home-aside__slider-row">
        <input
          type="range"
          className="home-aside__slider"
          min={1}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
        />
        <div className="home-aside__form-value">{threshold}%</div>
      </div>
    </div>
  )
})
