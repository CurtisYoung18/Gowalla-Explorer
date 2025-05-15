# Gowalla Explorer

A full-stack web application for exploring the Gowalla location-based social network dataset. This project allows users to visualize check-in trajectories, perform personalized searches, and discover popular points of interest in the Gowalla dataset.

## Features

### 1. Trajectory Query
- Search a user's check-in trajectory within a specific time range
- Visualize the trajectory on an interactive map
- Find spatially similar check-ins from other users within a customizable radius
- Export results as CSV

### 2. Personalized Search
- Search check-ins by user ID, location ID, or both
- Sort results by time or distance
- View check-ins on a map and in a detailed table
- Export results as CSV

### 3. AI Chatbot
- Ask questions about the Gowalla dataset
- Get help with using the application
- Explore features through conversational interface

### 4. Popular POIs
- Discover the most popular check-in locations within a region
- Select predefined regions or draw custom areas on the map
- View popularity rankings based on check-in count and unique users
- Export results as CSV

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
  - Leaflet.js for interactive maps
  - Flatpickr for date selection
  - Leaflet Draw for custom area selection
  
- **Backend**: Node.js with Express
  - RESTful API architecture with MVC pattern
  - PostgreSQL with PostGIS for geospatial data
  - Earth Distance module for proximity queries
  - Input validation with Joi
  - Security with Helmet and rate limiting

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+) with PostGIS extension
- Access to a terminal/command line

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/CurtisYoung18/Gowalla-Explorer.git
   cd gowalla-explorer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the provided `.env.example`:
   ```
   cp .env.example .env
   ```
   Update the values in the `.env` file with your configuration.

4. Set up the PostgreSQL database:
   ```
   # Create the database
   createdb gowalla
   
   # Enable the required extensions
   psql -d gowalla -c "CREATE EXTENSION postgis; CREATE EXTENSION cube; CREATE EXTENSION earthdistance;"
   
   # Initialize the database schema
   npm run init-db
   ```

5. You have two options for data:

   **Option A: Use sample data (faster, recommended for testing)**
   ```
   # Generate sample data
   npm run generate-sample
   
   # Import sample data
   npm run import-sample
   ```

   **Option B: Use the full Gowalla dataset**
   - Download the dataset from [SNAP](https://snap.stanford.edu/data/loc-gowalla.html)
   - Place the `loc-gowalla_totalCheckins.txt` file in the `dataset` directory
   - Update the path in `import.sql` if necessary
   - Import the full dataset: `npm run import-data`

6. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

7. Access the application at http://localhost:3000

## API Documentation

The application provides the following API endpoints:

### GET /api/available-userids
Returns a list of available user IDs for autocomplete suggestions.

**Response:**
```json
{
  "userIds": [1, 2, 3, ...]
}
```

### GET /api/available-locationids
Returns a list of available location IDs for autocomplete suggestions.

**Response:**
```json
{
  "locationIds": [10, 20, 30, ...]
}
```

### POST /api/trajectory-search
Search for a user's trajectory within a time range.

**Request Body:**
```json
{
  "userId": 1,
  "startDate": "2010-01-01",
  "endDate": "2010-12-31",
  "radius": 1.0
}
```

**Response:**
```json
{
  "userId": 1,
  "startDate": "2010-01-01",
  "endDate": "2010-12-31",
  "checkIns": [
    {
      "locationId": 123,
      "lat": 30.267153,
      "lng": -97.743057,
      "timestamp": "2010-07-24T20:08:11Z",
      "similarCheckIns": [
        {
          "userId": 2,
          "locationId": 124,
          "lat": 30.268121,
          "lng": -97.744267,
          "timestamp": "2010-07-24T19:45:22Z"
        },
        ...
      ]
    },
    ...
  ]
}
```

### POST /api/custom-search
Search check-ins with custom criteria.

**Request Body:**
```json
{
  "userId": 1,
  "locationId": null,
  "sortBy": "time",
  "limit": 100
}
```

**Response:**
```json
{
  "userId": 1,
  "locationId": null,
  "sortBy": "time",
  "checkIns": [
    {
      "userId": 1,
      "locationId": 123,
      "lat": 30.267153,
      "lng": -97.743057,
      "timestamp": "2010-07-24T20:08:11Z"
    },
    ...
  ]
}
```

### POST /api/popular-pois
Find popular points of interest in a region.

**Request Body:**
```json
{
  "startDate": "2010-01-01",
  "endDate": "2010-12-31",
  "bounds": {
    "north": 49.38,
    "south": 25.82,
    "east": -66.95,
    "west": -124.39
  },
  "limit": 20
}
```

**Response:**
```json
{
  "startDate": "2010-01-01",
  "endDate": "2010-12-31",
  "bounds": {
    "north": 49.38,
    "south": 25.82,
    "east": -66.95,
    "west": -124.39
  },
  "pois": [
    {
      "locationId": 123,
      "lat": 30.267153,
      "lng": -97.743057,
      "checkInCount": 543,
      "uniqueUsers": 216
    },
    ...
  ]
}
```

### POST /api/chatbot
Process a message for the chatbot.

**Request Body:**
```json
{
  "message": "What is the Gowalla dataset?"
}
```

**Response:**
```json
{
  "reply": "Gowalla was a location-based social network launched in 2009. Users could 'check in' at various locations using their mobile devices. The Gowalla dataset contains check-in data from the service before it shut down in 2012."
}
```

## Example Queries

### Find a User's Trajectory
To explore check-ins for User ID 1 during July 2010 with a 1km radius:
- Enter User ID: 1
- Start Date: 2010-07-01
- End Date: 2010-07-31
- Radius: 1.0 km

### Find Check-ins at a Specific Location
To find all check-ins at Location ID 123:
- Leave User ID empty
- Enter Location ID: 123
- Sort By: Time (newest first)
- Limit: 100

### Find Popular POIs in a Region
To find the top 20 locations in the United States during 2010:
- Select Region: United States
- Start Date: 2010-01-01
- End Date: 2010-12-31
- Number of Top POIs: 20

## Data Processing
This application uses the Gowalla dataset collected by the authors of:
> Cho, E., Myers, S.A., and Leskovec, J. Friendship and Mobility: User Movement in Location-Based Social Networks. ACM SIGKDD International Conference on Knowledge Discovery and Data Mining (KDD), 2011.

The dataset contains check-ins made between February 2009 and October 2010, with each check-in having the following format:
```
[user]  [check-in time]  [latitude]  [longitude]  [location id]
```

For example:
```
0	2010-10-19T23:55:27Z	30.2359091167	-97.7951395833	22847
```

## Project Structure
```
gowalla-explorer/
├── dataset/                # Contains Gowalla dataset files
├── models/                 # Data models
│   ├── checkIn.js          # Check-in data operations
│   ├── chatbot.js          # Chatbot functionality
│   └── validation.js       # Input validation schemas
├── public/                 # Static frontend files
│   ├── css/                # CSS stylesheets
│   ├── js/                 # JavaScript files
│   ├── index.html          # Home page
│   ├── trajectory.html     # Trajectory query page
│   ├── search.html         # Personalized search page
│   ├── chatbot.html        # AI chatbot page
│   └── popular.html        # Popular POIs page
├── routes/                 # Express route handlers
│   └── api.js              # API endpoints
├── db.js                   # Database connection
├── server.js               # Express application
├── generate_sample_data.js # Script to generate sample data
├── init.sql                # Database schema initialization
├── import.sql              # Full data import script
├── import_sample.sql       # Sample data import script
├── SETUP.md                # Detailed setup instructions
├── CHANGES.md              # Changes and additions log
├── package.json            # Project dependencies
├── .env                    # Environment variables (not in repo)
└── README.md               # Project documentation
```

## Performance Considerations
- The application uses spatial indexes to optimize geospatial queries
- Results are paginated to handle large data volumes
- The database schema includes aggregation views for common queries
- Server-side filtering reduces data transfer between the server and client
- Model-View-Controller (MVC) pattern for improved code organization and maintainability

## Security Features
- Input validation with Joi for all API endpoints
- Protection against common web vulnerabilities with Helmet
- API rate limiting to prevent abuse
- Environment variables for sensitive configuration
- Prepared SQL statements to prevent SQL injection

## Acknowledgments
- This project was developed for INFS4205/7205 Type II project
- Gowalla dataset by Stanford Network Analysis Project (SNAP)
- Maps powered by Leaflet and OpenStreetMap
- User interface components enhanced with Flatpickr and Leaflet Draw

## License
MIT License
