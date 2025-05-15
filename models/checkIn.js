/**
 * Gowalla Explorer - Check-In Model
 * Handles database operations for check-in data
 */

const db = require('../db');

/**
 * Get a user's check-ins within a time range
 * @param {number} userId - The user ID
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} - Promise resolving to an array of check-ins
 */
async function getUserTrajectory(userId, startDate, endDate) {
    const query = `
        SELECT 
            user_id as "userId",
            location_id as "locationId", 
            latitude as lat, 
            longitude as lng, 
            timestamp 
        FROM 
            check_ins 
        WHERE 
            user_id = $1 
            AND timestamp >= $2 
            AND timestamp <= $3 
        ORDER BY 
            timestamp
    `;
    
    const result = await db.query(query, [userId, startDate, endDate]);
    console.log('User trajectory query result:', result.rows);
    return result.rows;
}

/**
 * Find check-ins similar to a given check-in
 * @param {number} userId - The user ID to exclude
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Radius in kilometers
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @returns {Promise<Array>} - Promise resolving to an array of similar check-ins
 */
async function getSimilarCheckIns(userId, lat, lng, radius, startTime, endTime) {
    const query = `
        SELECT
            user_id as "userId",
            location_id as "locationId",
            latitude as lat,
            longitude as lng,
            timestamp
        FROM
            check_ins
        WHERE
            user_id != $1
            AND earth_distance(
                ll_to_earth(latitude, longitude),
                ll_to_earth($2, $3)
            ) <= $4 * 1000
            AND timestamp >= $5
            AND timestamp <= $6
        LIMIT 10
    `;
    
    const result = await db.query(query, [
        userId,
        lat,
        lng,
        radius,
        startTime,
        endTime
    ]);
    
    return result.rows;
}

/**
 * Search check-ins with custom criteria
 * @param {Object} criteria - Search criteria
 * @param {number} criteria.userId - User ID (optional)
 * @param {number} criteria.locationId - Location ID (optional)
 * @param {string} criteria.sortBy - Sort method
 * @param {number} criteria.limit - Maximum results
 * @returns {Promise<Array>} - Promise resolving to an array of check-ins
 */
async function searchCheckIns(criteria) {
    const { userId, locationId, sortBy, limit } = criteria;
    
    const conditions = [];
    const params = [];
    
    if (userId) {
        conditions.push(`user_id = $${params.length + 1}`);
        params.push(userId);
    }
    
    if (locationId) {
        conditions.push(`location_id = $${params.length + 1}`);
        params.push(locationId);
    }
    
    let orderBy = 'timestamp DESC';  // Default
    
    if (sortBy === 'time-asc') {
        orderBy = 'timestamp ASC';
    } else if (sortBy === 'distance') {
        const refLat = 40.7128;  // New York City coordinates as default
        const refLng = -74.0060;
        
        orderBy = `earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(${refLat}, ${refLng})) ASC`;
    } else if (sortBy === 'distance-desc') {
        const refLat = 40.7128;
        const refLng = -74.0060;
        
        orderBy = `earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(${refLat}, ${refLng})) DESC`;
    }
    
    const query = `
        SELECT
            user_id as "userId",
            location_id as "locationId",
            latitude as lat,
            longitude as lng,
            timestamp
        FROM
            check_ins
        WHERE
            ${conditions.join(' AND ')}
        ORDER BY
            ${orderBy}
        LIMIT $${params.length + 1}
    `;
    
    params.push(limit);
    
    const result = await db.query(query, params);
    console.log('Search check-ins result sample:', result.rows.slice(0, 3));
    return result.rows;
}

/**
 * Find popular points of interest in a region
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {Object} bounds - Geographic bounds
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} - Promise resolving to an array of POIs
 */
async function getPopularPOIs(startDate, endDate, bounds, limit) {
    const query = `
        SELECT
            location_id as "locationId",
            latitude as lat,
            longitude as lng,
            COUNT(*) as "checkInCount",
            COUNT(DISTINCT user_id) as "uniqueUsers"
        FROM
            check_ins
        WHERE
            timestamp >= $1
            AND timestamp <= $2
            AND latitude BETWEEN $3 AND $4
            AND longitude BETWEEN $5 AND $6
        GROUP BY
            location_id, latitude, longitude
        ORDER BY
            "checkInCount" DESC, "uniqueUsers" DESC
        LIMIT $7
    `;
    
    const result = await db.query(query, [
        startDate,
        endDate,
        bounds.south,
        bounds.north,
        bounds.west,
        bounds.east,
        limit
    ]);
    
    console.log('Popular POIs query result sample:', result.rows.slice(0, 3));
    return result.rows;
}

/**
 * Get a sample of available user IDs for autocomplete
 * @returns {Promise<Array>} - Promise resolving to an array of user IDs
 */
async function getAvailableUserIds() {
    const query = `
        SELECT DISTINCT user_id 
        FROM check_ins 
        ORDER BY user_id 
        LIMIT 100
    `;
    
    const result = await db.query(query);
    return result.rows.map(row => row.user_id);
}

/**
 * Get a sample of available location IDs for autocomplete
 * @returns {Promise<Array>} - Promise resolving to an array of location IDs
 */
async function getAvailableLocationIds() {
    const query = `
        SELECT DISTINCT location_id 
        FROM check_ins 
        ORDER BY location_id 
        LIMIT 100
    `;
    
    const result = await db.query(query);
    return result.rows.map(row => row.location_id);
}

module.exports = {
    getUserTrajectory,
    getSimilarCheckIns,
    searchCheckIns,
    getPopularPOIs,
    getAvailableUserIds,
    getAvailableLocationIds
}; 