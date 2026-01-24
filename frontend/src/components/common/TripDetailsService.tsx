import React, { useState } from 'react'
import { tripService } from '../../services/tripService'
import { ELDLogSheet } from './ELDLogSheet'
import type { Trip } from '../../types'

interface TripDetailsServiceProps {
  trip: Trip
  isOpen: boolean
  onClose: () => void
}

const TripDetailsService: React.FC<TripDetailsServiceProps> = ({ trip, isOpen, onClose }) => {
  const [selectedLogSheet, setSelectedLogSheet] = useState(null)
  const [selectedStop, setSelectedStop] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)

  // Close modal when not open
  useEffect(() => {
    if (!isOpen) {
      setSelectedLogSheet(null)
      setSelectedStop(null)
      setShowNotifications(false)
    }
  }, [isOpen, onClose])

  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  const downloadELD = async () => {
    try {
      const response = await fetch('/api/trips/download-eld/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ trip_id: trip.id }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `eld-logs-${trip.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        console.error('Failed to download ELD logs')
      }
    } catch (error) {
      console.error('Error downloading ELD logs:', error)
    }
  }

  const generateHOSReport = async () => {
    try {
      const response = await fetch('/api/trips/hos-report/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ trip_id: trip.id }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `hos-report-${trip.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        console.error('Failed to generate HOS report')
      }
    } catch (error) {
      console.error('Error generating HOS report:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="bg-white shadow-xl rounded-lg">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Trip Details - {trip.current_location} → {trip.pickup_location} → {trip.dropoff_location}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => downloadELD()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              disabled={!trip.log_sheets || trip.log_sheets.length === 0}
            >
              📄 Download ELD Logs
            </button>
            <button
              onClick={generateHOSReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              disabled={!trip.log_sheets || trip.log_sheets.length === 0}
            >
              📊 Generate HOS Report
            </button>
            
            {showNotifications && (
              <button
                onClick={() => setNotifications([])}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
              >
                ❌ Clear Notifications
              </button>
            )}
          </div>
        </div>

        {/* Basic Trip Info */}
        <div className="mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Trip Information</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-700">Status:</dt>
                <dd className="text-sm text-gray-900">
                  <span className={`px-3 py-1 rounded-full text-white font-medium ${
                    trip.status === 'completed' ? 'bg-green-600' : 
                    trip.status === 'in_progress' ? 'bg-blue-600' : 
                    trip.status === 'cancelled' ? 'bg-red-600' : 
                    'bg-gray-600'
                  }`}>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </span>
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-700">Total Distance:</dt>
                <dd className="text-sm text-gray-900">
                  {trip.total_distance ? `${Math.round(trip.total_distance)} miles` : 'Calculating...'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-700">Estimated Duration:</dt>
                <dd className="text-sm text-gray-900">
                  {trip.estimated_duration ? `${Math.round(trip.estimated_duration)} hours` : 'Calculating...'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-700">Current Cycle Hours:</dt>
                <dd className="text-sm text-gray-900">
                  {trip.current_cycle_hours} hours
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ELD Log Sheets */}
        {trip.log_sheets && trip.log_sheets.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">ELD Log Sheets</h3>
              
              {/* Log Sheet Selection */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {trip.log_sheets.map((logSheet, index) => (
                    <button
                      onClick={() => setSelectedLogSheet(logSheet)}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        selectedLogSheet?.id === logSheet.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {new Date(logSheet.date).toLocaleDateString()}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Selected Log Sheet Details */}
              {selectedLogSheet && (
                <ELDLogSheet 
                  key={selectedLogSheet.id}
                  logSheet={selectedLogSheet}
                />
              )}
            </div>
          </div>
        )}

        {/* Route Stops */}
        {trip.route_stops && trip.route_stops.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Route Stops</h3>
              
              {/* Stop Selection */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {trip.route_stops.map((stop, index) => (
                    <button
                      onClick={() => setSelectedStop(stop)}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        selectedStop?.id === stop.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Stop #{stop.sequence_order}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Selected Stop Details */}
              {selectedStop && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedStop.type.charAt(0).toUpperCase() + selectedStop.type.slice(1)} - Stop #{selectedStop.sequence_order}
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-700">Location:</span>
                      <p className="text-gray-900">{selectedStop.location}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Type:</span>
                      <p className="text-gray-900 capitalize">{selectedStop.stop_type}</p>
                    </div>
                    
                    {selectedStop.estimated_arrival && (
                      <div>
                        <span className="font-medium text-gray-700">Estimated Arrival:</span>
                        <p className="text-gray-900">
                          {new Date(selectedStop.estimated_arrival).toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-700">Estimated Departure:</span>
                      <p className="text-gray-900">
                          {selectedStop.estimated_departure ? 
                            new Date(selectedStop.estimated_departure).toLocaleString() : 
                            'Calculating...'
                          }
                        </p>
                      </div>
                    
                    {selectedStop.duration_minutes > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Duration:</span>
                        <p className="text-gray-900">{selectedStop.duration_minutes} minutes</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg border-l-4 p-4 mb-2 max-w-sm transform transition-all duration-300"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white font-bold">!</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">{notification.title}</p>
                    <p className="text-gray-600 text-sm">{notification.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TripDetailsService