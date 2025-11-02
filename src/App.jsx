import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import Navbar from './components/Navbar'
import LocationPrompt from './components/LocationPrompt'
import { LocationProvider, useLocation } from './contexts/LocationContext'

function AppContent() {
  const { location, setLocation } = useLocation()

  if (!location) {
    return (
      <div className="bg-canvas min-h-screen">
        <LocationPrompt onLocationSet={setLocation} />
      </div>
    )
  }

  return (
    <div className="bg-canvas min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <Router>
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </Router>
  )
}

export default App
