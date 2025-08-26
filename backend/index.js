const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();

// Import routes
const vehicleRoute = require('./routes/vehicle');
const userRoute = require('./routes/user');

app.use(cors({
    origin: [
        'http://localhost:3000',   
        'http://127.0.0.1:3000',  
        'http://localhost:3001',  
        process.env.FRONTEND_URL  
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (helpful for debugging)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Vehicle Tracking Server is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: 'GET /health',
            vehicles: 'GET /api/vehicles',
            register: 'POST /api/users/register',
            login: 'POST /api/users/login'
        }
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Backend server is working!',
        timestamp: new Date().toISOString()
    });
});


app.use("/api/vehicles", vehicleRoute);  
app.use("/api/vehicle", vehicleRoute);  
app.use("/api/users", userRoute);       
app.use("/api/user", userRoute);         


app.use('*', (req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
            'GET /health',
            'GET /test',
            'GET /api/vehicles',
            'POST /api/vehicles',
            'POST /api/vehicles/update',
            'DELETE /api/vehicles/:id',
            'DELETE /api/vehicles/name/:name',
            'POST /api/users/register',
            'POST /api/users/login',
            'GET /api/users/profile/:username'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
    });
});

// Database connection
const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/vehicle_tracking';
        const conn = await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n Shutting down gracefully...');
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Vehicle Tracking Server running on port ${PORT}`);
        console.log(`Server URL: http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`Vehicles API: http://localhost:${PORT}/api/vehicles`);
        console.log(`Register: http://localhost:${PORT}/api/users/register`);
        console.log(`Login: http://localhost:${PORT}/api/users/login`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Started at: ${new Date().toLocaleString()}`);
    });
};

// Start the server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});