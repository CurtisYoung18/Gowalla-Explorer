# Gowalla Explorer - Setup Instructions

This document provides step-by-step instructions to set up and run the Gowalla Explorer application.

## Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+) with PostGIS extension
- Access to a terminal/command line

## Setup Steps

### 1. Database Setup

1. Create a PostgreSQL database named `gowalla`:
   ```
   createdb gowalla
   ```

2. Enable the required PostgreSQL extensions:
   ```
   psql -d gowalla -c "CREATE EXTENSION postgis; CREATE EXTENSION cube; CREATE EXTENSION earthdistance;"
   ```

3. Initialize the database schema:
   ```
   npm run init-db
   ```

### 2. Data Import

You have two options for importing data:

#### Option A: Generate and use sample data (recommended for testing)

1. Generate sample data:
   ```
   npm run generate-sample
   ```

2. Import the sample data:
   ```
   npm run import-sample
   ```

#### Option B: Use the full Gowalla dataset

1. Download the Gowalla dataset from the Stanford Network Analysis Project (SNAP):
   https://snap.stanford.edu/data/loc-gowalla.html

2. Place the `loc-gowalla_totalCheckins.txt` file in the `dataset` directory

3. Update the path in `import.sql` if necessary

4. Import the full dataset:
   ```
   npm run import-data
   ```
   Note: This may take a long time depending on your system.

### 3. Environment Configuration

1. Make sure the `.env` file is properly configured with your database credentials
   and other settings. Update the values if needed.

### 4. Install Dependencies

1. Install all required packages:
   ```
   npm install
   ```

### 5. Start the Application

1. Start the server:
   ```
   npm start
   ```

2. For development with auto-restart:
   ```
   npm run dev
   ```

3. Access the application at http://localhost:3000

## Troubleshooting

- If you encounter database connection issues, check your PostgreSQL connection settings in the `.env` file.
- If the PostGIS extension is not available, you may need to install the PostgreSQL spatial extensions package.
- For any other issues, check the server logs for error messages.

## Optional Features

### Using Custom Port

To use a custom port, update the `PORT` value in the `.env` file. 