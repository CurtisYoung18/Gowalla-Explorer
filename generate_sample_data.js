/**
 * Gowalla Explorer - Sample Data Generator
 * Generates sample check-in data for testing without the full dataset
 */

const fs = require('fs');
const path = require('path');

// Ensure the dataset directory exists
const datasetDir = path.join(__dirname, 'dataset');
if (!fs.existsSync(datasetDir)) {
    fs.mkdirSync(datasetDir);
}

// Configuration
const NUM_USERS = 50;
const NUM_LOCATIONS = 200;
const NUM_CHECKINS = 5000;

// Random location points centered on major US cities
const CITIES = [
    { name: "New York", lat: 40.7128, lng: -74.0060 },
    { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
    { name: "Chicago", lat: 41.8781, lng: -87.6298 },
    { name: "Houston", lat: 29.7604, lng: -95.3698 },
    { name: "Phoenix", lat: 33.4484, lng: -112.0740 },
    { name: "Philadelphia", lat: 39.9526, lng: -75.1652 },
    { name: "San Antonio", lat: 29.4241, lng: -98.4936 },
    { name: "San Diego", lat: 32.7157, lng: -117.1611 },
    { name: "Dallas", lat: 32.7767, lng: -96.7970 },
    { name: "San Francisco", lat: 37.7749, lng: -122.4194 }
];

// Generate random data
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomLocation(city) {
    // Generate a location within ~10km of the city center
    const latVariance = getRandomFloat(-0.1, 0.1);
    const lngVariance = getRandomFloat(-0.1, 0.1);
    return {
        lat: city.lat + latVariance,
        lng: city.lng + lngVariance
    };
}

// Generate sample data
console.log('Generating sample data...');

// Create users (1 to NUM_USERS)
const users = Array.from({ length: NUM_USERS }, (_, i) => i + 1);
console.log(`Generated ${users.length} users`);

// Create locations (1 to NUM_LOCATIONS)
const locations = [];
for (let i = 1; i <= NUM_LOCATIONS; i++) {
    const city = CITIES[getRandomInt(0, CITIES.length - 1)];
    const { lat, lng } = getRandomLocation(city);
    locations.push({
        id: i,
        lat,
        lng
    });
}
console.log(`Generated ${locations.length} locations`);

// Create check-ins
const startDate = new Date('2010-01-01');
const endDate = new Date('2011-12-31');
const checkins = [];

for (let i = 0; i < NUM_CHECKINS; i++) {
    const userId = users[getRandomInt(0, users.length - 1)];
    const location = locations[getRandomInt(0, locations.length - 1)];
    const timestamp = getRandomDate(startDate, endDate).toISOString();
    
    checkins.push({
        userId,
        timestamp,
        lat: location.lat,
        lng: location.lng,
        locationId: location.id
    });
}

// Sort by timestamp
checkins.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
console.log(`Generated ${checkins.length} check-ins`);

// Export to file
const outputFile = path.join(datasetDir, 'sample_gowalla_checkins.txt');
const outputStream = fs.createWriteStream(outputFile);

// Write header if needed
// outputStream.write('# [user]\t[check-in time]\t[latitude]\t[longitude]\t[location id]\n');

// Write data
checkins.forEach(checkin => {
    outputStream.write(`${checkin.userId}\t${checkin.timestamp}\t${checkin.lat}\t${checkin.lng}\t${checkin.locationId}\n`);
});

outputStream.end();
console.log(`Sample data written to ${outputFile}`);

// Create SQL import script for sample data
const sampleImportFile = path.join(__dirname, 'import_sample.sql');
const sampleImportStream = fs.createWriteStream(sampleImportFile);

sampleImportStream.write(`-- Import Sample Gowalla Dataset
-- This script imports data from the sample_gowalla_checkins.txt file

-- First, create a temporary table to hold the raw data
DROP TABLE IF EXISTS temp_checkins;
CREATE TABLE temp_checkins (
    user_id INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_id INTEGER
);

-- Import data from the file
-- Format is: [user]    [check-in time]    [latitude]    [longitude]    [location id]
-- Sample: 1    2010-10-19T23:55:27Z    30.2359091167    -97.7951395833    22847

-- Use the COPY command to load the data
COPY temp_checkins FROM '${path.join(datasetDir, 'sample_gowalla_checkins.txt')}' DELIMITER E'\\t';

-- Insert unique users into the users table
INSERT INTO users (user_id)
SELECT DISTINCT user_id
FROM temp_checkins
ON CONFLICT (user_id) DO NOTHING;

-- Insert unique locations into the locations table
INSERT INTO locations (location_id, latitude, longitude)
SELECT DISTINCT location_id, latitude, longitude
FROM temp_checkins
ON CONFLICT (location_id) DO NOTHING;

-- Insert check-ins into the check-ins table
INSERT INTO check_ins (user_id, location_id, latitude, longitude, timestamp)
SELECT user_id, location_id, latitude, longitude, timestamp
FROM temp_checkins;

-- Clean up the temporary table
DROP TABLE temp_checkins;

-- Update statistics
ANALYZE users;
ANALYZE locations;
ANALYZE check_ins;

-- Provide a summary of imported data
SELECT 'Total users imported: ' || COUNT(*) AS user_count FROM users;
SELECT 'Total locations imported: ' || COUNT(*) AS location_count FROM locations;
SELECT 'Total check-ins imported: ' || COUNT(*) AS checkin_count FROM check_ins;
`);

sampleImportStream.end();
console.log(`Sample import SQL script written to ${sampleImportFile}`);

console.log('\nTo use this sample data:');
console.log('1. Initialize the database schema: npm run init-db');
console.log('2. Import the sample data: psql -U postgres -d gowalla -f import_sample.sql');
console.log('3. Start the server: npm start'); 