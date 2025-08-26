import React, { useState } from 'react';
import axios from 'axios';
import './AddVehicle.css';

const AddVehicle = ({ showAddVehicle, setShowAddVehicle, currentUsername, onVehicleAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Vehicle name is required');
      return false;
    }

    if (formData.name.trim().length < 2) {
      setError('Vehicle name must be at least 2 characters long');
      return false;
    }

    if (!formData.lat || !formData.lng) {
      setError('Both latitude and longitude are required');
      return false;
    }

    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Latitude and longitude must be valid numbers');
      return false;
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return false;
    }

    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Adding vehicle:', formData.name);
      
      const vehicleData = {
        name: formData.name.trim(),
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng)
      };

      console.log('Sending vehicle data:', vehicleData);

      // Use the correct endpoint that matches your backend
      const response = await axios.post('http://localhost:3000/api/vehicle', vehicleData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Vehicle added successfully:', response.data);

      setSuccess(`Vehicle "${formData.name}" added successfully!`);
      
      // Reset form
      setFormData({
        name: '',
        lat: '',
        lng: ''
      });

      // Notify parent component to refresh vehicles
      if (onVehicleAdded) {
        onVehicleAdded(response.data);
      }
      
      // Close modal after showing success message
      setTimeout(() => {
        setShowAddVehicle(false);
        setSuccess('');
      }, 2000);

    } catch (err) {
      console.error('Error adding vehicle:', err);
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please ensure the backend server is running.');
      } else if (err.response && err.response.data) {
        // Handle your backend's error format
        const errorMessage = err.response.data.error || err.response.data.message || 'Unknown error';
        setError(errorMessage);
      } else if (err.response) {
        setError(`Failed to add vehicle: ${err.response.status} ${err.response.statusText}`);
      } else if (err.request) {
        setError('No response from server. Please check your connection and try again.');
      } else {
        setError('Failed to add vehicle. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowAddVehicle(false);
    setError('');
    setSuccess('');
    setFormData({
      name: '',
      lat: '',
      lng: ''
    });
  };

  const fillCurrentLocation = () => {
    if (navigator.geolocation) {
      setError('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6)
          });
          setError('');
          setSuccess('Current location filled!');
          setTimeout(() => setSuccess(''), 2000);
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Unable to get current location. ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied by user.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'Please enter coordinates manually.';
              break;
          }
          setError(errorMessage);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 60000 
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  // Sample locations for quick testing
  const sampleLocations = [
    { name: 'Dhaka', country: 'Bangladesh', lat: '23.8103', lng: '90.4125' },
    { name: 'New York', country: 'USA', lat: '40.7128', lng: '-74.0060' },
    { name: 'London', country: 'UK', lat: '51.5074', lng: '-0.1278' },
    { name: 'Tokyo', country: 'Japan', lat: '35.6762', lng: '139.6503' },
    { name: 'Sydney', country: 'Australia', lat: '-33.8688', lng: '151.2093' }
  ];

  const fillSampleLocation = (location) => {
    setFormData({
      ...formData,
      lat: location.lat,
      lng: location.lng
    });
    setError('');
    setSuccess(`Filled coordinates for ${location.name}, ${location.country}`);
    setTimeout(() => setSuccess(''), 1500);
  };

  if (!showAddVehicle) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-vehicle-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Vehicle</h2>
          <p>Add a new vehicle to the tracking system</p>
          <button 
            className="close-button" 
            onClick={handleClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-vehicle-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="input-group">
            <label htmlFor="name">Vehicle Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter vehicle name (e.g., Car-001, Truck-Alpha)"
              required
              maxLength="50"
              autoFocus
            />
            <small className="input-hint">Must be at least 2 characters long</small>
          </div>

          <div className="coordinates-section">
            <h4>📍 Vehicle Location</h4>
            
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="lat">Latitude *</label>
                <input
                  type="number"
                  id="lat"
                  name="lat"
                  value={formData.lat}
                  onChange={handleChange}
                  placeholder="23.8103"
                  step="any"
                  min="-90"
                  max="90"
                  required
                />
                <small className="input-hint">Range: -90 to 90</small>
              </div>

              <div className="input-group">
                <label htmlFor="lng">Longitude *</label>
                <input
                  type="number"
                  id="lng"
                  name="lng"
                  value={formData.lng}
                  onChange={handleChange}
                  placeholder="90.4125"
                  step="any"
                  min="-180"
                  max="180"
                  required
                />
                <small className="input-hint">Range: -180 to 180</small>
              </div>
            </div>

            <div className="location-helpers">
              <button
                type="button"
                className="location-button current-location"
                onClick={fillCurrentLocation}
                title="Use your current GPS location"
              >
                📍 Use Current Location
              </button>

              <div className="sample-locations">
                <span className="helper-label">Quick locations:</span>
                <div className="sample-buttons">
                  {sampleLocations.map((location, index) => (
                    <button
                      key={index}
                      type="button"
                      className="sample-location-btn"
                      onClick={() => fillSampleLocation(location)}
                      title={`${location.name}, ${location.country}: ${location.lat}, ${location.lng}`}
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Coordinate Preview */}
            {formData.lat && formData.lng && (
              <div className="coordinate-preview">
                <strong>Preview:</strong> {parseFloat(formData.lat).toFixed(4)}, {parseFloat(formData.lng).toFixed(4)}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="add-vehicle-button"
              disabled={loading || !formData.name.trim() || !formData.lat || !formData.lng}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Adding Vehicle...
                </>
              ) : (
                '🚗 Add Vehicle'
              )}
            </button>
            
            <button 
              type="button" 
              className="cancel-button"
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVehicle;
