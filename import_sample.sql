-- Import Sample Gowalla Dataset
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
COPY temp_checkins FROM '/Users/magicyoung/Desktop/Gowalla_Explorer/dataset/sample_gowalla_checkins.txt' DELIMITER E'\t';

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
