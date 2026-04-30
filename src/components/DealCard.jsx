const RESTAURANT_THEMES = {
  "McDonald's":  { color: '#DA291C', accent: '#FFC72C' },
  "KFC":         { color: '#F40027', accent: '#2C2A29' },
  "Taco Bell":   { color: '#702082', accent: '#00A7E1' },
  "Burger King": { color: '#D62300', accent: '#F5EBDC' },
  "Wendy's":     { color: '#E2231A', accent: '#1C4E9A' },
  "Chick-fil-A": { color: '#E51636', accent: '#004F2D' },
  "Subway":      { color: '#00833D', accent: '#FFC907' },
  "Popeyes":     { color: '#E8671F', accent: '#FFC107' },
}

function getScoreInfo(score) {
  if (score >= 91) return { label: 'Elite',     cls: 'score-elite', bar: '#10b981' }
  if (score >= 81) return { label: 'Excellent', cls: 'score-elite', bar: '#10b981' }
  if (score >= 71) return { label: 'Great',     cls: 'score-great', bar: '#34d399' }
  if (score >= 61) return { label: 'Good',      cls: 'score-good',  bar: '#fbbf24' }
  if (score >= 51) return { label: 'Fair',      cls: 'score-fair',  bar: '#f59e0b' }
  if (score >= 41) return { label: 'Average',   cls: 'score-below', bar: '#f97316' }
  return                   { label: 'Poor',     cls: 'score-below', bar: '#ef4444' }
}

export function DealCard({ deal, rank, animationDelay = 0, onClick }) {
  const theme = RESTAURANT_THEMES[deal.restaurant_name] || { color: '#E85D54', accent: '#FF9B54' }
  const score = deal.value_score ?? 0
  const info = getScoreInfo(score)
  const ppc = deal.price_per_calorie > 0
    ? `${(deal.price_per_calorie * 100).toFixed(1)}¢/cal`
    : null

  return (
    <div
      className="card fade-up cursor-pointer overflow-hidden"
      style={{ animationDelay: `${animationDelay}ms`, borderLeft: `4px solid ${theme.color}` }}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rank && (
            <span
              className="text-xs font-black text-white px-2 py-0.5 rounded-full"
              style={{ background: rank === 1 ? 'linear-gradient(135deg,#f5a623,#F4B942)' : theme.color, color: rank === 1 ? '#1c1000' : '#fff' }}
            >
              #{rank}
            </span>
          )}
          <span className="text-xs font-bold" style={{ color: theme.color }}>
            {deal.restaurant_name}
          </span>
        </div>
        <span className={`score-badge ${info.cls}`}>{info.label}</span>
      </div>

      {/* Name + price */}
      <div className="px-4 pb-2">
        <h3 className="text-base font-bold leading-snug text-gray-900 mb-2 line-clamp-2">
          {deal.item_name}
        </h3>
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-black" style={{ color: theme.color }}>
            ${deal.price.toFixed(2)}
          </span>
          {ppc && <span className="text-xs text-gray-400 font-medium mb-0.5">{ppc}</span>}
        </div>
      </div>

      {/* Nutrition */}
      {(deal.calories || deal.protein_grams > 0) && (
        <div className="px-4 pb-3 flex gap-1.5 overflow-hidden">
          {deal.calories && (
            <span className="stat-chip flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              {deal.calories} cal
            </span>
          )}
          {deal.protein_grams > 0 && (
            <span className="stat-chip flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {Math.round(deal.protein_grams)}g pro
            </span>
          )}
        </div>
      )}

      {/* Score bar */}
      <div className="px-4 pb-4">
        <div className="score-bar-track">
          <div className="score-bar-fill" style={{ width: `${Math.min(100, score)}%`, background: `linear-gradient(90deg, ${theme.color}cc, ${info.bar})` }} />
        </div>
      </div>
    </div>
  )
}

export function HeroDealCard({ deal, onClick }) {
  const theme = RESTAURANT_THEMES[deal.restaurant_name] || { color: '#E85D54', accent: '#FF9B54' }
  const score = deal.value_score ?? 0
  const info = getScoreInfo(score)
  const ppc = deal.price_per_calorie > 0
    ? `${(deal.price_per_calorie * 100).toFixed(1)}¢/cal`
    : null

  return (
    <div
      className="card-hero fade-up cursor-pointer overflow-hidden relative"
      style={{ borderLeft: `6px solid ${theme.color}` }}
      onClick={onClick}
    >
      {/* Gradient wash background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${theme.color}10 0%, transparent 60%)` }}
      />

      {/* Top badge row */}
      <div className="relative px-6 pt-5 pb-0 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black px-3 py-1.5 rounded-full tracking-wide"
            style={{ background: 'linear-gradient(135deg,#f5a623,#F4B942)', color: '#1c1000', boxShadow: '0 2px 8px rgba(244,185,66,0.45)' }}>
            🏆 #1 Best Value
          </span>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.color }}>
            {deal.restaurant_name}
          </span>
        </div>
        <span className={`score-badge ${info.cls}`}>{info.label} · {score.toFixed(0)}</span>
      </div>

      {/* Main content */}
      <div className="relative px-6 pt-3 pb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight flex-1">
            {deal.item_name}
          </h2>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-black" style={{ color: theme.color }}>
              ${deal.price.toFixed(2)}
            </div>
            {ppc && <div className="text-xs text-gray-400 font-medium mt-0.5">{ppc}</div>}
          </div>
        </div>

        {deal.description && (
          <p className="text-sm text-gray-500 mb-4 leading-relaxed line-clamp-2">{deal.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {deal.calories && (
            <span className="stat-chip">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              {deal.calories} cal
            </span>
          )}
          {deal.protein_grams > 0 && (
            <span className="stat-chip">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {Math.round(deal.protein_grams)}g protein
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto hidden sm:block font-medium">Tap for details →</span>
        </div>

        <div className="mt-4 score-bar-track" style={{ height: '7px' }}>
          <div className="score-bar-fill" style={{ width: `${Math.min(100, score)}%`, background: `linear-gradient(90deg, ${theme.color}, ${info.bar})` }} />
        </div>
      </div>
    </div>
  )
}

export default DealCard
