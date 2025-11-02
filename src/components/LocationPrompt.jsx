import { useState } from "react";

function LocationPrompt({ onLocationSet }) {
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const validateLocation = (loc) => {
    if (!loc || loc.trim().length < 2) {
      return "Please enter a valid location";
    }
    const zipPattern = /^\d{5}(-\d{4})?$/;
    const cityPattern = /^[a-zA-Z\s,.-]+$/;
    if (!zipPattern.test(loc.trim()) && !cityPattern.test(loc.trim())) {
      return "Please enter a valid ZIP code or city name";
    }
    return null;
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            "User-Agent": "BiteRank/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding failed");
      }

      const data = await response.json();
      const address = data.address || {};

      if (address.postcode) {
        return address.postcode;
      } else if (address.city && address.state) {
        return `${address.city}, ${address.state}`;
      } else if (address.town && address.state) {
        return `${address.town}, ${address.state}`;
      } else if (address.county && address.state) {
        return `${address.county}, ${address.state}`;
      } else {
        return data.display_name.split(",").slice(0, 2).join(",").trim();
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      throw new Error("Failed to get location name");
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const locationName = await reverseGeocode(latitude, longitude);
          setLocation(locationName);
          setIsGettingLocation(false);
        } catch (err) {
          setError("Failed to get your location. Please enter it manually.");
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError(
              "Location permission denied. Please enter your location manually."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setError(
              "Location information unavailable. Please enter your location manually."
            );
            break;
          case error.TIMEOUT:
            setError(
              "Location request timed out. Please enter your location manually."
            );
            break;
          default:
            setError(
              "An error occurred while getting your location. Please enter it manually."
            );
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateLocation(location);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    onLocationSet(location.trim());
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-16">
      <div className="surface-card max-w-lg w-full mx-auto p-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-3 gradient-text">
            BiteRank
          </h1>
          <p className="text-slate-300">
            Tell us where you are so we can fetch local prices from Uber Eats
            and other delivery services.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold section-title mb-2">
              Your Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setError("");
              }}
              className={`block w-full px-4 py-4 bg-black/25 border ${
                error
                  ? "border-red-500/70 focus:border-red-400 focus:ring-red-500/30"
                  : "border-slate-700/50 focus:border-[#ff6b35] focus:ring-[#ff6b35]/35"
              } rounded-lg text-slate-100 placeholder-slate-500 transition-all text-lg focus:ring-2`}
              placeholder="e.g., 20742 or College Park, MD"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-400 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400 flex items-center">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              We use this to show accurate pricing from Uber Eats and other
              delivery services
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="w-full surface-soft border border-slate-600 px-8 py-4 rounded-lg font-bold text-lg text-slate-200 hover:border-[#ff6b35] hover:shadow-lg hover:shadow-[#ff6b35]/30 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGettingLocation ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Getting location...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Use Current Location</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/40"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-slate-500">Or</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn-gradient-primary text-white px-8 py-4 rounded-lg font-bold text-lg btn-glow hover:shadow-lg hover:shadow-[#ff6b35]/60 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Continue</span>
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Your location is stored locally so we can fetch prices nearby. You
            can update it anytime from the header.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LocationPrompt;
