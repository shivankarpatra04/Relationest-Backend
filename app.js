require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

const cors = require('cors');
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
}).then(() => {
    console.log('Connected to MongoDB via Mongoose');
}).catch((error) => {
    console.error('MongoDB Mongoose connection error:', error);
    process.exit(1);
});

// MongoDB client setup with Stable API options
const client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// Function to confirm connection and initialize database
async function initializeDatabase() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("MongoDB Atlas connection error:", error);
        process.exit(1);
    }
}

// Run the initializeDatabase function to confirm connection
initializeDatabase().catch(console.dir);

// Basic health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Remove /api prefix from routes to match frontend expectations
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/contact', contactRoutes);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Preflight request handler
app.options('*', cors(corsOptions));

// 404 handler
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        message: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Determine if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        message: isDevelopment ? err.message : 'An error occurred on the server',
        ...(isDevelopment && { stack: err.stack }) // Only include stack trace in development
    });
});

const PORT = process.env.PORT || 5000;

// Enhanced server startup
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

module.exports = app;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
