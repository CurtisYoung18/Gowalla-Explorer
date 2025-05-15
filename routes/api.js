/**
 * Gowalla Explorer - API Routes
 * Handles all API endpoints for the application
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const CheckIn = require('../models/checkIn');
const Chatbot = require('../models/chatbot');
const Validation = require('../models/validation');

// Input validation middleware
const validateInput = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: error.details[0].message
            });
        }
        
        next();
    };
};

// Error handling for async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * @route   GET /api/available-userids
 * @desc    Get a list of available user IDs (for autocomplete)
 * @access  Public
 */
router.get('/available-userids', asyncHandler(async (req, res) => {
    const userIds = await CheckIn.getAvailableUserIds();
    res.json({ userIds });
}));

/**
 * @route   GET /api/available-locationids
 * @desc    Get a list of available location IDs (for autocomplete)
 * @access  Public
 */
router.get('/available-locationids', asyncHandler(async (req, res) => {
    const locationIds = await CheckIn.getAvailableLocationIds();
    res.json({ locationIds });
}));

/**
 * @route   POST /api/trajectory-search
 * @desc    Search for a user's trajectory within a time range
 * @access  Public
 */
router.post('/trajectory-search', validateInput(Validation.trajectorySearchSchema), asyncHandler(async (req, res) => {
    const { userId, startDate, endDate, radius } = req.body;
    
    // Get user's check-ins
    const checkIns = await CheckIn.getUserTrajectory(userId, startDate, endDate);
    
    // If no check-ins found, return empty result
    if (checkIns.length === 0) {
        return res.json({
            userId,
            startDate,
            endDate,
            checkIns: []
        });
    }
    
    // For each check-in, find similar check-ins from other users within the radius
    const checkInsWithSimilar = await Promise.all(checkIns.map(async (checkIn) => {
        // Find similar check-ins within radius and time window
        const similarCheckIns = await CheckIn.getSimilarCheckIns(
            userId,
            checkIn.lat,
            checkIn.lng,
            radius,
            new Date(new Date(checkIn.timestamp).getTime() - 24 * 60 * 60 * 1000),  // 1 day before
            new Date(new Date(checkIn.timestamp).getTime() + 24 * 60 * 60 * 1000)   // 1 day after
        );
        
        return {
            ...checkIn,
            similarCheckIns
        };
    }));
    
    res.json({
        userId,
        startDate,
        endDate,
        checkIns: checkInsWithSimilar
    });
}));

/**
 * @route   POST /api/custom-search
 * @desc    Search check-ins with custom criteria
 * @access  Public
 */
router.post('/custom-search', validateInput(Validation.customSearchSchema), asyncHandler(async (req, res) => {
    const { userId, locationId, sortBy, limit } = req.body;
    
    // Search check-ins with the provided criteria
    const checkIns = await CheckIn.searchCheckIns({
        userId,
        locationId,
        sortBy: sortBy || 'time',
        limit: limit || 100
    });
    
    res.json({
        userId: userId || null,
        locationId: locationId || null,
        sortBy: sortBy || 'time',
        checkIns
    });
}));

/**
 * @route   POST /api/popular-pois
 * @desc    Find popular points of interest in a region
 * @access  Public
 */
router.post('/popular-pois', validateInput(Validation.popularPoisSchema), asyncHandler(async (req, res) => {
    const { startDate, endDate, bounds, limit } = req.body;
    
    // Get popular POIs
    const pois = await CheckIn.getPopularPOIs(startDate, endDate, bounds, limit || 20);
    
    res.json({
        startDate,
        endDate,
        bounds,
        pois
    });
}));

/**
 * @route   POST /api/chatbot
 * @desc    Process a message for the chatbot
 * @access  Public
 */
router.post('/chatbot', validateInput(Validation.chatbotSchema), asyncHandler(async (req, res) => {
    const { message } = req.body;
    
    // Process the message using the chatbot model
    const reply = await Chatbot.processMessage(message);
    
    res.json({ reply });
}));

module.exports = router; 