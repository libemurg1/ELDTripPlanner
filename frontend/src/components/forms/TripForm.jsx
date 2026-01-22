import { useState } from 'react'

const TripForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_hours: ''
  })

  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}

    if (!formData.current_location.trim()) {
      newErrors.current_location = 'Current location is required'
    }

    if (!formData.pickup_location.trim()) {
      newErrors.pickup_location = 'Pickup location is required'
    }

    if (!formData.dropoff_location.trim()) {
      newErrors.dropoff_location = 'Dropoff location is required'
    }

    const cycleHours = parseFloat(formData.current_cycle_hours)
    if (!formData.current_cycle_hours || isNaN(cycleHours) || cycleHours < 0 || cycleHours > 70) {
      newErrors.current_cycle_hours = 'Must be a number between 0 and 70'
    }

    return newErrors
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const formErrors = validateForm()
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }

    onSubmit({
      ...formData,
      current_cycle_hours: parseFloat(formData.current_cycle_hours)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Trip Details</h2>
        
        <div className="space-y-4">
          {/* Current Location */}
          <div>
            <label htmlFor="current_location" className="block text-sm font-medium text-gray-700">
              Current Location
            </label>
            <input
              type="text"
              name="current_location"
              id="current_location"
              value={formData.current_location}
              onChange={handleInputChange}
              placeholder="e.g., Chicago, IL"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.current_location
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {errors.current_location && (
              <p className="mt-1 text-sm text-red-600">{errors.current_location}</p>
            )}
          </div>

          {/* Pickup Location */}
          <div>
            <label htmlFor="pickup_location" className="block text-sm font-medium text-gray-700">
              Pickup Location
            </label>
            <input
              type="text"
              name="pickup_location"
              id="pickup_location"
              value={formData.pickup_location}
              onChange={handleInputChange}
              placeholder="e.g., Indianapolis, IN"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.pickup_location
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {errors.pickup_location && (
              <p className="mt-1 text-sm text-red-600">{errors.pickup_location}</p>
            )}
          </div>

          {/* Dropoff Location */}
          <div>
            <label htmlFor="dropoff_location" className="block text-sm font-medium text-gray-700">
              Dropoff Location
            </label>
            <input
              type="text"
              name="dropoff_location"
              id="dropoff_location"
              value={formData.dropoff_location}
              onChange={handleInputChange}
              placeholder="e.g., Atlanta, GA"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.dropoff_location
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {errors.dropoff_location && (
              <p className="mt-1 text-sm text-red-600">{errors.dropoff_location}</p>
            )}
          </div>

          {/* Current Cycle Hours */}
          <div>
            <label htmlFor="current_cycle_hours" className="block text-sm font-medium text-gray-700">
              Current Cycle Hours Used
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="current_cycle_hours"
                id="current_cycle_hours"
                value={formData.current_cycle_hours}
                onChange={handleInputChange}
                placeholder="0.0"
                step="0.1"
                min="0"
                max="70"
                className={`block w-full rounded-md pr-12 sm:text-sm ${
                  errors.current_cycle_hours
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500 sm:text-sm">hours</span>
              </div>
            </div>
            {errors.current_cycle_hours && (
              <p className="mt-1 text-sm text-red-600">{errors.current_cycle_hours}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Hours used in your current 70-hour/8-day cycle
            </p>
          </div>
        </div>
      </div>

      {/* HOS Information */}
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Hours of Service Rules</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 70-hour maximum in 8-day cycle</li>
          <li>• 11-hour driving limit per day</li>
          <li>• 14-hour on-duty limit per day</li>
          <li>• 30-minute break after 8 hours of driving</li>
          <li>• 10-hour minimum rest period</li>
        </ul>
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            loading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Planning Trip...
            </div>
          ) : (
            'Plan Trip'
          )}
        </button>
      </div>
    </form>
  )
}

export default TripForm