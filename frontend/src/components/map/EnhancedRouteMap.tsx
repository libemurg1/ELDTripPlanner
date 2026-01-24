import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import type { RouteStop, Trip } from "../../types";
import { trackingService } from "../../services/trackingService";

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface EnhancedRouteMapProps {
  trip?: Trip;
  stops?: RouteStop[];
  route?: [number, number][];
  showRealTimeTracking?: boolean;
  height?: string;
  className?: string;
}

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitBounds: () => void;
  onToggleFullscreen: () => void;
  onToggleTraffic: () => void;
  showTraffic: boolean;
}

interface RouteInfoProps {
  totalDistance: number;
  estimatedDuration: number;
  fuelStops: number;
  restStops: number;
  currentProgress?: number;
}

// Map controls component
const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitBounds,
  onToggleFullscreen,
  onToggleTraffic,
  showTraffic,
}) => {
  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2 space-y-2">
      <button
        onClick={onZoomIn}
        className="w-10 h-10 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
        title="Zoom in"
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
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>

      <button
        onClick={onZoomOut}
        className="w-10 h-10 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
        title="Zoom out"
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
            d="M20 12H4"
          />
        </svg>
      </button>

      <button
        onClick={onFitBounds}
        className="w-10 h-10 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center"
        title="Fit route to screen"
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
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>

      <button
        onClick={onToggleFullscreen}
        className="w-10 h-10 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center justify-center"
        title="Toggle fullscreen"
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
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>

      <button
        onClick={onToggleTraffic}
        className={`w-10 h-10 rounded transition-colors flex items-center justify-center ${
          showTraffic
            ? "bg-orange-600 text-white hover:bg-orange-700"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="Toggle traffic layer"
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </button>
    </div>
  );
};

// Route information component
const RouteInfo: React.FC<RouteInfoProps> = ({
  totalDistance,
  estimatedDuration,
  fuelStops,
  restStops,
  currentProgress,
}) => {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <h4 className="font-semibold text-gray-900 mb-2">Route Information</h4>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Distance:</span>
          <span className="font-medium">{totalDistance.toFixed(1)} miles</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Est. Duration:</span>
          <span className="font-medium">
            {estimatedDuration.toFixed(1)} hours
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Fuel Stops:</span>
          <span className="font-medium">{fuelStops}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Rest Stops:</span>
          <span className="font-medium">{restStops}</span>
        </div>

        {currentProgress !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Progress:</span>
              <span className="font-medium">
                {(currentProgress * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Component to handle map events
const MapEventHandler: React.FC<{
  stops: RouteStop[];
  onLocationUpdate: (location: [number, number]) => void;
}> = ({ stops, onLocationUpdate }) => {
  const map = useMap();

  useEffect(() => {
    if (stops.length > 0) {
      const bounds = stops
        .filter((stop) => stop.latitude && stop.longitude)
        .map((stop) => [stop.latitude, stop.longitude] as [number, number]);

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [stops, map]);

  // Real-time location updates using tracking service
  useEffect(() => {
    if (stops.length === 0 || !showRealTimeTracking) return;

    // Use real tracking service instead of simulation
    const cleanup = trackingService.simulateLocationUpdates(
      trip?.id || 0,
      stops,
      (location) => {
        if (location.latitude && location.longitude) {
          onLocationUpdate([location.latitude, location.longitude]);
        }
      }
    );

    return cleanup;
  }, [stops, onLocationUpdate, trip?.id, showRealTimeTracking]);

  return null;
};

const EnhancedRouteMap: React.FC<EnhancedRouteMapProps> = ({
  trip,
  stops = [],
  route = [],
  showRealTimeTracking = false,
  height = "500px",
  className = "",
}) => {
  const mapRef = useRef<any>(null);
  const [currentLocation, setCurrentLocation] = useState<
    [number, number] | null
  >(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);

  // Default center if no locations provided
  const defaultCenter: [number, number] = [39.8283, -98.5795]; // Center of USA
  const defaultZoom = 4;

  // Create custom icons for different stop types
  const createCustomIcon = useCallback(
    (type: string, isSelected: boolean = false) => {
      const iconConfig = {
        current: { color: "#3B82F6", symbol: "🚛", size: 40 },
        pickup: { color: "#10B981", symbol: "📦", size: 35 },
        dropoff: { color: "#EF4444", symbol: "📮", size: 35 },
        fuel: { color: "#F59E0B", symbol: "⛽", size: 30 },
        rest: { color: "#8B5CF6", symbol: "🛑", size: 30 },
      };

      const config =
        iconConfig[type as keyof typeof iconConfig] || iconConfig.current;
      const size = isSelected ? config.size + 10 : config.size;

      return L.divIcon({
        html: `
        <div style="
          background-color: ${config.color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          transform: ${isSelected ? "scale(1.2)" : "scale(1)"};
          transition: all 0.3s ease;
        ">
          <span style="font-size: ${size * 0.5}px;">${config.symbol}</span>
        </div>
      `,
        className: "custom-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });
    },
    [],
  );

  // Create animated route line
  const createAnimatedPolyline = useCallback(() => {
    if (!route || route.length === 0) return null;

    return (
      <>
        {/* Main route line */}
        <Polyline positions={route} color="#3B82F6" weight={4} opacity={0.8} />

        {/* Animated dashed line overlay */}
        <Polyline
          positions={route}
          color="#1E40AF"
          weight={2}
          opacity={0.6}
          dashArray="10, 10"
          className="animate-pulse"
        />
      </>
    );
  }, [route]);

  // Map control handlers
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleFitBounds = useCallback(() => {
    if (mapRef.current && stops.length > 0) {
      const bounds = stops
        .filter((stop) => stop.latitude && stop.longitude)
        .map((stop) => [stop.latitude, stop.longitude]);

      if (bounds.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [stops]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.getElementById("map-container")?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleToggleTraffic = useCallback(() => {
    setShowTraffic(!showTraffic);
  }, [showTraffic]);

  // Calculate route statistics
  const calculateRouteStats = useCallback(() => {
    const fuelStops = stops.filter((stop) => stop.stop_type === "fuel").length;
    const restStops = stops.filter((stop) => stop.stop_type === "rest").length;

    // Calculate total distance (simplified)
    let totalDistance = 0;
    if (route.length > 1) {
      for (let i = 1; i < route.length; i++) {
        const [lat1, lng1] = route[i - 1];
        const [lat2, lng2] = route[i];
        // Simple distance calculation (should use proper formula)
        totalDistance +=
          Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)) * 69; // Rough conversion to miles
      }
    }

    // Calculate estimated duration (simplified)
    const estimatedDuration = totalDistance / 60; // Assuming 60 mph average

    return {
      totalDistance: totalDistance || trip?.total_distance || 0,
      estimatedDuration: estimatedDuration || trip?.estimated_duration || 0,
      fuelStops,
      restStops,
    };
  }, [stops, route, trip]);

  const routeStats = calculateRouteStats();

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (!stops || stops.length === 0) {
    return (
      <div
        className={`${height} ${className} bg-gray-200 rounded-lg flex items-center justify-center`}
      >
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="mt-2">No route data available</p>
          <p className="text-sm">
            Plan a trip to see the enhanced route visualization
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="map-container"
      className={`relative rounded-lg overflow-hidden shadow-lg ${className}`}
      style={{ height }}
    >
      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitBounds={handleFitBounds}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleTraffic={handleToggleTraffic}
        showTraffic={showTraffic}
      />

      {/* Route Information */}
      <RouteInfo
        totalDistance={routeStats.totalDistance}
        estimatedDuration={routeStats.estimatedDuration}
        fuelStops={routeStats.fuelStops}
        restStops={routeStats.restStops}
        currentProgress={showRealTimeTracking ? routeProgress?.currentProgress || undefined : undefined}
      />

      {/* Map Container */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={mapRef}
      >
        {/* Base tile layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Traffic layer (when enabled) */}
        {showTraffic && import.meta.env.VITE_THUNDERFOREST_API_KEY && (
          <TileLayer
            url={`https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${import.meta.env.VITE_THUNDERFOREST_API_KEY}`}
            attribution='&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>'
            opacity={0.7}
          />
        )}
        {showTraffic && !import.meta.env.VITE_THUNDERFOREST_API_KEY && (
          <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded-md z-1000">
            <p className="text-sm">Traffic layer requires Thunderforest API key</p>
          </div>
        )}

        {/* Map event handler */}
        <MapEventHandler stops={stops} onLocationUpdate={setCurrentLocation} />

        {/* Enhanced markers for each stop */}
        {stops
          .filter((stop) => stop.latitude && stop.longitude)
          .map((stop, index) => (
            <Marker
              key={stop.id || index}
              position={[stop.latitude as number, stop.longitude as number]}
              icon={createCustomIcon(
                stop.stop_type,
                selectedStop?.id === stop.id,
              )}
              eventHandlers={{
                click: () => setSelectedStop(stop),
              }}
            >
            <Popup>
              <div className="text-sm p-2">
                <div className="font-semibold text-gray-900">
                  {stop.location}
                </div>
                <div className="text-gray-600 mt-1">
                  Type: <span className="capitalize">{stop.stop_type}</span>
                </div>
                {stop.estimated_arrival && (
                  <div className="text-gray-600">
                    Arrival: {new Date(stop.estimated_arrival).toLocaleString()}
                  </div>
                )}
                {stop.estimated_departure && (
                  <div className="text-gray-600">
                    Departure:{" "}
                    {new Date(stop.estimated_departure).toLocaleString()}
                  </div>
                )}
                {stop.duration_minutes > 0 && (
                  <div className="text-gray-600">
                    Duration: {stop.duration_minutes} minutes
                  </div>
                )}
                <div className="text-gray-600">
                  Sequence: #{stop.sequence_order}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Current location marker (for real-time tracking) */}
        {showRealTimeTracking && currentLocation && (
          <Marker
            position={currentLocation}
            icon={L.divIcon({
              html: `
                <div style="
                  background-color: #EF4444;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 0 0 2px #EF4444;
                  animation: pulse 2s infinite;
                "></div>
              `,
              className: "current-location-marker",
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>
              <div className="text-sm">
                <strong>Current Location</strong>
                <br />
                <span className="text-gray-600">Real-time tracking</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Animated route polyline */}
        {createAnimatedPolyline()}
      </MapContainer>

      {/* Selected stop details panel */}
      {selectedStop && (
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-900">
              {selectedStop.location}
            </h4>
            <button
              onClick={() => setSelectedStop(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="capitalize font-medium">
                {selectedStop.stop_type}
              </span>
            </div>

            {selectedStop.estimated_arrival && (
              <div className="flex justify-between">
                <span className="text-gray-600">Arrival:</span>
                <span className="font-medium">
                  {new Date(
                    selectedStop.estimated_arrival,
                  ).toLocaleTimeString()}
                </span>
              </div>
            )}

            {selectedStop.estimated_departure && (
              <div className="flex justify-between">
                <span className="text-gray-600">Departure:</span>
                <span className="font-medium">
                  {new Date(
                    selectedStop.estimated_departure,
                  ).toLocaleTimeString()}
                </span>
              </div>
            )}

            {selectedStop.duration_minutes > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">
                  {selectedStop.duration_minutes} min
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedRouteMap;
