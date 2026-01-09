function DealCard({ deal, rank }) {
  const themeByRestaurant = {
    "McDonald's": { primary: '#FFC72C', secondary: '#DA291C', accent: '#1A1A1A' },
    "KFC": { primary: '#E4002B', secondary: '#FFFFFF', accent: '#2C2A29' },
    "Taco Bell": { primary: '#702082', secondary: '#00A7E1', accent: '#FFFFFF' },
  }
  const theme = themeByRestaurant[deal.restaurant_name] || { primary: '#E85D54', secondary: '#F4B942', accent: '#FF9B54' }
  const priceColor = deal.restaurant_name === 'KFC'
    ? theme.primary
    : (theme.accent === '#FFFFFF' ? theme.primary : theme.secondary)

  const getScoreGradient = (score) => {
    if (score >= 91) return 'linear-gradient(135deg, #0B6E3F, #1EAD5A)'
    if (score >= 81) return 'linear-gradient(135deg, #1EAD5A, #2ECC71)'
    if (score >= 71) return 'linear-gradient(135deg, #2ECC71, #7BC043)'
    if (score >= 61) return 'linear-gradient(135deg, #7BC043, #B5CC18)'
    if (score >= 51) return 'linear-gradient(135deg, #B5CC18, #F1C40F)'
    if (score >= 41) return 'linear-gradient(135deg, #F1C40F, #E67E22)'
    if (score >= 31) return 'linear-gradient(135deg, #E67E22, #CC4E00)'
    if (score >= 21) return 'linear-gradient(135deg, #CC4E00, #A61919)'
    if (score >= 11) return 'linear-gradient(135deg, #A61919, #7A0D0D)'
    return 'linear-gradient(135deg, #7A0D0D, #7A0D0D)'
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
    if (score >= 11) return 'Very Poor'
    return 'Bad'
  }

  const caloriesDisplay = (() => {
    if (deal.calories_range_min && deal.calories_range_max) {
      return `${deal.calories_range_min} - ${deal.calories_range_max} Cal`
    }
    if (deal.calories) return `${deal.calories} Cal`
    return null
  })()

  const proteinDisplay = (() => {
    if (deal.protein_grams && deal.protein_grams > 0) {
      return `${deal.protein_grams.toFixed(1)} g protein`
    }
    return null
  })()

  return (
    <div
      className="surface-card overflow-hidden card-hover transition-all duration-300"
      style={{
        borderColor: `${theme.primary}55`,
        boxShadow: `0 14px 38px rgba(0,0,0,0.12)`,
        background: `linear-gradient(145deg, ${theme.primary}10, ${theme.secondary}0f), #ffffff`,
      }}
    >
      {rank && (
        <div
          className="px-4 py-3 font-black text-xl flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            color: '#ffffff',
          }}
        >
          <span>#{rank}</span>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight tracking-tight">
              {deal.item_name || deal.name || 'Untitled item'}
            </h3>
            <p className="text-sm font-semibold flex items-center" style={{ color: theme.primary }}>
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {deal.restaurant_name}
            </p>
          </div>
          <div className="text-right ml-4">
            <div
              className="text-3xl font-black whitespace-nowrap drop-shadow-lg"
              style={{ color: priceColor }}
            >
              ${deal.price.toFixed(2)}
            </div>
          </div>
        </div>

        {deal.description && (
          <p className="text-slate-600 mb-4 text-sm leading-relaxed">
            {deal.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {caloriesDisplay && (
            <span className="chip orange">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a1 1 0 011-1h10a1 1 0 011 1v14l-6-3-6 3V3z" />
              </svg>
              {caloriesDisplay}
            </span>
          )}
          {proteinDisplay && (
            <span className="chip blue">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.93 6.588a1 1 0 011.14 0l3.2 2.286c.63.451.63 1.44 0 1.89l-3.2 2.286a1 1 0 01-1.14 0L5.73 10.764a1 1 0 010-1.89l3.2-2.286z" clipRule="evenodd" />
              </svg>
              {proteinDisplay}
            </span>
          )}
          {deal.portion_size && (
            <span className="chip orange">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
              {deal.portion_size}
            </span>
          )}
          {deal.category && (
            <span className="chip blue">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              {deal.category}
            </span>
          )}
          {/* Only show deal type if manually set; skip auto tags */}
          {deal.deal_type && deal.deal_type !== 'Uber Eats Menu' && (
            <span className="chip purple">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>
              {deal.deal_type}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 stat-divider">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 font-medium">Value Score</span>
            <span
              className="text-sm font-bold px-4 py-1.5 rounded-full shadow-sm"
              style={{
                background: getScoreGradient(deal.value_score),
                color: '#0a0a0a',
              }}
            >
              {deal.value_score.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs font-semibold text-slate-500">
              {getScoreLabel(deal.value_score)}
            </span>
            {deal.value_score >= 90 && (
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DealCard
