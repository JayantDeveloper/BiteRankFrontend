import { useEffect } from 'react'

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

function ScoreRow({ label, value, max = 100, color }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600 font-medium">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function DealDetail({ deal, onClose }) {
  const theme = RESTAURANT_THEMES[deal.restaurant_name] || { color: '#E85D54', accent: '#FF9B54' }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const ppc = deal.price_per_calorie > 0
    ? `${(deal.price_per_calorie * 100).toFixed(2)}¢ / calorie`
    : '—'
  const ppp = deal.protein_grams > 0
    ? `$${(deal.price / deal.protein_grams).toFixed(2)} / gram`
    : '—'

  return (
    <>
      <div className="overlay-bg" onClick={onClose} />
      <div className="slide-over">
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-5 flex items-start justify-between gap-4"
          style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.accent})` }}
        >
          <div>
            <div className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">
              {deal.restaurant_name}
            </div>
            <h2 className="text-white text-xl font-black leading-tight">{deal.item_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Price row */}
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black" style={{ color: theme.color }}>
              ${deal.price.toFixed(2)}
            </span>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-0.5">Value Score</div>
              <div className="text-2xl font-black text-gray-900">{(deal.value_score ?? 0).toFixed(0)}<span className="text-sm font-normal text-gray-400">/100</span></div>
            </div>
          </div>

          {/* Description */}
          {deal.description && (
            <p className="text-sm text-gray-600 leading-relaxed bg-[#FFF8F0] rounded-xl p-4">
              {deal.description}
            </p>
          )}

          {/* Scores breakdown */}
          <div>
            <h3 className="label mb-4">Score Breakdown</h3>
            <div className="space-y-4">
              <ScoreRow label="Overall Value" value={deal.value_score ?? 0} color={theme.color} />
              {deal.satiety_score > 0 && (
                <ScoreRow label="Satiety (filling-ness)" value={deal.satiety_score} color="#10b981" />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Score = 40% satiety + 60% price efficiency vs. a $9 / 800 cal typical meal.
            </p>
          </div>

          <hr className="divider" />

          {/* Nutrition */}
          <div>
            <h3 className="label mb-4">Nutrition</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Calories',   value: deal.calories ? `${deal.calories}` : '—',                  unit: 'kcal'  },
                { label: 'Protein',    value: deal.protein_grams > 0 ? `${Math.round(deal.protein_grams)}` : '—', unit: 'g' },
                { label: '$/calorie',  value: ppc,                                                          unit: ''      },
                { label: '$/protein',  value: ppp,                                                          unit: ''      },
              ].map(({ label, value, unit }) => (
                <div key={label} className="bg-[#FFF8F0] rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-1">{label}</div>
                  <div className="text-lg font-black text-gray-900">
                    {value}
                    {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="divider" />

          {/* Meta */}
          <div>
            <h3 className="label mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              {deal.category && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-semibold">{deal.category}</span>
                </div>
              )}
              {deal.deal_type && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-semibold">{deal.deal_type}</span>
                </div>
              )}
              {deal.location && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Location</span>
                  <span className="font-semibold">{deal.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
