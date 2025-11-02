import { useState } from 'react'

function LocationPrompt({ onLocationSet }) {
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const validateLocation = (loc) => {
    if (!loc || loc.trim().length < 2) {
      return 'Please enter a valid location'
    }
    // Check if it's a ZIP code (5 digits) or a city name (at least 2 characters)
    const zipPattern = /^\d{5}(-\d{4})?$/
    const cityPattern = /^[a-zA-Z\s,.-]+$/

    if (!zipPattern.test(loc.trim()) && !cityPattern.test(loc.trim())) {
      return 'Please enter a valid ZIP code or city name'
    }

    return null
  }

  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Using Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'DealScout/1.0',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Geocoding failed')
      }

      const data = await response.json()

      // Extract the most relevant location info
      const address = data.address || {}

      // Prefer ZIP code if available, otherwise use city and state
      if (address.postcode) {
        return address.postcode
      } else if (address.city && address.state) {
        return `${address.city}, ${address.state}`
      } else if (address.town && address.state) {
        return `${address.town}, ${address.state}`
      } else if (address.county && address.state) {
        return `${address.county}, ${address.state}`
      } else {
        // Fallback to display name
        return data.display_name.split(',').slice(0, 2).join(',').trim()
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err)
      throw new Error('Failed to get location name')
    }
  }

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const locationName = await reverseGeocode(latitude, longitude)
          setLocation(locationName)
          setIsGettingLocation(false)
        } catch (err) {
          setError('Failed to get your location. Please enter it manually.')
          setIsGettingLocation(false)
        }
      },
      (error) => {
        setIsGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Location permission denied. Please enter your location manually.')
            break
          case error.POSITION_UNAVAILABLE:
            setError('Location information unavailable. Please enter your location manually.')
            break
          case error.TIMEOUT:
            setError('Location request timed out. Please enter your location manually.')
            break
          default:
            setError('An error occurred while getting your location. Please enter it manually.')
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationError = validateLocation(location)

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    onLocationSet(location.trim())
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border-3 border-[#ffb8a8] p-8 max-w-md w-full mx-4 shadow-2xl shadow-[#b45343]/20">
        <div className="text-center mb-8">
          <div className="mb-4 flex items-center justify-center">
            <img
              src="/assets/BiteRankLogo.png"
              alt="BiteRank"
              className="h-16 w-auto"
            />
            <span className="ml-2 text-xs font-bold text-white bg-gradient-to-r from-[#FFC107] to-[#FFD54F] px-2 py-1 rounded-full shadow-md">
              AI
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#2d1f1c] mb-2">
            Welcome!
          </h2>
          <p className="text-[#6b5b58]">
            Enter your location to find the best food deals near you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-[#6b5b58] mb-2 uppercase tracking-wide">
              Your Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
                setError('')
              }}
              className={`block w-full px-4 py-4 bg-[#fff5f0] border-2 ${
                error ? 'border-red-500' : 'border-[#ffb8a8]'
              } rounded-lg text-[#2d1f1c] placeholder-[#9d8d8a] focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-30 transition-all text-lg`}
              placeholder="e.g., 20742 or College Park, MD"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
            <p className="mt-2 text-xs text-[#9d8d8a] flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              We use this to show accurate pricing from Uber Eats and other delivery services
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="w-full bg-white border-2 border-[#ffb8a8] text-[#b45343] px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#fff5f0] hover:border-[#b45343] hover:shadow-lg hover:shadow-[#b45343]/20 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGettingLocation ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Getting location...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Use Current Location</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[#9d8d8a]">Or</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn-gradient-primary text-white px-8 py-4 rounded-lg font-bold text-lg btn-glow hover:shadow-lg hover:shadow-[#b45343]/50 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Continue</span>
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#9d8d8a]">
            Your location is only used to fetch accurate pricing and is stored locally in your browser
          </p>
        </div>
      </div>
    </div>
  )
}

export default LocationPrompt
