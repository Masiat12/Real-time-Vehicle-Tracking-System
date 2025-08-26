import React, { useEffect, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FaCar, FaCarSide } from "react-icons/fa";
import axios from 'axios';
import { format } from 'timeago.js';
import './app.css'; 

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [viewState, setViewState] = useState({
    latitude: 23.8103,
    longitude: 90.4125,
    zoom: 4
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);

  // Auth state
  const [currentUsername, setCurrentUsername] = useState(localStorage.getItem("user") || "");
  const [showLoginModal, setShowLoginModal] = useState(!currentUsername);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", password: "", confirmPassword: "" });

  // Add vehicle form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: "", lat: "", lng: "" });
  const [adding, setAdding] = useState(false);

  // Helper: validate coordinates
  const isValidCoordinate = (lat, lng) => (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );

  // Fetch vehicles
  const fetchVehicles = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:3000/api/vehicles');
      const validVehicles = response.data.filter(v => isValidCoordinate(v.latitude, v.longitude));
      setVehicles(validVehicles);
      if (showLoader) setLoading(false);
    } catch (err) {
      setError('Failed to fetch vehicles. Make sure the backend is running.');
      if (showLoader) setLoading(false);
      console.error(err);
    }
  };

  // Periodic fetch
  useEffect(() => {
    if (currentUsername) {
      fetchVehicles(true);
      const interval = setInterval(() => fetchVehicles(false), 5000);
      return () => clearInterval(interval);
    }
  }, [currentUsername]);

  // Vehicle selection
  const handleVehicleSelect = (vehicle) => {
    if (!isValidCoordinate(vehicle.latitude, vehicle.longitude)) return;
    setSelectedVehicle(vehicle);
    setViewState(prev => ({
      ...prev,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      zoom: 8
    }));
  };

  // Remove vehicle
  const handleRemoveVehicle = async (vehicleId, vehicleName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete "${vehicleName}"? This action cannot be undone.`)) return;
    setDeletingVehicleId(vehicleId);

    try {
      const response = await axios.delete(`http://localhost:3000/api/vehicles/${vehicleId}`, { timeout: 10000 });
      if (response.data.success) {
        setVehicles(prev => prev.filter(v => v._id !== vehicleId));
        if (selectedVehicle?._id === vehicleId) setSelectedVehicle(null);
      } else {
        alert(`Failed to delete vehicle: ${response.data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert('Error deleting vehicle. Please try again.');
      console.error(err);
    } finally {
      setDeletingVehicleId(null);
    }
  };

  // Add vehicle
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    const lat = parseFloat(newVehicle.lat);
    const lng = parseFloat(newVehicle.lng);
    const name = newVehicle.name.trim();

    if (!name) return alert("Vehicle name cannot be empty");
    if (vehicles.some(v => v.name.toLowerCase() === name.toLowerCase())) return alert(`Vehicle "${name}" already exists`);
    if (!isValidCoordinate(lat, lng)) return alert("Invalid coordinates");

    setAdding(true);
    try {
      await axios.post("http://localhost:3000/api/vehicle", { name, lat, lng });
      setNewVehicle({ name: "", lat: "", lng: "" });
      setShowAddForm(false);
      fetchVehicles(true);
    } catch (err) {
      alert("Error adding vehicle");
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  // Login
  const handleLogin = (e) => {
    e.preventDefault();
    const { username, password } = loginForm;
    if (!username || !password) return alert("Enter username and password");

    // TODO: Replace with backend login call
    localStorage.setItem("user", username);
    setCurrentUsername(username);
    setShowLoginModal(false);
    fetchVehicles(true);
  };

  // Register
  const handleRegister = (e) => {
    e.preventDefault();
    const { username, password, confirmPassword } = registerForm;
    if (!username || !password || !confirmPassword) return alert("Fill all fields");
    if (password !== confirmPassword) return alert("Passwords do not match");

    // TODO: Replace with backend registration call
    localStorage.setItem("user", username);
    setCurrentUsername(username);
    setShowRegisterModal(false);
    setShowLoginModal(false);
    fetchVehicles(true);
  };

  // Logout
  const handleLogout = () => {
    setCurrentUsername("");
    localStorage.removeItem("user");
    setVehicles([]);
    setSelectedVehicle(null);
    setShowLoginModal(true);
  };

  if (loading) return <div className="loading-container">Loading vehicles...</div>;
  if (error) return <div className="error-container">{error} <button onClick={() => fetchVehicles(true)}>Retry</button></div>;

  return (
    <div className="app-container">

      {/* Login Modal */}
      {showLoginModal && !showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <input 
                type="text" placeholder="Username" value={loginForm.username} 
                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} required 
              />
              <input 
                type="password" placeholder="Password" value={loginForm.password} 
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required 
              />
              <button type="submit">Login</button>
            </form>
            <p>Don't have an account? 
              <span className="modal-link" onClick={() => { setShowRegisterModal(true); setShowLoginModal(false); }}> Register</span>
            </p>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <input 
                type="text" placeholder="Username" value={registerForm.username} 
                onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })} required 
              />
              <input 
                type="password" placeholder="Password" value={registerForm.password} 
                onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} required 
              />
              <input 
                type="password" placeholder="Confirm Password" value={registerForm.confirmPassword} 
                onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} required 
              />
              <button type="submit">Register</button>
            </form>
            <p>Already have an account? 
              <span className="modal-link" onClick={() => { setShowLoginModal(true); setShowRegisterModal(false); }}> Login</span>
            </p>
          </div>
        </div>
      )}

      {/* Only render dashboard if logged in */}
      {currentUsername && (
        <>
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <h2 className="dashboard-title">Real-Time Vehicle Tracking Dashboard</h2>
            <p className="dashboard-subtitle">Tracking {vehicles.length} vehicles</p>
            <div className="auth-buttons">
              <span className="welcome-text">Welcome, {currentUsername}</span>
              <button className="button logout" onClick={handleLogout}>Logout</button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="vehicle-sidebar">
            <h3 className="sidebar-title">
              <FaCar style={{ marginRight: '6px', color: '#007bff' }} /> Active Vehicles
              <button onClick={() => setShowAddForm(!showAddForm)} style={{ marginLeft: "10px" }}>＋ Add Vehicle</button>
            </h3>

            {showAddForm && (
              <form onSubmit={handleAddVehicle} className="add-vehicle-form">
                <input type="text" placeholder="Vehicle Name" value={newVehicle.name} 
                  onChange={e => setNewVehicle({ ...newVehicle, name: e.target.value })} required />
                <input type="number" step="any" placeholder="Latitude" value={newVehicle.lat} 
                  onChange={e => setNewVehicle({ ...newVehicle, lat: e.target.value })} required />
                <input type="number" step="any" placeholder="Longitude" value={newVehicle.lng} 
                  onChange={e => setNewVehicle({ ...newVehicle, lng: e.target.value })} required />
                <button type="submit" disabled={adding}>{adding ? "Adding..." : "Add"}</button>
              </form>
            )}

            {vehicles.length === 0 ? (
              <div className="no-vehicles">No vehicles available with valid coordinates</div>
            ) : (
              vehicles.map(vehicle => (
                <div 
                  key={vehicle._id} 
                  className={`vehicle-item ${selectedVehicle?._id === vehicle._id ? 'selected' : ''} ${deletingVehicleId === vehicle._id ? 'deleting' : ''}`} 
                  onClick={() => handleVehicleSelect(vehicle)}
                >
                  {/* Remove button positioned in top right */}
                  <button 
                    className="vehicle-remove-btn"
                    onClick={e => handleRemoveVehicle(vehicle._id, vehicle.name, e)} 
                    disabled={deletingVehicleId === vehicle._id}
                    title={`Remove ${vehicle.name}`}
                    aria-label={`Remove ${vehicle.name}`}
                  >
                    {deletingVehicleId === vehicle._id ? '⟳' : '×'}
                  </button>
                  
                  {/* Vehicle content with padding to avoid overlap */}
                  <div className="vehicle-content">
                    <div className="vehicle-name">
                      <FaCar style={{ marginRight: '6px' }}/> 
                      {vehicle.name}
                    </div>
                    <div className="vehicle-coordinates">
                      Lat: {vehicle.latitude?.toFixed(4)}, Lng: {vehicle.longitude?.toFixed(4)}
                    </div>
                    <div className="vehicle-time">
                      {vehicle.lastActive ? format(vehicle.lastActive) : 'Unknown'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Map */}
          <div className="map-container">
            <Map {...viewState} onMove={evt => setViewState(evt.viewState)} style={{ width: "100%", height: "100%" }} mapStyle="https://demotiles.maplibre.org/style.json">
              {vehicles.map(vehicle => (
                <Marker key={vehicle._id} longitude={vehicle.longitude} latitude={vehicle.latitude} anchor="center">
                  <div onClick={() => handleVehicleSelect(vehicle)}>
                    <FaCarSide className={`car-icon ${selectedVehicle?._id === vehicle._id ? 'selected' : ''}`} style={{ fontSize: `${Math.max(20, viewState.zoom * 2)}px` }} />
                  </div>
                </Marker>
              ))}
              {selectedVehicle && (
                <Popup longitude={selectedVehicle.longitude} latitude={selectedVehicle.latitude} anchor="top" closeButton onClose={() => setSelectedVehicle(null)}>
                  <div>
                    <div><strong>{selectedVehicle.name}</strong></div>
                    <div>Coordinates: {selectedVehicle.latitude.toFixed(6)}, {selectedVehicle.longitude.toFixed(6)}</div>
                    <div>Last Active: {selectedVehicle.lastActive ? format(selectedVehicle.lastActive) : 'Unknown'}</div>
                  </div>
                </Popup>
              )}
            </Map>
          </div>

          {/* Status Indicator */}
          <div className={`status-indicator ${vehicles.length > 0 ? 'active' : 'waiting'}`}>
            {vehicles.length > 0 ? '● Live Tracking Active' : '● Waiting for Vehicles'}
          </div>
        </>
      )}

    </div>
  );
}

export default App;