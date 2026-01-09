import { Link } from 'react-router-dom'
import { useLocation } from '../contexts/LocationContext'

function Navbar() {
  const { location, clearLocation } = useLocation()

  const handleChangeLocation = () => {
    if (confirm('Are you sure you want to change your location? This will reload pricing data.')) {
      clearLocation()
    }
  }

  return (
    <nav className="sticky top-0 z-50 shadow-lg shadow-[#c4423b]/25" style={{ background: 'linear-gradient(135deg, #DC5F54, #c94e45)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <img
                src="/assets/BiteRankLogo.png"
                alt="BiteRank"
                className="h-14 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {location && (
              <button
                onClick={handleChangeLocation}
                className="flex items-center text-white/90 hover:text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-white/10"
                title="Change location"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">{location}</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <Link
              to="/"
              className="text-white/90 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-white/10"
            >
              Home
            </Link>
            <Link
              to="/admin"
              className="relative text-[#1f1204] px-6 py-2 rounded-lg text-sm font-bold btn-glow overflow-hidden transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #F4B942, #FF9B54)', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
