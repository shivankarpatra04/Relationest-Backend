require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();

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

// Define allowed origins
const allowedOrigins = [
    'http://localhost:3000',  // Local development
    'https://relationest-frontend.vercel.app'  // Your Vercel deployment
];

// CORS options
const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,  // If you're using cookies/sessions
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contact', contactRoutes);

// Logging middleware for unhandled routes
app.use((req, res, next) => {
    console.log(`Unhandled route: ${req.method} ${req.path}`);
    next();
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// General error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Something went wrong!'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;