import { useState, useEffect } from 'react'
import RouteMap from '../map/RouteMap'
import ELDLogSheet from './ELDLogSheet'
import { tripService } from '../../services/tripService'

const TripDetails = ({ trip }) => {
  const [activeTab, setActiveTab] = useState('route')
  const [tripLogs, setTripLogs] = useState([])
  const [tripStops, setTripStops] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch trip logs and stops when trip data is available
  useEffect(() => {
    if (trip?.id) {
      fetchTripDetails()
    }
  }, [trip?.id])

  const fetchTripDetails = async () => {
    setLoading(true)
    try {
      // Fetch logs and stops in parallel
      const [logsResult, stopsResult] = await Promise.all([
        tripService.getTripLogs(trip.id),
        tripService.getTripStops(trip.id)
      ])

      if (logsResult.success) {
        setTripLogs(logsResult.logs || [])
      }

      if (stopsResult.success) {
        setTripStops(stopsResult.stops || [])
      }
    } catch (error) {
      console.error('Failed to fetch trip details:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format locations from API stops data
  const formatLocations = () => {
    if (tripStops.length > 0) {
      return tripStops.map(stop => ({
        lat: stop.latitude,
        lng: stop.longitude,
        name: stop.location_name,
        type: stop.stop_type,
        time: stop.estimated_time,
        sequence: stop.sequence_order
      }))
    }

    // Fallback to legacy format if stops not available
    return trip.locations || []
  }

  // Format route from API stops data
  const formatRoute = () => {
    if (tripStops.length > 0) {
      return tripStops
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map(stop => [stop.latitude, stop.longitude])
    }

    // Fallback to legacy format if stops not available
    return trip.route || []
  }

  // Prepare ELD data from API logs
  const prepareELDData = () => {
    if (tripLogs.length > 0) {
      // Use the first log sheet for display
      const logSheet = tripLogs[0]
      return {
        date: logSheet.date,
        driver: logSheet.driver_name || 'Driver',
        carrier: logSheet.carrier_name || 'Carrier',
        truckNumber: logSheet.truck_number || '',
        homeTerminal: trip.current_location,
        shippingDocs: trip.shipping_docs || '',
        totalMiles: trip.total_distance || '0',
        entries: logSheet.entries || []
      }
    }

    // Fallback to mock data if no logs available
    return {
      date: new Date().toLocaleDateString('en-US'),
      driver: 'Driver',
      carrier: 'Carrier',
      truckNumber: '',
      homeTerminal: trip.current_location,
      shippingDocs: '',
      totalMiles: trip.total_distance || '0',
      entries: []
    }
  }

  const locations = formatLocations()
  const route = formatRoute()
  const eldData = prepareELDData()

  const tabs = [
    { id: 'route', label: 'Route Map', icon: '🗺️' },
    { id: 'logs', label: 'ELD Logs', icon: '📋' },
    { id: 'stops', label: 'Stops', icon: '🛑' }
  ]

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'route' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Route Visualization</h3>
            <RouteMap locations={locations} route={route} />
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Distance</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {trip.total_distance ? `${Math.round(trip.total_distance)} miles` : 'Calculating...'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Duration</h4>
                <p className="text-2xl font-bold text-green-600">
                  {trip.estimated_duration || 'Calculating...'}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900">Fuel Stops</h4>
                <p className="text-2xl font-bold text-yellow-600">
                  {tripStops.filter(s => s.stop_type === 'fuel').length || 
                   locations.filter(l => l.type === 'fuel').length || '0'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">ELD Log Sheets</h3>
              <p className="text-gray-600">
                FMCSA compliant electronic logging device logs for this trip.
              </p>
            </div>
            
            <ELDLogSheet logData={eldData} />
            
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Hours of Service Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Driving Hours:</span>
                  <span className="ml-2 font-medium">11.0</span>
                </div>
                <div>
                  <span className="text-gray-600">On-Duty Hours:</span>
                  <span className="ml-2 font-medium">14.0</span>
                </div>
                <div>
                  <span className="text-gray-600">Cycle Used:</span>
                  <span className="ml-2 font-medium">{trip.current_cycle_hours} hrs</span>
                </div>
                <div>
                  <span className="text-gray-600">Cycle Remaining:</span>
                  <span className="ml-2 font-medium">{70 - parseFloat(trip.current_cycle_hours)} hrs</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stops' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Route Stops</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading stops...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {locations.length > 0 ? locations.map((location, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      location.type === 'current' ? 'bg-blue-500' :
                      location.type === 'pickup' ? 'bg-green-500' :
                      location.type === 'dropoff' ? 'bg-red-500' :
                      location.type === 'fuel' ? 'bg-yellow-500' :
                      'bg-purple-500'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {location.name}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.type === 'current' ? 'bg-blue-100 text-blue-800' :
                        location.type === 'pickup' ? 'bg-green-100 text-green-800' :
                        location.type === 'dropoff' ? 'bg-red-100 text-red-800' :
                        location.type === 'fuel' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {location.type === 'current' ? 'Start' :
                         location.type === 'pickup' ? 'Pickup' :
                         location.type === 'dropoff' ? 'Dropoff' :
                         location.type === 'fuel' ? 'Fuel' :
                         'Rest Stop'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {location.time && `Estimated arrival: ${location.time}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {location.type === 'pickup' && '1 hour for pickup and loading'}
                      {location.type === 'dropoff' && '1 hour for dropoff and paperwork'}
                      {location.type === 'fuel' && '30 minutes for fueling'}
                      {location.type === 'rest' && '30-minute break after 8 hours driving'}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  No stops available for this trip
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TripDetails