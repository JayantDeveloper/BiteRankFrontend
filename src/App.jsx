import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import Navbar from './components/Navbar'
import LocationPrompt from './components/LocationPrompt'
import { LocationProvider, useLocation } from './contexts/LocationContext'
import { authAPI } from './services/api'

function AdminGate({ onLogout }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await authAPI.login(username.trim(), password)
      sessionStorage.setItem('admin_token', data.token)
      window.location.reload()
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hero-bg min-h-screen flex items-center justify-center px-6 py-16">
      <div className="surface-card max-w-sm w-full p-8">
        <h1 className="text-3xl font-extrabold mb-1.5 gradient-text text-center">Admin</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Restricted access</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold section-title mb-1.5">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm" autoComplete="username" />
          </div>
          <div>
            <label className="block text-xs font-bold section-title mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm" autoComplete="current-password" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full btn-gradient-primary px-4 py-2.5 rounded-xl font-bold text-sm btn-glow">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AppContent() {
  const { location, setLocation } = useLocation()
  const [isAdminAuthed, setIsAdminAuthed] = useState(
    () => !!sessionStorage.getItem('admin_token')
  )

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_token')
    setIsAdminAuthed(false)
  }

  if (!location) {
    return (
      <div className="hero-bg min-h-screen">
        <LocationPrompt onLocationSet={setLocation} />
      </div>
    )
  }

  return (
    <div className="hero-bg min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/admin"
          element={
            isAdminAuthed
              ? <AdminPage onLogout={handleAdminLogout} />
              : <AdminGate onLogout={handleAdminLogout} />
          }
        />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </Router>
  )
}
