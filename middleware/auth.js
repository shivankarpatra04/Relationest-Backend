// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Log the entire authorization header
    console.log('Full Authorization header:', req.headers.authorization);

    try {
        // Check if Authorization header exists
        if (!req.headers.authorization) {
            console.log('No Authorization header found');
            return res.status(401).json({ message: 'No authorization header' });
        }

        // Check if it's a Bearer token
        if (!req.headers.authorization.startsWith('Bearer ')) {
            console.log('Not a Bearer token');
            return res.status(401).json({ message: 'Invalid token format' });
        }

        // Extract token
        const token = req.headers.authorization.split(' ')[1];

        if (!token) {
            console.log('No token found after Bearer');
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify token
        try {
            console.log('Verifying token...');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);
            req.user = decoded;
            next();
        } catch (verifyError) {
            console.error('Token verification failed:', verifyError);
            return res.status(401).json({
                message: 'Invalid token',
                error: verifyError.message
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = authMiddleware;