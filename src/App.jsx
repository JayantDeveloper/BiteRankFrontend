import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import Navbar from './components/Navbar'
import LocationPrompt from './components/LocationPrompt'
import { LocationProvider, useLocation } from './contexts/LocationContext'

const ADMIN_USER = 'jaym'
const ADMIN_PASS = 'tintin10!'

function AppContent() {
  const { location, setLocation } = useLocation()
  const [isAdminAuthed, setIsAdminAuthed] = useState(
    () => localStorage.getItem('admin_authed') === 'true'
  )

  useEffect(() => {
    // ensure storage stays in sync if cleared
    if (!isAdminAuthed) {
      localStorage.removeItem('admin_authed')
    }
  }, [isAdminAuthed])

  const handleAdminLogin = (username, password, remember) => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setIsAdminAuthed(true)
      if (remember) {
        localStorage.setItem('admin_authed', 'true')
      }
      return { success: true }
    }
    return { success: false, error: 'Invalid credentials' }
  }

  const handleAdminLogout = () => {
    setIsAdminAuthed(false)
    localStorage.removeItem('admin_authed')
  }

  const AdminGate = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [remember, setRemember] = useState(true)

    const onSubmit = (e) => {
      e.preventDefault()
      const res = handleAdminLogin(username.trim(), password, remember)
      if (!res.success) {
        setError(res.error)
      }
    }

    return (
      <div className="bg-canvas min-h-screen flex items-center justify-center px-6 py-16">
        <div className="surface-card max-w-md w-full p-8">
          <h1 className="text-3xl font-extrabold mb-2 gradient-text text-center">Admin</h1>
          <p className="text-sm text-slate-600 text-center mb-6">Restricted tools</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold section-title mb-2">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-[#E85D54] focus:ring-[#E85D54]/30 focus:ring-2 transition-all shadow-sm"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold section-title mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-[#E85D54] focus:ring-[#E85D54]/30 focus:ring-2 transition-all shadow-sm"
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-slate-300 text-[#E85D54] focus:ring-[#E85D54]"
                />
                <span>Remember</span>
              </label>
              <button
                type="submit"
                className="btn-gradient-primary text-white px-5 py-2 rounded-lg font-bold btn-glow"
              >
                Sign in
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>
      </div>
    )
  }

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
        <Route
          path="/admin"
          element={
            isAdminAuthed ? (
              <AdminPage onLogout={handleAdminLogout} />
            ) : (
              <AdminGate />
            )
          }
        />
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
