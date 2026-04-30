import { useState } from 'react'
import { Link, useLocation as useRouterLocation } from 'react-router-dom'
import { useLocation } from '../contexts/LocationContext'

export default function Navbar() {
  const { location, clearLocation } = useLocation()
  const routerLocation = useRouterLocation()
  const [confirming, setConfirming] = useState(false)

  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <img src="/assets/BiteRankLogo.png" alt="BiteRank" className="h-10 w-auto group-hover:scale-105 transition-transform duration-200" />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Location pill */}
            {location && !confirming && (
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="max-w-[120px] truncate text-left hidden sm:block">{location}</span>
                <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}

            {/* Confirm change */}
            {confirming && (
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <span className="text-white text-xs font-semibold hidden sm:inline">Change location?</span>
                <button onClick={() => { setConfirming(false); clearLocation() }}
                  className="text-xs font-bold text-white bg-white/25 hover:bg-white/40 px-2.5 py-0.5 rounded-full transition-colors">
                  Yes
                </button>
                <button onClick={() => setConfirming(false)}
                  className="text-xs font-medium text-white/70 hover:text-white px-1.5 py-0.5 rounded-full transition-colors">
                  No
                </button>
              </div>
            )}

            {/* Home link (only on non-home pages) */}
            {routerLocation.pathname !== '/' && (
              <Link to="/" className="text-white/80 hover:text-white text-sm font-semibold px-3 py-1.5 rounded-full hover:bg-white/10 transition-all">
                Home
              </Link>
            )}

            {/* Admin */}
            <Link
              to="/admin"
              className="text-sm font-black px-4 py-1.5 rounded-full transition-all"
              style={{ background: 'linear-gradient(135deg,#F4B942,#FF9B54)', color: '#1f1204', boxShadow: '0 4px 14px rgba(244,185,66,0.4)' }}
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
