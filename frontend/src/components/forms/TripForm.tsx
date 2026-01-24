import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { TripPlanRequest, TripFormProps, LocationSuggestion } from '@/types';

const TripForm: React.FC<TripFormProps> = ({ onSubmit, loading = false, initialData }) => {
  const [formData, setFormData] = useState<Partial<TripPlanRequest>>({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_hours: 0,
    vehicle_type: 'straight_truck',
    hazardous_materials: false,
    preferred_fuel_stops: [],
    time_windows: {
      pickup_start: '',
      pickup_end: '',
      dropoff_start: '',
      dropoff_end: ''
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, LocationSuggestion[]>>({});
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.current_location?.trim()) {
      newErrors.current_location = 'Current location is required';
    }

    if (!formData.pickup_location?.trim()) {
      newErrors.pickup_location = 'Pickup location is required';
    }

    if (!formData.dropoff_location?.trim()) {
      newErrors.dropoff_location = 'Dropoff location is required';
    }

    const cycleHours = parseFloat(formData.current_cycle_hours?.toString() || '0');
    if (!formData.current_cycle_hours || isNaN(cycleHours) || cycleHours < 0 || cycleHours > 70) {
      newErrors.current_cycle_hours = 'Must be a number between 0 and 70';
    }

    // Validate time windows if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (formData.time_windows?.pickup_start && !timeRegex.test(formData.time_windows.pickup_start)) {
      newErrors.pickup_time = 'Invalid pickup time format (HH:MM)';
    }
    
    if (formData.time_windows?.dropoff_start && !timeRegex.test(formData.time_windows.dropoff_start)) {
      newErrors.delivery_time = 'Invalid delivery time format (HH:MM)';
    }

    // Validate location coordinates for selected locations
    ['current_location', 'pickup_location', 'dropoff_location'].forEach(field => {
      const fieldKey = field as keyof typeof formData;
      const hasCoordinates = formData[`${fieldKey}_coordinates` as keyof typeof formData];
      if (formData[fieldKey] && !hasCoordinates) {
        newErrors[fieldKey] = 'Please select a location from the suggestions';
      }
    });

    return newErrors;
  };

  const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  interface LocationSuggestion {
    name: string;
    full_address: string;
    coordinates: [number, number];
  }

  const fetchLocationSuggestions = async (query: string, fieldName: string): Promise<void> => {
    if (!query || query.length < 3) {
      setSuggestions(prev => ({ ...prev, [fieldName]: [] }));
      return;
    }

    try {
      const response = await fetch(
        `https://api.openrouteservice.org/geocode/autocomplete?api_key=${import.meta.env.VITE_OPENROUTESERVICE_API_KEY || 'demo'}&text=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      if (data.features) {
        const locations: LocationSuggestion[] = data.features.slice(0, 5).map((feature: any) => ({
          name: feature.properties.name || feature.properties.label,
          full_address: feature.properties.label,
          coordinates: feature.geometry.coordinates
        }));
        setSuggestions(prev => ({ ...prev, [fieldName]: locations }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions(prev => ({ ...prev, [fieldName]: [] }));
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Handle location autocomplete
    if (name.includes('location') && typeof value === 'string' && value.length >= 3) {
      setActiveField(name);
      
      // Debounce the API call
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        fetchLocationSuggestions(value, name);
      }, 300);
    } else if (name.includes('location')) {
      setSuggestions(prev => ({ ...prev, [name]: [] }));
    }
  };

  const handleLocationSelect = (fieldName: string, location: LocationSuggestion): void => {
    const [latitude, longitude] = location.coordinates;
    setFormData(prev => ({
      ...prev,
      [fieldName]: location.full_address,
      [`${fieldName}_coordinates` as keyof typeof formData]: { latitude, longitude }
    }));
    setSuggestions(prev => ({ ...prev, [fieldName]: [] }));
    setActiveField(null);
  };

  const handleTimeWindowChange = (field: string, value: string): void => {
    setFormData(prev => ({
      ...prev,
      time_windows: {
        ...prev.time_windows,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    // Convert form data to proper format for submission
    const submissionData: TripPlanRequest = {
      current_location: formData.current_location!,
      pickup_location: formData.pickup_location!,
      dropoff_location: formData.dropoff_location!,
      current_cycle_hours: parseFloat(formData.current_cycle_hours?.toString() || '0'),
      vehicle_type: formData.vehicle_type || 'straight_truck',
      hazardous_materials: formData.hazardous_materials || false,
      preferred_fuel_stops: formData.preferred_fuel_stops || [],
      time_windows: formData.time_windows
    };

    onSubmit(submissionData);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setSuggestions({});
        setActiveField(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Trip Details</h2>
        
        <div className="space-y-4">
          {/* Current Location */}
          <div className="relative">
            <label htmlFor="current_location" className="block text-sm font-medium text-gray-700">
              Current Location
            </label>
            <div className="relative">
              <input
                type="text"
                name="current_location"
                id="current_location"
                value={formData.current_location || ''}
                onChange={handleInputChange}
                onFocus={() => setActiveField('current_location')}
                placeholder="e.g., Chicago, IL"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.current_location
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {activeField === 'current_location' && (
                <div className="absolute right-2 top-2 text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>
            {suggestions.current_location && suggestions.current_location.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                {suggestions.current_location.map((location, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full text-left py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 px-4"
                    onClick={() => handleLocationSelect('current_location', location)}
                  >
                    <div className="font-medium text-sm">{location.name}</div>
                    <div className="text-xs text-gray-500">{location.full_address}</div>
                  </button>
                ))}
              </div>
            )}
            {errors.current_location && (
              <p className="mt-1 text-sm text-red-600">{errors.current_location}</p>
            )}
          </div>

          {/* Pickup Location */}
          <div className="relative">
            <label htmlFor="pickup_location" className="block text-sm font-medium text-gray-700">
              Pickup Location
            </label>
            <div className="relative">
              <input
                type="text"
                name="pickup_location"
                id="pickup_location"
                value={formData.pickup_location || ''}
                onChange={handleInputChange}
                onFocus={() => setActiveField('pickup_location')}
                placeholder="e.g., Indianapolis, IN"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.pickup_location
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {activeField === 'pickup_location' && (
                <div className="absolute right-2 top-2 text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>
            {suggestions.pickup_location && suggestions.pickup_location.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                {suggestions.pickup_location.map((location, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full text-left py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 px-4"
                    onClick={() => handleLocationSelect('pickup_location', location)}
                  >
                    <div className="font-medium text-sm">{location.name}</div>
                    <div className="text-xs text-gray-500">{location.full_address}</div>
                  </button>
                ))}
              </div>
            )}
            {errors.pickup_location && (
              <p className="mt-1 text-sm text-red-600">{errors.pickup_location}</p>
            )}
          </div>

          {/* Dropoff Location */}
          <div className="relative">
            <label htmlFor="dropoff_location" className="block text-sm font-medium text-gray-700">
              Dropoff Location
            </label>
            <div className="relative">
              <input
                type="text"
                name="dropoff_location"
                id="dropoff_location"
                value={formData.dropoff_location || ''}
                onChange={handleInputChange}
                onFocus={() => setActiveField('dropoff_location')}
                placeholder="e.g., Atlanta, GA"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.dropoff_location
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {activeField === 'dropoff_location' && (
                <div className="absolute right-2 top-2 text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>
            {suggestions.dropoff_location && suggestions.dropoff_location.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                {suggestions.dropoff_location.map((location, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full text-left py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 px-4"
                    onClick={() => handleLocationSelect('dropoff_location', location)}
                  >
                    <div className="font-medium text-sm">{location.name}</div>
                    <div className="text-xs text-gray-500">{location.full_address}</div>
                  </button>
                ))}
              </div>
            )}
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
                value={formData.current_cycle_hours || ''}
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

          {/* Advanced Options Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center mx-auto"
            >
              <svg 
                className={`h-4 w-4 mr-1 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="bg-gray-50 p-4 sm:p-6 rounded-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Trip Options</h3>
          
          <div className="space-y-4">
            {/* Vehicle Type */}
            <div>
              <label htmlFor="vehicle_type" className="block text-sm font-medium text-gray-700">
                Vehicle Type
              </label>
              <select
                name="vehicle_type"
                id="vehicle_type"
                value={formData.vehicle_type || 'straight_truck'}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="straight_truck">Straight Truck</option>
                <option value="tractor_trailer">Semi-Tractor Trailer</option>
                <option value="reefer">Reefer (Refrigerated)</option>
                <option value="flatbed">Flatbed</option>
                <option value="tanker">Tanker</option>
                <option value="intermodal">Intermodal Container</option>
              </select>
            </div>

            {/* Hazardous Materials */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="hazardous_materials"
                id="hazardous_materials"
                checked={formData.hazardous_materials || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hazardous_materials" className="ml-2 block text-sm text-gray-700">
                Transporting Hazardous Materials
              </label>
            </div>

            {/* Time Windows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pickup_start" className="block text-sm font-medium text-gray-700">
                  Preferred Pickup Start
                </label>
                <input
                  type="text"
                  name="pickup_start"
                  id="pickup_start"
                  value={formData.time_windows?.pickup_start || ''}
                  onChange={(e) => handleTimeWindowChange('pickup_start', e.target.value)}
                  placeholder="08:00"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Optional (24-hour format)</p>
              </div>
              
              <div>
                <label htmlFor="dropoff_start" className="block text-sm font-medium text-gray-700">
                  Preferred Dropoff Start
                </label>
                <input
                  type="text"
                  name="dropoff_start"
                  id="dropoff_start"
                  value={formData.time_windows?.dropoff_start || ''}
                  onChange={(e) => handleTimeWindowChange('dropoff_start', e.target.value)}
                  placeholder="17:00"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Optional (24-hour format)</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
          className={`w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 px-4 ${
            loading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
          }`}
        >
          {loading ? (
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Planning Your Route...
            </div>
          ) : (
            'Plan Trip'
          )}
        </button>
      </div>
    </form>
  );
};

export default TripForm;