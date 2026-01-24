import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'

// TypeScript interfaces
interface Location {
  lat: number
  lng: number
  name: string
  type: 'current' | 'pickup' | 'dropoff' | 'fuel' | 'rest'
  time?: string
}

interface RoutePoint {
  0: number
  1: number
}

interface RouteMapProps {
  locations?: Location[]
  route?: RoutePoint[]
}

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const RouteMap: React.FC<RouteMapProps> = ({ locations = [], route = [] }) => {
  const mapRef = useRef<L.Map | null>(null)

  // Default center if no locations provided
  const defaultCenter: [number, number] = [39.8283, -98.5795] // Center of USA
  const defaultZoom = 4

  // Calculate bounds to fit all markers
  const getBounds = (): [number, number][] | null => {
    if (locations.length === 0) return null
    return locations.map(loc => [loc.lat, loc.lng])
  }

  // Create custom icons for different stop types
  const createCustomIcon = (type: Location['type']): L.Icon => {
    const iconConfig = {
      current: { color: '#3B82F6', symbol: '🚛' },
      pickup: { color: '#10B981', symbol: '📦' },
      dropoff: { color: '#EF4444', symbol: '📮' },
      fuel: { color: '#F59E0B', symbol: '⛽' },
      rest: { color: '#8B5CF6', symbol: '🛑' }
    }

    const config = iconConfig[type] || iconConfig.current

    return L.divIcon({
      html: `
        <div style="
          background-color: ${config.color};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <span style="font-size: 16px;">${config.symbol}</span>
        </div>
      `,
      className: 'custom-marker',
      iconSize: [30, 30] as [number, number],
      iconAnchor: [15, 15] as [number, number],
      popupAnchor: [0, -15] as [number, number]
    })
  }

  useEffect(() => {
    if (mapRef.current && locations.length > 0) {
      const map = mapRef.current
      const bounds = getBounds()
      if (bounds) {
        map.fitBounds(bounds, { padding: [50, 50] as [number, number] })
      }
    }
  }, [locations])

  if (!locations || locations.length === 0) {
    return (
      <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="mt-2">No route data available</p>
          <p className="text-sm">Plan a trip to see the route visualization</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={mapRef as any}
        bounds={getBounds() || undefined}
        boundsOptions={{ padding: [50, 50] as [number, number] }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Markers for each location */}
        {locations.map((location, index) => (
          <Marker
            key={index}
            position={[location.lat, location.lng]}
            icon={createCustomIcon(location.type)}
          >
            <Popup>
              <div className="text-sm">
                <strong>{location.name}</strong>
                <br />
                {location.type === 'current' && 'Starting Point'}
                {location.type === 'pickup' && 'Pickup Location'}
                {location.type === 'dropoff' && 'Dropoff Location'}
                {location.type === 'fuel' && 'Fuel Stop'}
                {location.type === 'rest' && 'Rest Stop'}
                {location.time && <br />}
                {location.time && <span className="text-gray-600">Est: {location.time}</span>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route polyline */}
        {route && route.length > 0 && (
          <Polyline
            positions={route.map(point => [point[0], point[1]])}
            color="#3B82F6"
            weight={4}
            opacity={0.7}
            dashArray="10, 5"
          />
        )}
      </MapContainer>
    </div>
  )
}

export default RouteMap