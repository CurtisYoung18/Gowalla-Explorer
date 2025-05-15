/**
 * Gowalla Explorer - Chatbot Model
 * Handles AI chatbot functionality
 */

const db = require('../db');

// OpenRouter API configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Process a message using OpenRouter API for more intelligent responses
 * @param {string} message - The user's message
 * @returns {Promise<string>} - Promise resolving to the AI response
 */
async function processWithAI(message) {
    try {
        console.log('Starting AI processing with OpenRouter...');
        
        const payload = {
            model: "anthropic/claude-3-haiku", // Using Claude 3 Haiku for fast responses
            messages: [
                {
                    role: "user", 
                    content: `You are a helpful assistant for the Gowalla Explorer app. 
                    The app explores location-based social network data from the Gowalla dataset.
                    Answer this user question concisely but informatively: ${message}`
                }
            ],
            max_tokens: 500
        };

        console.log(`Sending request to OpenRouter API URL: ${OPENROUTER_API_URL}`);
        console.log('Using API key: ' + OPENROUTER_API_KEY.substring(0, 10) + '...');
        console.log('API key length:', OPENROUTER_API_KEY.length);
        console.log('Request payload:', JSON.stringify(payload, null, 2));

        // Verify the API key format
        if (!OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
            console.error('ERROR: API key does not have correct format! It should start with sk-or-v1-');
        }
        
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Gowalla Explorer',
                'Origin': 'http://localhost:3000'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenRouter API Error (${response.status}):`, errorText);
            console.error('Full request details:');
            console.error('URL:', OPENROUTER_API_URL);
            console.error('API Key (first 10 chars):', OPENROUTER_API_KEY.substring(0, 10) + '...');
            console.error('Headers:', {
                'Authorization': `Bearer ${OPENROUTER_API_KEY.substring(0, 10)}...`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Gowalla Explorer'
            });
            
            let errorDetail = `API error code: ${response.status}`;
            try {
                // Try to parse error as JSON
                const errorJson = JSON.parse(errorText);
                errorDetail = errorJson.error?.message || errorJson.message || errorDetail;
            } catch (e) {
                // If not JSON, use text as is
                errorDetail = errorText.substring(0, 100) + (errorText.length > 100 ? '...' : '');
            }
            
            return `I apologize, but I'm unable to process your request through the AI service right now. Error: ${errorDetail}. I'll use my basic responses instead.\n\n` + 
                   await processRuleBasedResponse(message);
        }

        const data = await response.json();
        console.log('OpenRouter API response received:', data.choices ? 'Success' : 'No choices in response');
        
        if (!data.choices || data.choices.length === 0) {
            console.error('No choices in OpenRouter response:', data);
            return 'The AI service returned an empty response. I\'ll use my basic knowledge instead.\n\n' + 
                   await processRuleBasedResponse(message);
        }
        
        const content = data.choices[0]?.message?.content;
        if (!content) {
            console.error('No content in OpenRouter response choice:', data.choices[0]);
            return 'The AI service returned a response without content. I\'ll use my basic knowledge instead.\n\n' + 
                   await processRuleBasedResponse(message);
        }
        
        return content;
    } catch (error) {
        console.error('Error using OpenRouter:', error);
        console.error('Error stack:', error.stack);
        return `I encountered an error connecting to the AI service: ${error.message}. I'll use my basic responses instead.\n\n` + 
               await processRuleBasedResponse(message);
    }
}

/**
 * Process a message with rule-based responses (fallback)
 * @param {string} message - The user's message
 * @returns {Promise<string>} - Promise resolving to the rule-based response
 */
async function processRuleBasedResponse(message) {
    const lowerMessage = message.toLowerCase();
    let reply = '';
    
    // Check for dataset stats
    if (lowerMessage.includes('how many') && 
        (lowerMessage.includes('check') || lowerMessage.includes('users') || lowerMessage.includes('locations'))) {
        
        try {
            // Get some statistics from the database
            const checkInsCountResult = await db.query('SELECT COUNT(*) FROM check_ins');
            const usersCountResult = await db.query('SELECT COUNT(*) FROM users');
            const locationsCountResult = await db.query('SELECT COUNT(*) FROM locations');
            
            const checkInsCount = checkInsCountResult.rows[0].count;
            const usersCount = usersCountResult.rows[0].count;
            const locationsCount = locationsCountResult.rows[0].count;
            
            reply = `The Gowalla dataset contains ${checkInsCount} check-ins from ${usersCount} users at ${locationsCount} unique locations.`;
        } catch (error) {
            console.error('Error fetching stats:', error);
            reply = 'Based on the dataset information, Gowalla contains over 6 million check-ins from more than 100,000 users at approximately 1 million locations worldwide.';
        }
        
        return reply;
    }
    
    // Check for top users
    if (lowerMessage.includes('top user') || 
        (lowerMessage.includes('user') && lowerMessage.includes('most check'))) {
        
        try {
            const topUsersResult = await db.query(
                'SELECT user_id, total_checkins FROM users ORDER BY total_checkins DESC LIMIT 5'
            );
            
            if (topUsersResult.rows.length > 0) {
                reply = 'The users with the most check-ins are:\n';
                topUsersResult.rows.forEach((user, index) => {
                    reply += `${index + 1}. User ${user.user_id} with ${user.total_checkins} check-ins\n`;
                });
            } else {
                reply = 'The users with the most check-ins had thousands of check-ins across multiple countries.';
            }
        } catch (error) {
            console.error('Error fetching top users:', error);
            reply = 'The users with the most check-ins had thousands of check-ins across multiple countries. You can see detailed user statistics using the search functionality.';
        }
        
        return reply;
    }
    
    // Check for popular locations
    if (lowerMessage.includes('popular location') || lowerMessage.includes('most popular')) {
        try {
            const topLocationsResult = await db.query(
                'SELECT location_id, total_checkins FROM locations ORDER BY total_checkins DESC LIMIT 5'
            );
            
            if (topLocationsResult.rows.length > 0) {
                reply = 'The most popular locations are:\n';
                topLocationsResult.rows.forEach((location, index) => {
                    reply += `${index + 1}. Location ${location.location_id} with ${location.total_checkins} check-ins\n`;
                });
                reply += 'You can explore more using the "Popular POIs" feature.';
            } else {
                reply = 'The most popular locations vary by region, but major transportation hubs, tourist attractions, and university campuses tend to have the highest check-in counts.';
            }
        } catch (error) {
            console.error('Error fetching popular locations:', error);
            reply = 'The most popular locations vary by region, but major transportation hubs, tourist attractions, and university campuses tend to have the highest check-in counts. You can explore popular POIs using the "Popular POIs" feature.';
        }
        
        return reply;
    }
    
    // Simple rule-based responses for other queries
    if (lowerMessage.includes('what is') && lowerMessage.includes('gowalla')) {
        reply = 'Gowalla was a location-based social network launched in 2009. Users could "check in" at various locations using their mobile devices. The Gowalla dataset contains check-in data from the service before it shut down in 2012.';
    }
    else if (lowerMessage.includes('export') || lowerMessage.includes('download')) {
        reply = 'You can export search results by clicking the "Export Results" button that appears below any results table. This will download the data as a CSV file that you can open in Excel or other spreadsheet software.';
    }
    else if (lowerMessage.includes('hello') || lowerMessage.includes('hi ')) {
        reply = 'Hello! I\'m the Gowalla Explorer Assistant. How can I help you today?';
    }
    else if (lowerMessage.includes('thank')) {
        reply = 'You\'re welcome! Is there anything else you\'d like to know about Gowalla or this application?';
    }
    else if (lowerMessage.includes('help')) {
        reply = 'I can answer questions about the Gowalla dataset, explain how to use the application features, and provide information about trajectory search, personalized search, and popular POIs. What would you like to know?';
    }
    else if (lowerMessage.includes('trajectory')) {
        reply = 'The Trajectory Query feature lets you visualize a user\'s check-in history over time. Simply enter a user ID, select a date range, and specify a radius. The system will show the user\'s check-ins on the map, along with similar check-ins by other users in the specified radius.';
    }
    else if (lowerMessage.includes('search')) {
        reply = 'The Personalized Search feature allows you to find check-ins by user ID, location ID, or both. You can sort results by time or distance, and limit the number of results returned. The results are displayed both on a map and in a table format for easy analysis.';
    }
    else if (lowerMessage.includes('popular')) {
        reply = 'The Popular POIs feature helps you discover the most frequently visited locations in a specific area and time period. You can select a predefined region or draw a custom area on the map, specify a date range, and see the top locations ranked by check-in count.';
    }
    else {
        // Generic response
        reply = 'I\'m not sure I understand your question. You can ask me about the Gowalla dataset, how to use this application, or specific features like trajectory search, personalized search, and popular POIs.';
    }
    
    return reply;
}

/**
 * Process a chatbot message and generate a response
 * @param {string} message - The user's message
 * @returns {Promise<string>} - Promise resolving to the chatbot's response
 */
async function processMessage(message) {
    // Check if API key is valid before trying to use OpenRouter
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'sk-or-v1-REPLACE_WITH_NEW_API_KEY' || OPENROUTER_API_KEY.includes('REPLACE_WITH_NEW_API_KEY')) {
        console.log('API key not valid, using rule-based responses directly');
        return processRuleBasedResponse(message);
    }
    
    // If API key appears valid, try to process with AI
    try {
        return await processWithAI(message);
    } catch (error) {
        console.error('AI processing failed, falling back to rule-based responses:', error);
        // If AI processing fails, fall back to rule-based responses
        return processRuleBasedResponse(message);
    }
}

module.exports = {
    processMessage
}; 