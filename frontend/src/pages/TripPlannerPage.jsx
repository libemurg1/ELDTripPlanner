import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TripForm from '../components/forms/TripForm'
import TripDetails from '../components/common/TripDetails'
import { tripService } from '../services/tripService'
import { useAuth } from '../context/AuthContext'

const TripPlannerPage = () => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [tripPlan, setTripPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  const handleTripSubmit = async (tripData) => {
    if (!isAuthenticated) {
      setError('Please log in to plan a trip.')
      navigate('/login')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Validate trip data using service
      const validation = tripService.validateTripData(tripData)
      if (!validation.isValid) {
        setError(validation.errors.join(', '))
        setLoading(false)
        return
      }

      // Call backend API to plan trip
      const result = await tripService.planTrip(tripData)
      
      if (result.success) {
        setTripPlan(result.trip)
      } else {
        setError(result.error || 'Failed to plan trip. Please try again.')
      }
      
    } catch (err) {
      console.error('Trip planning error:', err)
      setError('Failed to plan trip. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-8">
            Please log in to access the trip planning feature.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Plan Your Trip</h1>
        <p className="mt-2 text-gray-600">
          Enter your trip details to generate a compliant route and ELD logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trip Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <TripForm onSubmit={handleTripSubmit} loading={loading} />
        </div>

        {/* Results/Map Section */}
        <div className="space-y-6">
          {loading && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Planning your trip...</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {tripPlan && !loading && (
            <TripDetails trip={tripPlan} />
          )}

          {!loading && !tripPlan && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No trip planned yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Fill out the form to see your route and ELD logs here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TripPlannerPage