-- Initialize Gowalla Explorer Database
-- This script creates the necessary tables and indexes for the application

-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable earthdistance and cube extensions for distance calculations
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Drop tables if they exist (for clean initialization)
DROP TABLE IF EXISTS check_ins;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS locations;

-- Create users table
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    total_checkins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create locations table
CREATE TABLE locations (
    location_id INTEGER PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    total_checkins INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Add a geography column for spatial queries
    geom GEOGRAPHY(POINT, 4326)
);

-- Create check-ins table
CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Add a geography column for spatial queries
    geom GEOGRAPHY(POINT, 4326),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_checkins_user_id ON check_ins(user_id);
CREATE INDEX idx_checkins_location_id ON check_ins(location_id);
CREATE INDEX idx_checkins_timestamp ON check_ins(timestamp);
CREATE INDEX idx_checkins_coords ON check_ins(latitude, longitude);
CREATE INDEX idx_checkins_geom ON check_ins USING GIST(geom);
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- Create a GIN index for fast full-text search if needed later
-- CREATE INDEX idx_locations_name ON locations USING GIN(to_tsvector('english', name));

-- Create a trigger function to update the geography column when coordinates are inserted/updated
CREATE OR REPLACE FUNCTION update_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the geography column for check-ins
CREATE TRIGGER update_checkins_geom
BEFORE INSERT OR UPDATE ON check_ins
FOR EACH ROW
EXECUTE FUNCTION update_geom();

-- Create a trigger to automatically update the geography column for locations
CREATE TRIGGER update_locations_geom
BEFORE INSERT OR UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_geom();

-- Create a function to update user and location statistics
CREATE OR REPLACE FUNCTION update_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user stats
    UPDATE users
    SET total_checkins = (SELECT COUNT(*) FROM check_ins WHERE user_id = NEW.user_id)
    WHERE user_id = NEW.user_id;
    
    -- Update location stats
    UPDATE locations
    SET 
        total_checkins = (SELECT COUNT(*) FROM check_ins WHERE location_id = NEW.location_id),
        unique_users = (SELECT COUNT(DISTINCT user_id) FROM check_ins WHERE location_id = NEW.location_id)
    WHERE location_id = NEW.location_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update stats when a check-in is added
CREATE TRIGGER update_checkin_stats
AFTER INSERT ON check_ins
FOR EACH ROW
EXECUTE FUNCTION update_stats();

-- Create some views for common queries

-- View for popular locations
CREATE OR REPLACE VIEW popular_locations AS
SELECT
    l.location_id,
    l.latitude,
    l.longitude,
    l.total_checkins,
    l.unique_users
FROM
    locations l
ORDER BY
    l.total_checkins DESC, l.unique_users DESC
LIMIT 100;

-- View for user check-in summaries
CREATE OR REPLACE VIEW user_checkin_summary AS
SELECT
    u.user_id,
    u.total_checkins,
    COUNT(DISTINCT c.location_id) AS unique_locations,
    MIN(c.timestamp) AS first_checkin,
    MAX(c.timestamp) AS last_checkin
FROM
    users u
JOIN
    check_ins c ON u.user_id = c.user_id
GROUP BY
    u.user_id, u.total_checkins;

-- View for recent check-ins
CREATE OR REPLACE VIEW recent_checkins AS
SELECT
    c.id,
    c.user_id,
    c.location_id,
    c.latitude,
    c.longitude,
    c.timestamp
FROM
    check_ins c
ORDER BY
    c.timestamp DESC
LIMIT 1000; 