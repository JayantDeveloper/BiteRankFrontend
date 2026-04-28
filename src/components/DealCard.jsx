function DealCard({ deal, rank, animationDelay = 0 }) {
  const themeByRestaurant = {
    "McDonald's": { primary: '#FFC72C', secondary: '#DA291C' },
    "KFC":        { primary: '#E4002B', secondary: '#2C2A29' },
    "Taco Bell":  { primary: '#702082', secondary: '#00A7E1' },
  }
  const theme = themeByRestaurant[deal.restaurant_name] || { primary: '#E85D54', secondary: '#FF9B54' }

  const getScoreGradient = (score) => {
    if (score >= 81) return 'linear-gradient(90deg, #1EAD5A, #2ECC71)'
    if (score >= 61) return 'linear-gradient(90deg, #7BC043, #F1C40F)'
    if (score >= 41) return 'linear-gradient(90deg, #F1C40F, #E67E22)'
    if (score >= 21) return 'linear-gradient(90deg, #E67E22, #CC4E00)'
    return 'linear-gradient(90deg, #CC4E00, #A61919)'
  }

  const getScoreColor = (score) => {
    if (score >= 81) return '#1EAD5A'
    if (score >= 61) return '#7BC043'
    if (score >= 41) return '#E67E22'
    if (score >= 21) return '#CC4E00'
    return '#A61919'
  }

  const getScoreLabel = (score) => {
    if (score >= 91) return 'Elite'
    if (score >= 81) return 'Excellent'
    if (score >= 71) return 'Great'
    if (score >= 61) return 'Good'
    if (score >= 51) return 'Fair'
    if (score >= 41) return 'Mixed'
    if (score >= 31) return 'Below Avg'
    if (score >= 21) return 'Poor'
    return 'Bad'
  }

  const score = deal.value_score ?? 0
  const caloriesDisplay = (() => {
    if (deal.calories_range_min && deal.calories_range_max) return `${deal.calories_range_min}–${deal.calories_range_max}`
    if (deal.calories) return `${deal.calories}`
    return null
  })()
  const proteinDisplay = deal.protein_grams > 0 ? `${Math.round(deal.protein_grams)}g` : null

  return (
    <div
      className="surface-card overflow-hidden animate-fade-up"
      style={{
        borderColor: `${theme.primary}44`,
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Rank + restaurant header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
      >
        <span className="text-white font-black text-sm tracking-wide uppercase opacity-90">
          {deal.restaurant_name}
        </span>
        {rank && (
          <span className="text-white font-black text-lg leading-none">#{rank}</span>
        )}
      </div>

      <div className="p-5">
        {/* Name + price */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-slate-900 leading-tight flex-1 mr-4">
            {deal.item_name || deal.name || 'Untitled item'}
          </h3>
          <span
            className="text-2xl font-black whitespace-nowrap"
            style={{ color: theme.primary }}
          >
            ${deal.price.toFixed(2)}
          </span>
        </div>

        {/* Description */}
        {deal.description && (
          <p className="text-slate-500 text-sm mb-3 leading-relaxed">{deal.description}</p>
        )}

        {/* Nutrition stats — plain text, no chips */}
        {(caloriesDisplay || proteinDisplay) && (
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
            {caloriesDisplay && <span>🔥 {caloriesDisplay} cal</span>}
            {caloriesDisplay && proteinDisplay && <span className="text-slate-300">·</span>}
            {proteinDisplay && <span>💪 {proteinDisplay} protein</span>}
          </div>
        )}

        {/* Score bar */}
        <div className="pt-4 stat-divider">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Value Score</span>
            <span
              className="text-sm font-bold"
              style={{ color: getScoreColor(score) }}
            >
              {score.toFixed(0)} · {getScoreLabel(score)}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, score)}%`,
                background: getScoreGradient(score),
                transition: 'width 0.7s ease-out',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DealCard
