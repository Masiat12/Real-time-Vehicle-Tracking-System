const router = require('express').Router();
const Vehicle = require('../models/vehicle');

// Helper function to validate coordinates
function validateCoordinates(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return { valid: false, error: 'Coordinates must be numbers' };
    }
    if (lat < -90 || lat > 90) {
        return { valid: false, error: `Invalid latitude: ${lat}. Must be between -90 and 90` };
    }
    if (lng < -180 || lng > 180) {
        return { valid: false, error: `Invalid longitude: ${lng}. Must be between -180 and 180` };
    }
    if (isNaN(lat) || isNaN(lng)) {
        return { valid: false, error: 'Coordinates cannot be NaN' };
    }
    return { valid: true };
}

// ================== GET all vehicles ==================
router.get('/', async (req, res) => {
    try {
        const vehicles = await Vehicle.find().sort({ lastUpdated: -1 });

        const transformedVehicles = vehicles.map(vehicle => {
            const lat = parseFloat(vehicle.lat);
            const lng = parseFloat(vehicle.lng);

            const validation = validateCoordinates(lat, lng);
            if (!validation.valid) return null;

            return {
                _id: vehicle._id,
                name: vehicle.name,
                lat,
                lng,
                latitude: lat,
                longitude: lng,
                lastActive: vehicle.lastUpdated,
                lastUpdated: vehicle.lastUpdated,
                locationHistory: vehicle.locationHistory,
                createdAt: vehicle.createdAt,
                updatedAt: vehicle.updatedAt
            };
        }).filter(v => v !== null);

        res.status(200).json(transformedVehicles);
    } catch (err) {
        console.error('Error fetching vehicles:', err);
        res.status(500).json({ success: false, error: 'Error fetching vehicles' });
    }
});

// ================== CREATE new vehicle ==================
router.post('/', async (req, res) => {
    try {
        const { name, lat, lng } = req.body;

        if (!name || lat === undefined || lng === undefined) {
            return res.status(400).json({ success: false, error: 'Vehicle name, latitude, and longitude are required' });
        }

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        const validation = validateCoordinates(parsedLat, parsedLng);
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: validation.error });
        }

        const existingVehicle = await Vehicle.findOne({ name: name.trim() });
        if (existingVehicle) {
            return res.status(400).json({ success: false, error: `Vehicle with name "${name}" already exists` });
        }

        const newVehicle = new Vehicle({
            name: name.trim(),
            lat: parsedLat,
            lng: parsedLng,
            lastUpdated: new Date(),
            locationHistory: [{ lat: parsedLat, lng: parsedLng, timestamp: new Date() }]
        });

        const savedVehicle = await newVehicle.save();
        res.status(201).json({ success: true, message: 'Vehicle added successfully', vehicle: savedVehicle });
    } catch (err) {
        console.error('Error creating vehicle:', err);
        res.status(500).json({ success: false, error: 'Error creating vehicle' });
    }
});

// ================== UPDATE vehicle location ==================
router.post('/update', async (req, res) => {
    try {
        const { name, lat, lng, lastUpdated } = req.body;

        if (!name || lat === undefined || lng === undefined) {
            return res.status(400).json({ success: false, error: 'Name, lat, and lng are required' });
        }

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        const validation = validateCoordinates(parsedLat, parsedLng);
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: validation.error });
        }

        let vehicle = await Vehicle.findOne({ name });
        if (!vehicle) {
            // 🚨 FIX: Don't recreate deleted vehicles
            return res.status(404).json({ success: false, error: `Vehicle "${name}" not found` });
        }

        vehicle.lat = parsedLat;
        vehicle.lng = parsedLng;
        vehicle.lastUpdated = lastUpdated ? new Date(lastUpdated) : new Date();

        vehicle.locationHistory.push({ lat: parsedLat, lng: parsedLng, timestamp: new Date() });
        if (vehicle.locationHistory.length > 100) {
            vehicle.locationHistory = vehicle.locationHistory.slice(-100);
        }

        await vehicle.save();
        res.status(200).json({ success: true, message: 'Vehicle updated successfully', vehicle });
    } catch (err) {
        console.error('Error updating vehicle:', err);
        res.status(500).json({ success: false, error: 'Error updating vehicle' });
    }
});

// ================== GET vehicle by ID 
router.get('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

        const lat = parseFloat(vehicle.lat);
        const lng = parseFloat(vehicle.lng);
        const validation = validateCoordinates(lat, lng);
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: validation.error });
        }

        res.status(200).json({ success: true, vehicle });
    } catch (err) {
        console.error('Error fetching vehicle:', err);
        res.status(500).json({ success: false, error: 'Error fetching vehicle' });
    }
});

// ================== DELETE vehicle by ID ==================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedVehicle = await Vehicle.findByIdAndDelete(id);

        if (!deletedVehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

        res.json({ success: true, message: `Vehicle "${deletedVehicle.name}" deleted permanently`, deletedVehicle });
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ success: false, error: 'Error deleting vehicle' });
    }
});

// ================== DELETE vehicle by name 
router.delete('/name/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const deletedVehicle = await Vehicle.findOneAndDelete({ name });

        if (!deletedVehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

        res.json({ success: true, message: `Vehicle "${deletedVehicle.name}" deleted permanently`, deletedVehicle });
    } catch (error) {
        console.error('Error deleting vehicle by name:', error);
        res.status(500).json({ success: false, error: 'Error deleting vehicle' });
    }
});

module.exports = router;