import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { dealsAPI } from '../services/api'

export default function LocationPrompt({ onLocationSet }) {
  const navigate = useNavigate()
  const [location, setLocation]             = useState('')
  const [error, setError]                   = useState('')
  const [isGettingLocation, setIsGetting]   = useState(false)
  const [suggestions, setSuggestions]       = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const blurRef = useRef(null)

  const validate = (loc) => {
    const t = (loc || '').trim()
    if (!t || t.length < 2) return 'Enter a ZIP (e.g. 10001) or City, ST (e.g. New York, NY)'
    const zip  = /^\d{5}(-\d{4})?$/
    const city = /^[A-Za-z][A-Za-z\s.'-]+,\s*(?:[A-Za-z]{2}|[A-Za-z\s.'-]+)$/
    if (!zip.test(t) && !city.test(t)) return 'Use ZIP (12345) or City, ST format'
    return null
  }

  const reverseGeocode = async (lat, lon) => {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`, { headers: { 'User-Agent': 'BiteRank/1.0' } })
    const d = await r.json()
    const a = d.address || {}
    if (a.postcode) return a.postcode
    if (a.city && a.state) return `${a.city}, ${a.state}`
    if (a.town && a.state) return `${a.town}, ${a.state}`
    return d.display_name.split(',').slice(0, 2).join(',').trim()
  }

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    setIsGetting(true); setError('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const name = await reverseGeocode(latitude, longitude)
          setLocation(name)
        } catch { setError('Failed to get location name. Enter manually.') }
        finally { setIsGetting(false) }
      },
      () => { setError('Location denied. Enter manually.'); setIsGetting(false) },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const err = validate(location)
    if (err) { setError(err); return }
    setError('')
    onLocationSet(location.trim())
    navigate('/')
  }

  const selectSuggestion = (label) => {
    setLocation(label)
    setSuggestions([])
    setShowSuggestions(false)
    if (!validate(label)) { onLocationSet(label.trim()); navigate('/') }
  }

  useEffect(() => {
    if (!showSuggestions || !location || location.trim().length < 2) { setSuggestions([]); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const { data } = await dealsAPI.suggestLocations(location.trim(), 6)
        if (!ctrl.signal.aborted) setSuggestions(Array.isArray(data) ? data : [])
      } catch { /* ignore */ }
    }, 250)
    return () => { ctrl.abort(); clearTimeout(t) }
  }, [location, showSuggestions])

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/assets/BiteRankLogo.png" alt="BiteRank" className="h-20 w-auto" />
          </div>
          <h1 className="text-4xl font-black gradient-text mb-2">BiteRank</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Fast food deals, ranked by actual value.<br />
            <span className="text-gray-400">Tell us where you are to get started.</span>
          </p>
        </div>

        <div className="card p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location input */}
            <div className="relative">
              <label className="label mb-1.5 block">Your Location</label>
              <input
                type="text"
                value={location}
                onChange={e => { setLocation(e.target.value); setError('') }}
                onFocus={() => { clearTimeout(blurRef.current); setShowSuggestions(true) }}
                onBlur={() => { blurRef.current = setTimeout(() => setShowSuggestions(false), 150) }}
                placeholder="ZIP or City, ST — e.g. 20742 or College Park, MD"
                autoFocus
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ borderColor: error ? '#f87171' : undefined }}
              />
              {error && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1.5 w-full bg-white border rounded-xl shadow-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  {suggestions.map(s => (
                    <button key={`${s.label}-${s.latitude}`} type="button"
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-[#FFF1E0] transition-colors flex items-center gap-2"
                      onMouseDown={() => selectSuggestion(s.label)}>
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Use current location */}
            <button type="button" onClick={useCurrentLocation} disabled={isGettingLocation}
              className="w-full btn-ghost px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {isGettingLocation ? (
                <>
                  <svg className="w-4 h-4 spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Getting location…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Use My Current Location
                </>
              )}
            </button>

            <div className="relative flex items-center">
              <div className="flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
              <span className="px-3 text-xs text-gray-400">or</span>
              <div className="flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
            </div>

            <button type="submit"
              className="w-full btn-primary px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              See Deals Near Me
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Location used only to find nearby Uber Eats prices.
        </p>
      </div>
    </div>
  )
}
