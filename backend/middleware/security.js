const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// API specific limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many API requests from this IP, please try again after 15 minutes'
});

// Specific endpoint limiters
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // start blocking after 5 requests
  message: 'Too many login attempts, please try again after an hour'
});

const securityMiddleware = {
  // Basic security headers
  basicSecurity: helmet(),
  
  // Rate limiters
  generalLimiter: limiter,
  apiLimiter: apiLimiter,
  authLimiter: authLimiter,
  
  // Data sanitization
  mongoSanitizer: mongoSanitize(),
  xssCleaner: xss(),
  
  // CORS configuration
  corsConfig: cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }),

  // Request validation middleware
  validateRequest: (req, res, next) => {
    // Check content type
    if (req.method === 'POST' || req.method === 'PUT') {
      if (!req.is('application/json')) {
        return res.status(400).json({ 
          error: 'Content-Type must be application/json' 
        });
      }
    }
    next();
  },
};

module.exports = securityMiddleware;