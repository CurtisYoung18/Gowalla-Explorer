/**
 * Gowalla Explorer - Database Connection
 * Handles connection to PostgreSQL database
 */

// Import dependencies
const { Pool } = require('pg');
require('dotenv').config();

// Configure database connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // Connection timeout in milliseconds
    connectionTimeoutMillis: 5000,
    // How long a client is allowed to remain idle before being closed
    idleTimeoutMillis: 30000,
    // Maximum number of clients in the pool
    max: 20
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to PostgreSQL database at:', res.rows[0].now);
    }
});

// Handle connection errors
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    // Try to reconnect
    console.log('Attempting to reconnect to database...');
});

/**
 * Executes a database query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} Promise that resolves with the query results
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration: `${duration}ms`, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
};

/**
 * Gets a client from the pool
 * For transactions or multiple queries in sequence
 * @returns {Promise} Promise that resolves with a database client
 */
const getClient = async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Override release method to log duration
    client.release = () => {
        release.apply(client);
        console.log('Client released back to pool');
    };
    
    // Override query method to log queries
    client.query = async (text, params) => {
        const start = Date.now();
        try {
            const res = await query.apply(client, [text, params]);
            const duration = Date.now() - start;
            console.log('Executed query (with client)', { text, duration: `${duration}ms`, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Query error (with client):', error);
            throw error;
        }
    };
    
    return client;
};

module.exports = {
    query,
    getClient,
    pool
}; 