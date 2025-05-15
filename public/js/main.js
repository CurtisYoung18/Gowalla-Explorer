/**
 * Gowalla Explorer - Main JavaScript
 * Handles all frontend functionality for the application
 */

// Global variables
let map = null;
let searchMap = null;
let popularMap = null;
let markers = [];
let trajectoryData = null;
let searchData = null;
let popularData = null;
let drawControl = null;
let drawnItems = null;
let currentBounds = null;

// API endpoint URLs
const API_BASE_URL = '/api';
const ENDPOINTS = {
    trajectorySearch: `${API_BASE_URL}/trajectory-search`,
    customSearch: `${API_BASE_URL}/custom-search`,
    chatbot: `${API_BASE_URL}/chatbot`,
    availableUserIds: `${API_BASE_URL}/available-userids`,
    availableLocationIds: `${API_BASE_URL}/available-locationids`,
    popularPois: `${API_BASE_URL}/popular-pois`
};

// Constants
const DEFAULT_MAP_CENTER = [39.8283, -98.5795]; // Center of the US
const DEFAULT_MAP_ZOOM = 2;
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize appropriate functionality based on the current page
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('trajectory.html')) {
        initTrajectoryPage();
    } else if (currentPath.includes('search.html')) {
        initSearchPage();
    } else if (currentPath.includes('chatbot.html')) {
        initChatbotPage();
    } else if (currentPath.includes('popular.html')) {
        initPopularPage();
    } else {
        // Home page or default
        initHomePage();
    }

    // Debug log for map elements
    console.log('Map elements on page:');
    document.querySelectorAll('.map-container').forEach(el => {
        console.log(el.id, 'dimensions:', el.offsetWidth, 'x', el.offsetHeight);
    });
});

// Utility functions

/**
 * Updates debug information for map containers 
 * @param {string} mapId - The ID of the map container
 */
function updateMapDebugInfo(mapId) {
    const mapContainer = document.getElementById(mapId);
    const debugContainer = document.querySelector('.map-debug');
    
    if (mapContainer && debugContainer) {
        // Get dimensions
        const width = mapContainer.offsetWidth;
        const height = mapContainer.offsetHeight;
        
        // Update debug info
        const widthSpan = document.getElementById(`${mapId}-width`) || document.getElementById('map-width');
        const heightSpan = document.getElementById(`${mapId}-height`) || document.getElementById('map-height');
        
        if (widthSpan) widthSpan.textContent = width;
        if (heightSpan) heightSpan.textContent = height;
        
        // Show debug info if dimensions are unusual
        if (width < 100 || height < 100) {
            debugContainer.style.display = 'block';
            console.warn(`Map container ${mapId} has unusual dimensions: ${width}x${height}`);
        }
    }
}

/**
 * Ensures a map is properly initialized and displayed
 * @param {Object} mapObject - The Leaflet map object
 * @param {string} mapId - The ID of the map container
 */
function ensureMapDisplayed(mapObject, mapId) {
    if (!mapObject) return;
    
    // Force map to recalculate its size
    mapObject.invalidateSize();
    
    // Update debug info
    updateMapDebugInfo(mapId);
    
    // Double check dimensions after a delay and try to fix if still wrong
    setTimeout(() => {
        const mapContainer = document.getElementById(mapId);
        if (mapContainer && mapContainer.offsetHeight < 100) {
            console.warn(`Map container ${mapId} still has incorrect height, attempting to fix...`);
            mapContainer.style.height = '500px';
            mapObject.invalidateSize();
            updateMapDebugInfo(mapId);
        }
    }, 300);
}

/**
 * Shows an error message to the user
 * @param {string} message - The error message to display
 * @param {string} elementId - The ID of the element to show the message in
 */
function showError(message, elementId = 'error-message') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

/**
 * Shows a success message to the user
 * @param {string} message - The success message to display
 * @param {string} elementId - The ID of the element to show the message in
 */
function showSuccess(message, elementId = 'success-message') {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    }
}

/**
 * Shows the loading indicator
 */
function showLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}

/**
 * Hides the loading indicator
 */
function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

/**
 * Validates if a value is a positive integer
 * @param {*} value - The value to validate
 * @returns {boolean} True if the value is a positive integer
 */
function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

/**
 * Formats a date as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a timestamp for display
 * @param {string|number} timestamp - The timestamp to format
 * @returns {string} The formatted date and time
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

/**
 * Creates a CSV string from an array of objects
 * @param {Array} data - The data array to convert
 * @returns {string} The CSV string
 */
function createCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Handle values with commas by wrapping in quotes
            return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

/**
 * Downloads data as a CSV file
 * @param {Array} data - The data to download
 * @param {string} filename - The name of the file
 */
function downloadCSV(data, filename) {
    const csv = createCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Fetches data from the API
 * @param {string} url - The API endpoint
 * @param {Object} data - The data to send in the request body
 * @returns {Promise} A promise that resolves with the response data
 */
async function fetchAPI(url, data) {
    try {
        showLoading();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'An error occurred while fetching data');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showError(error.message);
        throw error;
    } finally {
        hideLoading();
    }
}

/**
 * Creates a marker for the map
 * @param {Object} data - The marker data
 * @param {number} data.lat - Latitude
 * @param {number} data.lng - Longitude
 * @param {Object} options - Additional options
 * @returns {Object} The Leaflet marker
 */
function createMarker(data, options = {}) {
    const { lat, lng } = data;
    
    // Default options for markers
    const markerOptions = {
        title: options.title || '',
        riseOnHover: true,
        ...options
    };
    
    return L.marker([lat, lng], markerOptions);
}

/**
 * Creates a popup content for a marker
 * @param {Object} data - The data for the popup
 * @returns {string} HTML content for the popup
 */
function createPopupContent(data) {
    let content = '<div class="marker-info">';
    
    if (data.title) {
        content += `<h4>${data.title}</h4>`;
    }
    
    if (data.userId !== undefined) {
        content += `<p><strong>User ID:</strong> ${data.userId}</p>`;
    }
    
    if (data.locationId !== undefined) {
        content += `<p><strong>Location ID:</strong> ${data.locationId}</p>`;
    }
    
    if (data.lat && data.lng) {
        content += `<p><strong>Coordinates:</strong> ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}</p>`;
    }
    
    if (data.timestamp) {
        content += `<p><strong>Time:</strong> ${formatTimestamp(data.timestamp)}</p>`;
    }
    
    if (data.checkInCount) {
        content += `<p><strong>Check-ins:</strong> ${data.checkInCount}</p>`;
    }
    
    if (data.uniqueUsers) {
        content += `<p><strong>Unique Users:</strong> ${data.uniqueUsers}</p>`;
    }
    
    content += '</div>';
    return content;
}

/**
 * Clears all markers from a map
 * @param {Array} markerArray - The array of markers to clear
 * @param {Object} mapObject - The map object
 */
function clearMarkers(markerArray, mapObject) {
    if (markerArray && markerArray.length > 0) {
        markerArray.forEach(marker => {
            if (mapObject) {
                mapObject.removeLayer(marker);
            }
        });
    }
    
    // Reset the markers array
    markerArray.length = 0;
}

// Trajectory Page functions

/**
 * Initializes the trajectory page
 */
function initTrajectoryPage() {
    console.log('Initializing trajectory page');
    
    // Make sure the map container exists and has dimensions
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        console.log('Map container found, dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
        
        // Ensure the container has a height (set explicitly)
        mapContainer.style.height = '500px';
        console.log('Setting map height to 500px');
        
        // Initialize the map after a small delay to ensure container is properly styled
        setTimeout(() => {
            // Initialize the map
            map = L.map('map', {
                minZoom: 2,
                maxZoom: 18
            }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
            
            L.tileLayer(TILE_URL, {
                attribution: MAP_ATTRIBUTION
            }).addTo(map);
            
            console.log('Map initialized');
            
            // Force a map refresh and ensure it's displayed
            ensureMapDisplayed(map, 'map');
        }, 100);
    } else {
        console.error('Map container element not found!');
    }
    
    // Initialize datepickers
    if (window.flatpickr) {
        flatpickr('#start-date', {
            dateFormat: 'Y-m-d',
            defaultDate: '2010-01-01'
        });
        
        flatpickr('#end-date', {
            dateFormat: 'Y-m-d',
            defaultDate: '2011-12-31'
        });
    }
    
    // Set up event listeners
    const trajectoryForm = document.getElementById('trajectory-form');
    if (trajectoryForm) {
        trajectoryForm.addEventListener('submit', handleTrajectorySearch);
    }
    
    const loadSampleBtn = document.getElementById('load-sample');
    if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', loadSampleTrajectory);
    }
    
    const exportResultsBtn = document.getElementById('export-results');
    if (exportResultsBtn) {
        exportResultsBtn.addEventListener('click', exportTrajectoryResults);
    }
    
    // Fetch available user IDs for autocomplete
    fetchAvailableUserIds();
    
    // Automatically load sample data to display on map
    setTimeout(() => {
        loadSampleTrajectory();
    }, 500);
}

/**
 * Handles the trajectory search form submission
 * @param {Event} event - The form submission event
 */
async function handleTrajectorySearch(event) {
    event.preventDefault();
    
    // Get form data
    const userId = document.getElementById('user-id').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const radius = document.getElementById('radius').value;
    
    // Validate inputs
    if (!isPositiveInteger(userId)) {
        showError('Please enter a valid user ID');
        return;
    }
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showError('Start date must be before end date');
        return;
    }
    
    if (radius <= 0 || radius > 100) {
        showError('Radius must be between 0.1 and 100 km');
        return;
    }
    
    try {
        // Call the API
        const data = await fetchAPI(ENDPOINTS.trajectorySearch, {
            userId: parseInt(userId),
            startDate,
            endDate,
            radius: parseFloat(radius)
        });
        
        // Process and display results
        displayTrajectoryResults(data);
    } catch (error) {
        // Error is already displayed by fetchAPI
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
    }
}

/**
 * Displays trajectory search results on the map and in the table
 * @param {Object} data - The trajectory data from the API
 */
function displayTrajectoryResults(data) {
    // Save the data for export
    trajectoryData = data;
    
    // Log the full response for debugging
    console.log('Trajectory search response:', data);
    
    // Clear previous markers
    clearMarkers(markers, map);
    
    // Check if we have data
    if (!data || !data.checkIns || data.checkIns.length === 0) {
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
        return;
    }
    
    // Show results section
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('no-results').style.display = 'none';
    
    // Ensure map is properly displayed after results section is shown
    setTimeout(() => {
        if (map) {
            ensureMapDisplayed(map, 'map');
        }
    }, 100);
    
    // Update summary
    const summaryElement = document.getElementById('trajectory-summary');
    if (summaryElement) {
        summaryElement.textContent = `Found ${data.checkIns.length} check-ins for User ${data.userId} between ${data.startDate} and ${data.endDate}`;
    }
    
    // Add markers to the map
    const checkInCoordinates = [];
    const pathCoordinates = [];
    const bounds = L.latLngBounds();
    
    data.checkIns.forEach((checkIn, index) => {
        const { lat, lng, locationId, timestamp, similarCheckIns } = checkIn;
        
        // Create marker
        const markerData = {
            lat,
            lng,
            userId: data.userId,
            locationId,
            timestamp,
            title: `Check-in #${index + 1}`
        };
        
        const marker = createMarker(markerData, {
            title: `Location ${locationId}`,
            icon: L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            })
        });
        
        marker.bindPopup(createPopupContent(markerData));
        marker.addTo(map);
        markers.push(marker);
        
        // Extend bounds
        bounds.extend([lat, lng]);
        
        // Add to path coordinates
        pathCoordinates.push([lat, lng]);
        checkInCoordinates.push({ lat, lng, locationId, timestamp });
        
        // Add similar check-ins if any
        if (similarCheckIns && similarCheckIns.length > 0) {
            similarCheckIns.forEach(similar => {
                const similarMarker = createMarker(similar, {
                    title: `Similar to Location ${locationId}`,
                    icon: L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        className: 'similar-marker'
                    })
                });
                
                similarMarker.bindPopup(createPopupContent({
                    ...similar,
                    title: `Similar Check-in by User ${similar.userId}`
                }));
                
                similarMarker.addTo(map);
                markers.push(similarMarker);
                
                // Extend bounds for similar check-ins
                bounds.extend([similar.lat, similar.lng]);
            });
        }
    });
    
    // Draw path between check-ins
    if (pathCoordinates.length > 1) {
        const path = L.polyline(pathCoordinates, {
            color: 'blue',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);
        
        markers.push(path);
    }
    
    // Fit the map to show all markers
    if (!bounds.isValid()) {
        map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
    } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
    
    // Update table
    updateTrajectoryTable(data.checkIns);
}

/**
 * Updates the trajectory results table
 * @param {Array} checkIns - The check-ins data
 */
function updateTrajectoryTable(checkIns) {
    const tableBody = document.querySelector('#trajectory-table tbody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add rows for each check-in
    checkIns.forEach((checkIn, index) => {
        const row = document.createElement('tr');
        
        // 添加console调试以检查数据
        console.log(`Check-in ${index}:`, checkIn);
        console.log(`  userId type: ${typeof checkIn.userId}, value: ${checkIn.userId}`);
        console.log(`  locationId type: ${typeof checkIn.locationId}, value: ${checkIn.locationId}`);
        console.log(`  Object keys:`, Object.keys(checkIn));
        
        // 尝试不同的大小写方式获取数据
        const userId = checkIn.userId || checkIn.userid || checkIn.USERID || checkIn["userId"] || 'N/A';
        const locationId = checkIn.locationId || checkIn.locationid || checkIn.LOCATIONID || checkIn["locationId"] || 'N/A';
        
        row.innerHTML = `
            <td>${userId}</td>
            <td>${locationId}</td>
            <td>${checkIn.lat.toFixed(6)}</td>
            <td>${checkIn.lng.toFixed(6)}</td>
            <td>${formatTimestamp(checkIn.timestamp)}</td>
            <td>${checkIn.similarCheckIns ? checkIn.similarCheckIns.length : 0}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Loads sample trajectory data for demo purposes
 */
function loadSampleTrajectory() {
    // Set sample values in the form
    document.getElementById('user-id').value = '1'; // 使用有效的用户ID
    document.getElementById('start-date')._flatpickr.setDate('2010-07-01');
    document.getElementById('end-date')._flatpickr.setDate('2010-07-31');
    document.getElementById('radius').value = '1';
    
    console.log('Loading sample trajectory data for user ID: 1');
    
    // Submit the form
    document.getElementById('trajectory-form').dispatchEvent(new Event('submit'));
}

/**
 * Exports trajectory results as CSV
 */
function exportTrajectoryResults() {
    if (!trajectoryData || !trajectoryData.checkIns || trajectoryData.checkIns.length === 0) {
        showError('No data to export');
        return;
    }
    
    const exportData = trajectoryData.checkIns.map((checkIn, index) => {
        return {
            index: index + 1,
            user_id: trajectoryData.userId,
            location_id: checkIn.locationId,
            latitude: checkIn.lat,
            longitude: checkIn.lng,
            timestamp: formatTimestamp(checkIn.timestamp),
            similar_checkins: checkIn.similarCheckIns ? checkIn.similarCheckIns.length : 0
        };
    });
    
    downloadCSV(exportData, `trajectory_user_${trajectoryData.userId}_${formatDate(new Date())}.csv`);
    showSuccess('Data exported successfully');
}

/**
 * Fetches available user IDs for autocomplete
 */
async function fetchAvailableUserIds() {
    try {
        const data = await fetch(ENDPOINTS.availableUserIds).then(res => res.json());
        
        if (data && data.userIds && data.userIds.length > 0) {
            setupUserIdAutocomplete(data.userIds);
        }
    } catch (error) {
        console.error('Error fetching user IDs:', error);
    }
}

/**
 * Sets up autocomplete for user ID input fields
 * @param {Array} userIds - Available user IDs
 */
function setupUserIdAutocomplete(userIds) {
    const userIdInput = document.getElementById('user-id');
    const suggestionsList = document.getElementById('user-id-suggestions');
    
    if (!userIdInput || !suggestionsList) return;
    
    // Add input event listener
    userIdInput.addEventListener('input', () => {
        const value = userIdInput.value;
        suggestionsList.innerHTML = '';
        
        if (!value) {
            suggestionsList.style.display = 'none';
            return;
        }
        
        // Filter user IDs that start with the input value
        const matchingIds = userIds.filter(id => id.toString().startsWith(value));
        
        if (matchingIds.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }
        
        // Display up to 5 suggestions
        matchingIds.slice(0, 5).forEach(id => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = id;
            
            item.addEventListener('click', () => {
                userIdInput.value = id;
                suggestionsList.style.display = 'none';
            });
            
            suggestionsList.appendChild(item);
        });
        
        suggestionsList.style.display = 'block';
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', event => {
        if (event.target !== userIdInput && event.target !== suggestionsList) {
            suggestionsList.style.display = 'none';
        }
    });
}

// Search page functions

/**
 * Initializes the search page
 */
function initSearchPage() {
    console.log('Initializing search page');
    
    // Make sure the map container exists and has dimensions
    const mapContainer = document.getElementById('search-map');
    if (mapContainer) {
        console.log('Search map container found, dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
        
        // Ensure the container has a height (set explicitly)
        mapContainer.style.height = '500px';
        console.log('Setting search map height to 500px');
        
        // Initialize the map after a small delay to ensure container is properly styled
        setTimeout(() => {
            // Initialize the map
            searchMap = L.map('search-map', {
                minZoom: 2,
                maxZoom: 18
            }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
            
            L.tileLayer(TILE_URL, {
                attribution: MAP_ATTRIBUTION
            }).addTo(searchMap);
            
            console.log('Search map initialized');
            
            // Force a map refresh and ensure it's displayed
            ensureMapDisplayed(searchMap, 'search-map');
        }, 100);
    } else {
        console.error('Search map container element not found!');
    }
    
    // Set up event listeners
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleCustomSearch);
    }
    
    const loadSampleBtn = document.getElementById('load-sample-search');
    if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', loadSampleSearch);
    }
    
    const exportResultsBtn = document.getElementById('export-search-results');
    if (exportResultsBtn) {
        exportResultsBtn.addEventListener('click', exportSearchResults);
    }
    
    // Fetch available user IDs and location IDs for autocomplete
    fetchAvailableUserIds();
    fetchAvailableLocationIds();
    
    // Automatically load sample data to display on map
    setTimeout(() => {
        loadSampleSearch();
    }, 500);
}

/**
 * Handles the custom search form submission
 * @param {Event} event - The form submission event
 */
async function handleCustomSearch(event) {
    event.preventDefault();
    
    // Get form data
    const userId = document.getElementById('search-user-id').value;
    const locationId = document.getElementById('search-location-id').value;
    const sortBy = document.getElementById('sort-by').value;
    const limit = document.getElementById('limit').value;
    
    // Validate inputs
    if (!userId && !locationId) {
        showError('Please enter either a user ID or a location ID');
        return;
    }
    
    if (userId && !isPositiveInteger(userId)) {
        showError('Please enter a valid user ID');
        return;
    }
    
    if (locationId && !isPositiveInteger(locationId)) {
        showError('Please enter a valid location ID');
        return;
    }
    
    if (!isPositiveInteger(limit) || parseInt(limit) < 10 || parseInt(limit) > 1000) {
        showError('Limit must be between 10 and 1000');
        return;
    }
    
    try {
        // Call the API
        const data = await fetchAPI(ENDPOINTS.customSearch, {
            userId: userId ? parseInt(userId) : null,
            locationId: locationId ? parseInt(locationId) : null,
            sortBy,
            limit: parseInt(limit)
        });
        
        // Process and display results
        displaySearchResults(data);
    } catch (error) {
        // Error is already displayed by fetchAPI
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
    }
}

/**
 * Displays search results on the map and in the table
 * @param {Object} data - The search data from the API
 */
function displaySearchResults(data) {
    // Save the data for export
    searchData = data;
    
    // Log the full response for debugging
    console.log('Search response:', data);
    
    // Clear previous markers
    clearMarkers(markers, searchMap);
    
    // Check if we have data
    if (!data || !data.checkIns || data.checkIns.length === 0) {
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
        return;
    }
    
    // Show results section
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('no-results').style.display = 'none';
    
    // Ensure map is properly displayed after results section is shown
    setTimeout(() => {
        if (searchMap) {
            ensureMapDisplayed(searchMap, 'search-map');
        }
    }, 100);
    
    // Update summary
    const summaryElement = document.getElementById('search-summary');
    if (summaryElement) {
        let summaryText = `Found ${data.checkIns.length} check-ins`;
        
        if (data.userId) {
            summaryText += ` for User ${data.userId}`;
        }
        
        if (data.locationId) {
            summaryText += ` at Location ${data.locationId}`;
        }
        
        summaryElement.textContent = summaryText;
    }
    
    // Add markers to the map
    const bounds = L.latLngBounds();
    
    data.checkIns.forEach((checkIn, index) => {
        const { lat, lng, userId, locationId, timestamp } = checkIn;
        
        // Create marker
        const markerData = {
            lat,
            lng,
            userId,
            locationId,
            timestamp,
            title: `Check-in #${index + 1}`
        };
        
        const marker = createMarker(markerData, {
            title: `Location ${locationId}`,
            icon: L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            })
        });
        
        marker.bindPopup(createPopupContent(markerData));
        marker.addTo(searchMap);
        markers.push(marker);
        
        // Extend bounds
        bounds.extend([lat, lng]);
    });
    
    // Fit the map to show all markers
    if (!bounds.isValid()) {
        searchMap.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
    } else {
        searchMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
    
    // Update table
    updateSearchTable(data.checkIns);
}

/**
 * Updates the search results table
 * @param {Array} checkIns - The check-ins data
 */
function updateSearchTable(checkIns) {
    const tableBody = document.querySelector('#search-table tbody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add rows for each check-in
    checkIns.forEach((checkIn, index) => {
        const row = document.createElement('tr');
        
        // 添加console调试以检查数据
        console.log(`Search result ${index}:`, checkIn);
        console.log(`  Keys:`, Object.keys(checkIn));
        
        // 尝试不同的大小写方式获取数据
        const userId = checkIn.userId || checkIn.userid || checkIn.USERID || checkIn["userId"] || 'N/A';
        const locationId = checkIn.locationId || checkIn.locationid || checkIn.LOCATIONID || checkIn["locationId"] || 'N/A';
        
        row.innerHTML = `
            <td>${userId}</td>
            <td>${locationId}</td>
            <td>${checkIn.lat.toFixed(6)}</td>
            <td>${checkIn.lng.toFixed(6)}</td>
            <td>${formatTimestamp(checkIn.timestamp)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Loads sample search data for demo purposes
 */
function loadSampleSearch() {
    // Set sample values in the form
    document.getElementById('search-user-id').value = '1'; // 使用有效的用户ID
    document.getElementById('search-location-id').value = '';
    document.getElementById('sort-by').value = 'time';
    document.getElementById('limit').value = '50';
    
    console.log('Loading sample search data for user ID: 1');
    
    // Submit the form
    document.getElementById('search-form').dispatchEvent(new Event('submit'));
}

/**
 * Exports search results as CSV
 */
function exportSearchResults() {
    if (!searchData || !searchData.checkIns || searchData.checkIns.length === 0) {
        showError('No data to export');
        return;
    }
    
    const exportData = searchData.checkIns.map((checkIn, index) => {
        return {
            index: index + 1,
            user_id: checkIn.userId,
            location_id: checkIn.locationId,
            latitude: checkIn.lat,
            longitude: checkIn.lng,
            timestamp: formatTimestamp(checkIn.timestamp)
        };
    });
    
    const filename = searchData.userId 
        ? `search_user_${searchData.userId}_${formatDate(new Date())}.csv`
        : searchData.locationId
            ? `search_location_${searchData.locationId}_${formatDate(new Date())}.csv`
            : `search_results_${formatDate(new Date())}.csv`;
    
    downloadCSV(exportData, filename);
    showSuccess('Data exported successfully');
}

/**
 * Fetches available location IDs for autocomplete
 */
async function fetchAvailableLocationIds() {
    try {
        const data = await fetch(ENDPOINTS.availableLocationIds).then(res => res.json());
        
        if (data && data.locationIds && data.locationIds.length > 0) {
            setupLocationIdAutocomplete(data.locationIds);
        }
    } catch (error) {
        console.error('Error fetching location IDs:', error);
    }
}

/**
 * Sets up autocomplete for location ID input fields
 * @param {Array} locationIds - Available location IDs
 */
function setupLocationIdAutocomplete(locationIds) {
    const locationIdInput = document.getElementById('search-location-id');
    const suggestionsList = document.getElementById('location-id-suggestions');
    
    if (!locationIdInput || !suggestionsList) return;
    
    // Add input event listener
    locationIdInput.addEventListener('input', () => {
        const value = locationIdInput.value;
        suggestionsList.innerHTML = '';
        
        if (!value) {
            suggestionsList.style.display = 'none';
            return;
        }
        
        // Filter location IDs that start with the input value
        const matchingIds = locationIds.filter(id => id.toString().startsWith(value));
        
        if (matchingIds.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }
        
        // Display up to 5 suggestions
        matchingIds.slice(0, 5).forEach(id => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = id;
            
            item.addEventListener('click', () => {
                locationIdInput.value = id;
                suggestionsList.style.display = 'none';
            });
            
            suggestionsList.appendChild(item);
        });
        
        suggestionsList.style.display = 'block';
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', event => {
        if (event.target !== locationIdInput && event.target !== suggestionsList) {
            suggestionsList.style.display = 'none';
        }
    });
}

// Chatbot page functions

/**
 * Initializes the chatbot page
 */
function initChatbotPage() {
    // Set up event listeners
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    
    if (sendButton) {
        sendButton.addEventListener('click', () => handleChatbotMessage());
    }
    
    if (userInput) {
        userInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleChatbotMessage();
            }
        });
    }
}

/**
 * Handles sending a message to the chatbot
 */
async function handleChatbotMessage() {
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    
    if (!userInput || !chatMessages) return;
    
    const message = userInput.value.trim();
    
    if (!message) {
        showError('Please enter a message', 'error-message');
        return;
    }
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    // Clear input
    userInput.value = '';
    
    try {
        // Call the API
        const response = await fetchAPI(ENDPOINTS.chatbot, {
            message
        });
        
        // Add bot response to chat
        if (response && response.reply) {
            addMessageToChat(response.reply, 'bot');
        } else {
            addMessageToChat('Sorry, I couldn\'t process your request. Please try again.', 'bot');
        }
    } catch (error) {
        addMessageToChat('An error occurred. Please try again later.', 'bot');
    }
}

// Expose handleChatbotMessage to window object so it can be overridden
window.handleChatbotMessage = handleChatbotMessage;

/**
 * Adds a message to the chat interface
 * @param {string} message - The message text
 * @param {string} sender - 'user' or 'bot'
 */
function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    
    messageElement.appendChild(paragraph);
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Popular POIs page functions

/**
 * Initializes the popular POIs page
 */
function initPopularPage() {
    console.log('Initializing popular page');
    
    // Make sure the map container exists and has dimensions
    const mapContainer = document.getElementById('popular-map');
    if (mapContainer) {
        console.log('Popular map container found, dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
        
        // Ensure the container has a height
        if (mapContainer.offsetHeight === 0) {
            mapContainer.style.height = '500px';
            console.log('Setting popular map height to 500px');
        }
        
        // Initialize the map
        popularMap = L.map('popular-map').setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
        L.tileLayer(TILE_URL, {
            attribution: MAP_ATTRIBUTION
        }).addTo(popularMap);
        
        console.log('Popular map initialized');
        
        // Force a map refresh
        setTimeout(() => {
            if (popularMap) {
                popularMap.invalidateSize();
                console.log('Popular map size refreshed');
            }
        }, 100);
    } else {
        console.error('Popular map container element not found!');
    }
    
    // Initialize Leaflet Draw
    drawnItems = new L.FeatureGroup();
    popularMap.addLayer(drawnItems);
    
    drawControl = new L.Control.Draw({
        draw: {
            polygon: {
                shapeOptions: {
                    color: 'var(--primary-color)'
                },
                allowIntersection: false,
                drawError: {
                    color: 'var(--danger-color)',
                    message: '<strong>Error:</strong> shapes cannot intersect!'
                },
            },
            polyline: false,
            circle: {
                shapeOptions: {
                    color: 'var(--primary-color)'
                }
            },
            rectangle: {
                shapeOptions: {
                    color: 'var(--primary-color)'
                }
            },
            marker: false,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    
    popularMap.addControl(drawControl);
    
    // Handle draw events
    popularMap.on(L.Draw.Event.CREATED, e => {
        const layer = e.layer;
        drawnItems.addLayer(layer);
        
        // Store the bounds for the query
        const bounds = layer.getBounds();
        currentBounds = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };
    });
    
    // Initialize datepickers
    if (window.flatpickr) {
        flatpickr('#popular-start-date', {
            dateFormat: 'Y-m-d',
            defaultDate: '2010-01-01'
        });
        
        flatpickr('#popular-end-date', {
            dateFormat: 'Y-m-d',
            defaultDate: '2011-12-31'
        });
    }
    
    // Set up event listeners
    const popularForm = document.getElementById('popular-form');
    if (popularForm) {
        popularForm.addEventListener('submit', handlePopularSearch);
    }
    
    const drawAreaBtn = document.getElementById('draw-area');
    if (drawAreaBtn) {
        drawAreaBtn.addEventListener('click', () => {
            // Trigger the rectangle drawing tool
            new L.Draw.Rectangle(popularMap, drawControl.options.draw.rectangle).enable();
        });
    }
    
    const clearAreaBtn = document.getElementById('clear-area');
    if (clearAreaBtn) {
        clearAreaBtn.addEventListener('click', () => {
            drawnItems.clearLayers();
            currentBounds = null;
        });
    }
    
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.addEventListener('change', handleRegionChange);
    }
    
    const exportResultsBtn = document.getElementById('export-popular-results');
    if (exportResultsBtn) {
        exportResultsBtn.addEventListener('click', exportPopularResults);
    }
    
    // Set a default region and load sample data
    setTimeout(() => {
        if (regionSelect) {
            regionSelect.value = "usa";
            handleRegionChange({ target: regionSelect });
            
            // Set some sample dates
            if (document.getElementById('popular-start-date')) {
                document.getElementById('popular-start-date')._flatpickr.setDate('2010-01-01');
            }
            if (document.getElementById('popular-end-date')) {
                document.getElementById('popular-end-date')._flatpickr.setDate('2011-12-31');
            }
            
            // Auto-submit the form after a short delay
            setTimeout(() => {
                if (popularForm && currentBounds) {
                    popularForm.dispatchEvent(new Event('submit'));
                }
            }, 500);
        }
    }, 500);
}

/**
 * Handles selection of a predefined region
 * @param {Event} event - The change event
 */
function handleRegionChange(event) {
    const region = event.target.value;
    
    // Clear any existing drawn areas
    drawnItems.clearLayers();
    
    if (!region) {
        currentBounds = null;
        return;
    }
    
    // Define regions (approximate bounds)
    const regions = {
        usa: { north: 49.38, south: 25.82, east: -66.95, west: -124.39 },
        europe: { north: 60.85, south: 35.95, east: 50.0, west: -10.5 },
        asia: { north: 53.0, south: 1.35, east: 142.0, west: 60.0 },
        global: { north: 85.0, south: -60.0, east: 180.0, west: -180.0 }
    };
    
    // Set the current bounds
    currentBounds = regions[region];
    
    if (currentBounds) {
        // Create and add rectangle to map
        const bounds = L.latLngBounds(
            [currentBounds.south, currentBounds.west],
            [currentBounds.north, currentBounds.east]
        );
        
        const rectangle = L.rectangle(bounds, {
            color: 'var(--primary-color)',
            weight: 2,
            fillOpacity: 0.2
        });
        
        drawnItems.addLayer(rectangle);
        popularMap.fitBounds(bounds);
    }
}

/**
 * Handles the popular POIs search form submission
 * @param {Event} event - The form submission event
 */
async function handlePopularSearch(event) {
    event.preventDefault();
    
    // Get form data
    const startDate = document.getElementById('popular-start-date').value;
    const endDate = document.getElementById('popular-end-date').value;
    const topCount = document.getElementById('top-count').value;
    
    // Validate inputs
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showError('Start date must be before end date');
        return;
    }
    
    if (!isPositiveInteger(topCount) || parseInt(topCount) < 1 || parseInt(topCount) > 100) {
        showError('Number of top POIs must be between 1 and 100');
        return;
    }
    
    if (!currentBounds) {
        showError('Please select an area on the map or choose a predefined region');
        return;
    }
    
    try {
        // Call the API
        const data = await fetchAPI(ENDPOINTS.popularPois, {
            startDate,
            endDate,
            bounds: currentBounds,
            limit: parseInt(topCount)
        });
        
        // Process and display results
        displayPopularResults(data);
    } catch (error) {
        // Error is already displayed by fetchAPI
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
    }
}

/**
 * Displays popular POIs results on the map and in the table
 * @param {Object} data - The popular POIs data from the API
 */
function displayPopularResults(data) {
    // Save the data for export
    popularData = data;
    
    // Clear previous markers
    clearMarkers(markers, popularMap);
    
    // Check if we have data
    if (!data || !data.pois || data.pois.length === 0) {
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
        return;
    }
    
    // Show results section
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('no-results').style.display = 'none';
    
    // Ensure map is properly displayed after results section is shown
    setTimeout(() => {
        if (popularMap) {
            ensureMapDisplayed(popularMap, 'popular-map');
        }
    }, 100);
    
    // Update summary
    const summaryElement = document.getElementById('popular-summary');
    if (summaryElement) {
        summaryElement.textContent = `Found top ${data.pois.length} locations between ${data.startDate} and ${data.endDate}`;
    }
    
    // Add markers to the map
    const bounds = L.latLngBounds();
    
    data.pois.forEach((poi, index) => {
        // 获取字段，同时处理不同的大小写和结构
        const locationId = poi.locationId || poi.locationid || poi["locationId"] || 'N/A';
        const checkInCount = poi.checkInCount || poi.checkincount || poi["checkInCount"] || 0;
        const uniqueUsers = poi.uniqueUsers || poi.uniqueusers || poi["uniqueUsers"] || 0;
        const lat = poi.lat;
        const lng = poi.lng;
        
        // Calculate marker size based on check-in count
        const maxCount = Math.max(...data.pois.map(p => 
            p.checkInCount || p.checkincount || p["checkInCount"] || 0
        ));
        const minSize = 25;
        const maxSize = 50;
        const size = minSize + (maxSize - minSize) * (checkInCount / maxCount);
        
        // Create marker
        const markerData = {
            lat,
            lng,
            locationId,
            checkInCount,
            uniqueUsers,
            title: `#${index + 1}: Location ${locationId}`
        };
        
        const marker = createMarker(markerData, {
            title: `Rank #${index + 1}: Location ${locationId}`,
            icon: L.divIcon({
                className: 'custom-marker',
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
                html: `<div style="
                    background-color: var(--primary-color);
                    color: white;
                    border-radius: 50%;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                ">${index + 1}</div>`
            })
        });
        
        marker.bindPopup(createPopupContent({
            ...markerData,
            title: `Rank #${index + 1}: Popular Location`
        }));
        
        marker.addTo(popularMap);
        markers.push(marker);
        
        // Extend bounds
        bounds.extend([lat, lng]);
    });
    
    // Fit the map to show all markers
    if (!bounds.isValid()) {
        popularMap.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
    } else {
        popularMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
    
    // Update table
    updatePopularTable(data.pois);
}

/**
 * Updates the popular POIs results table
 * @param {Array} pois - The POIs data
 */
function updatePopularTable(pois) {
    const tableBody = document.querySelector('#popular-table tbody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // 添加调试日志
    console.log('Popular POIs data:', pois);
    
    // Add rows for each POI
    pois.forEach((poi, index) => {
        const row = document.createElement('tr');
        
        // 添加控制台详细日志以检查数据结构
        console.log(`POI ${index}:`, poi);
        console.log(`Keys in POI ${index}:`, Object.keys(poi));
        
        // 尝试多种可能的字段名称格式
        const locationId = poi.locationId || poi.locationid || poi["locationId"] || 'N/A';
        const checkInCount = poi.checkInCount || poi.checkincount || poi["checkInCount"] || 0;
        const uniqueUsers = poi.uniqueUsers || poi.uniqueusers || poi["uniqueUsers"] || 0;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${locationId}</td>
            <td>${poi.lat.toFixed(6)}</td>
            <td>${poi.lng.toFixed(6)}</td>
            <td>${checkInCount}</td>
            <td>${uniqueUsers}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Exports popular POIs results as CSV
 */
function exportPopularResults() {
    if (!popularData || !popularData.pois || popularData.pois.length === 0) {
        showError('No data to export');
        return;
    }
    
    const exportData = popularData.pois.map((poi, index) => {
        return {
            rank: index + 1,
            location_id: poi.locationId,
            latitude: poi.lat,
            longitude: poi.lng,
            checkin_count: poi.checkInCount,
            unique_users: poi.uniqueUsers
        };
    });
    
    downloadCSV(exportData, `popular_locations_${formatDate(new Date())}.csv`);
    showSuccess('Data exported successfully');
}

// Home page function

/**
 * Initializes the home page
 */
function initHomePage() {
    // Nothing special to initialize on the home page yet
    console.log('Home page initialized');
} 