/**
 * Gowalla Explorer - Validation Model
 * Handles input validation for API endpoints
 */

const Joi = require('joi');

// Trajectory search validation schema
const trajectorySearchSchema = Joi.object({
    userId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'User ID must be a number',
            'number.integer': 'User ID must be an integer',
            'number.positive': 'User ID must be positive',
            'any.required': 'User ID is required'
        }),
    
    startDate: Joi.date().iso().required()
        .messages({
            'date.base': 'Start date must be a valid date',
            'date.format': 'Start date must be in ISO format (YYYY-MM-DD)',
            'any.required': 'Start date is required'
        }),
    
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
        .messages({
            'date.base': 'End date must be a valid date',
            'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
            'date.min': 'End date must be after start date',
            'any.required': 'End date is required'
        }),
    
    radius: Joi.number().positive().max(100).required()
        .messages({
            'number.base': 'Radius must be a number',
            'number.positive': 'Radius must be positive',
            'number.max': 'Radius must not exceed 100 km',
            'any.required': 'Radius is required'
        })
});

// Custom search validation schema
const customSearchSchema = Joi.object({
    userId: Joi.number().integer().positive().allow(null)
        .messages({
            'number.base': 'User ID must be a number',
            'number.integer': 'User ID must be an integer',
            'number.positive': 'User ID must be positive'
        }),
    
    locationId: Joi.number().integer().positive().allow(null)
        .messages({
            'number.base': 'Location ID must be a number',
            'number.integer': 'Location ID must be an integer',
            'number.positive': 'Location ID must be positive'
        }),
    
    sortBy: Joi.string().valid('time', 'time-asc', 'distance', 'distance-desc').default('time')
        .messages({
            'string.base': 'Sort by must be a string',
            'any.only': 'Sort by must be one of: time, time-asc, distance, distance-desc'
        }),
    
    limit: Joi.number().integer().min(10).max(1000).default(100)
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 10',
            'number.max': 'Limit must not exceed 1000'
        })
}).custom((value, helpers) => {
    if (!value.userId && !value.locationId) {
        return helpers.error('custom.missingParams');
    }
    return value;
}, 'At least one of userId or locationId is required')
.message({
    'custom.missingParams': 'At least one of userId or locationId is required'
});

// Popular POIs validation schema
const popularPoisSchema = Joi.object({
    startDate: Joi.date().iso().required()
        .messages({
            'date.base': 'Start date must be a valid date',
            'date.format': 'Start date must be in ISO format (YYYY-MM-DD)',
            'any.required': 'Start date is required'
        }),
    
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
        .messages({
            'date.base': 'End date must be a valid date',
            'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
            'date.min': 'End date must be after start date',
            'any.required': 'End date is required'
        }),
    
    bounds: Joi.object({
        north: Joi.number().required()
            .messages({
                'number.base': 'North bound must be a number',
                'any.required': 'North bound is required'
            }),
        
        south: Joi.number().required()
            .messages({
                'number.base': 'South bound must be a number',
                'any.required': 'South bound is required'
            }),
        
        east: Joi.number().required()
            .messages({
                'number.base': 'East bound must be a number',
                'any.required': 'East bound is required'
            }),
        
        west: Joi.number().required()
            .messages({
                'number.base': 'West bound must be a number',
                'any.required': 'West bound is required'
            })
    }).required()
        .messages({
            'object.base': 'Bounds must be an object',
            'any.required': 'Bounds are required'
        }),
    
    limit: Joi.number().integer().min(1).max(100).default(20)
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit must not exceed 100'
        })
});

// Chatbot message validation schema
const chatbotSchema = Joi.object({
    message: Joi.string().required().min(1).max(500)
        .messages({
            'string.base': 'Message must be a string',
            'string.empty': 'Message is required',
            'string.min': 'Message must not be empty',
            'string.max': 'Message must not exceed 500 characters',
            'any.required': 'Message is required'
        })
});

module.exports = {
    trajectorySearchSchema,
    customSearchSchema,
    popularPoisSchema,
    chatbotSchema
}; 