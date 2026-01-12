import { createContext, useContext, useState } from 'react'

const LocationContext = createContext()

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(() => {
    return localStorage.getItem('userLocation') || null
  })

  const setLocation = (newLocation) => {
    setLocationState(newLocation)
    if (newLocation) {
      localStorage.setItem('userLocation', newLocation)
    } else {
      localStorage.removeItem('userLocation')
    }
  }

  const clearLocation = () => {
    setLocation(null)
  }

  return (
    <LocationContext.Provider value={{ location, setLocation, clearLocation }}>
      {children}
    </LocationContext.Provider>
  )
}
