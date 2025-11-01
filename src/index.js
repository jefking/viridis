const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const redis = require('redis');
const { TimeSeriesDuplicatePolicies, TimeSeriesEncoding, TimeSeriesAggregationType } = require('@node-redis/time-series');
const fs = require('fs');
const path = require('path');
const { env } = require('process');
const { response } = require('express');

const conVars = {
    url: env.REDIS_URL || 'redis://127.0.0.1:6379'
};
const port = 9099;
const makeColorCode = '0123456789ABCDEF';

const rtsKey = 'viridis:color';

// Load color palette from JSON file
let PALETTE_DATA = null;
try {
    const paletteFile = fs.readFileSync(path.join(__dirname, 'palette.json'), 'utf8');
    PALETTE_DATA = JSON.parse(paletteFile);
    console.log(`Loaded ${PALETTE_DATA.colors.length} colors from palette`);
} catch (error) {
    console.error('Error loading palette.json:', error);
    process.exit(1);
}

// Color palette - 32 carefully selected colors to prevent muddy averaging
// These colors are chosen to be distinct and aesthetically pleasing
const COLOR_PALETTE = [
    0xFF0000, // Red
    0xFF4500, // Orange Red
    0xFF8C00, // Dark Orange
    0xFFA500, // Orange
    0xFFD700, // Gold
    0xFFFF00, // Yellow
    0x9ACD32, // Yellow Green
    0x7FFF00, // Chartreuse
    0x00FF00, // Green
    0x00FA9A, // Medium Spring Green
    0x00CED1, // Dark Turquoise
    0x00BFFF, // Deep Sky Blue
    0x1E90FF, // Dodger Blue
    0x0000FF, // Blue
    0x4169E1, // Royal Blue
    0x8A2BE2, // Blue Violet
    0x9370DB, // Medium Purple
    0xBA55D3, // Medium Orchid
    0xFF00FF, // Magenta
    0xFF1493, // Deep Pink
    0xFF69B4, // Hot Pink
    0xDC143C, // Crimson
    0xFF6347, // Tomato
    0xFF7F50, // Coral
    0xFFB6C1, // Light Pink
    0xFFA07A, // Light Salmon
    0x20B2AA, // Light Sea Green
    0x87CEEB, // Sky Blue
    0x7B68EE, // Medium Slate Blue
    0x8B4513, // Saddle Brown
    0xD2691E, // Chocolate
    0xCD853F  // Peru
];

const startRedisTimeSeries = async (client) => {
    try {
        await client.ts.create(rtsKey, {
            RETENTION: 86400000, // 24 hours in milliseconds
            ENCODING: TimeSeriesEncoding.COMPRESSED,
            DUPLICATE_POLICY: TimeSeriesDuplicatePolicies.LAST
        });
        console.log('Time series created successfully');
    } catch (error) {
        if (error.message.includes('TSDB: key already exists')) {
            console.log('Time series already exists');
        } else {
            console.error('Error creating time series:', error);
        }
    }
};

const rClient = redis.createClient(conVars);
rClient.connect();
startRedisTimeSeries(rClient);

const app = express();
const server = http.createServer(app);
const wsInstance = expressWs(app, server);

console.log('Express-WS initialized:', wsInstance ? 'SUCCESS' : 'FAILED');

app.use(express.json());

// Serve static files from public directory with index.htm as default
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['htm', 'html'],
    index: 'index.htm'
}));

// Track all WebSocket connections for broadcasting
const wsConnections = new Set();

// Track last submission time per user ID (12 second throttle)
const userSubmissionTimes = new Map();
const THROTTLE_SECONDS = 12;

// Track last activity time for background worker
let lastActivityTime = Date.now();
const INACTIVITY_THRESHOLD = 90 * 1000; // 90 seconds

// Clean up old throttle entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    const cutoff = now - (THROTTLE_SECONDS * 2 * 1000); // Keep entries for 2x throttle time

    for (const [userId, timestamp] of userSubmissionTimes.entries()) {
        if (timestamp < cutoff) {
            userSubmissionTimes.delete(userId);
        }
    }

    if (userSubmissionTimes.size > 0) {
        console.log(`Cleaned throttle map. ${userSubmissionTimes.size} active users.`);
    }
}, 5 * 60 * 1000);

// Background worker: Generate random color if no activity for 90 seconds
setInterval(async () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;

    if (timeSinceLastActivity >= INACTIVITY_THRESHOLD) {
        console.log(`No activity for ${Math.floor(timeSinceLastActivity / 1000)}s. Generating random color...`);

        // Generate random color from palette
        const randomColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
        const colorHex = randomColor.toString(16).padStart(6, '0').toUpperCase();

        // Generate random location (somewhere on Earth)
        const randomLat = (Math.random() * 180) - 90; // -90 to 90
        const randomLong = (Math.random() * 360) - 180; // -180 to 180

        // Store the submission
        const submission = {
            id: 'background-worker-' + Date.now(),
            lat: randomLat,
            long: randomLong,
            color: '#' + colorHex,
            timestamp: now,
            isBackgroundGenerated: true
        };

        try {
            // Store in Redis sorted set
            await rClient.zAdd('viridis:submissions', {
                score: now,
                value: JSON.stringify(submission)
            });

            console.log('Background worker generated:', submission);

            // Broadcast the new color
            const average = await getAverageColor();
            const broadcastData = {
                color: '#' + colorHex,
                average: '#' + average,
                isBackgroundGenerated: true
            };

            broadcast(broadcastData);

            // Update last activity time
            lastActivityTime = now;
        } catch (error) {
            console.error('Background worker error:', error);
        }
    }
}, 10 * 1000); // Check every 10 seconds

// Middleware to handle JSON parsing errors
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ success: false, message: 'Invalid JSON' });
    }
    next();
});

// Helper function to broadcast to all WebSocket clients
function broadcast(data) {
    const message = JSON.stringify(data);
    console.log(`Broadcasting to ${wsConnections.size} clients:`, message);

    wsConnections.forEach(client => {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(message);
        }
    });
}

app.get('/api/palette', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(PALETTE_DATA);
});

app.get('/api/color', async (req, res) => {
    try {
        const color = await getColor();
        const average = await getAverageColor();
        // If lat/long provided, calculate proximity-based average
        let proximityAverage = null;
        let nearbyCount = 0;

        if (req.query.lat && req.query.long) {
            const lat = parseFloat(req.query.lat);
            const long = parseFloat(req.query.long);

            if (!isNaN(lat) && !isNaN(long) && lat >= -90 && lat <= 90 && long >= -180 && long <= 180) {
                proximityAverage = await getProximityAverageColor(lat, long);

                // Count nearby submissions
                const now = Date.now();
                const oneDayAgo = now - 86400000;
                const submissions = await rClient.zRangeByScore('viridis:submissions', oneDayAgo, now);

                for (const submissionStr of submissions) {
                    const submission = JSON.parse(submissionStr);
                    const distance = haversineDistance(lat, long, submission.lat, submission.long);
                    if (distance <= 50) {
                        nearbyCount++;
                    }
                }
            }
        }

        const response = {
            color: '#' + color,
            average: '#' + average
        };

        if (proximityAverage) {
            response.proximityAverage = '#' + proximityAverage;
            response.nearbyCount = nearbyCount;
        }

        res.json(response);
    } catch (error) {
        console.error('Error getting color:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.ws('/ws/color', function (ws, req) {
    console.log('WebSocket connection established from:', req.connection.remoteAddress);

    // Add this connection to our set
    wsConnections.add(ws);
    console.log('Total WebSocket connections:', wsConnections.size);

    ws.on('message', async function (msg) {
        try {
            console.log('WebSocket message received:', msg);
            const color = await getColor();
            const average = await getAverageColor();
            ws.send(JSON.stringify({
                color: '#' + color,
                average: '#' + average
            }));
        } catch (error) {
            console.error('WebSocket error:', error);
            ws.send(JSON.stringify({ error: 'Internal server error' }));
        }
    });

    ws.on('close', function() {
        console.log('WebSocket connection closed');
        wsConnections.delete(ws);
    });
});

app.put('/api/color', async (req, res) => {
    try {
        const model = req.body;

        if (!validate(model)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid color format. Expected #RRGGBB format.'
            });
        }

        // Check throttle - user can only submit once every 12 seconds
        const now = Date.now();
        const userId = model.id;
        const lastSubmission = userSubmissionTimes.get(userId);

        if (lastSubmission) {
            const timeSinceLastSubmission = (now - lastSubmission) / 1000; // in seconds
            if (timeSinceLastSubmission < THROTTLE_SECONDS) {
                const remainingTime = Math.ceil(THROTTLE_SECONDS - timeSinceLastSubmission);
                console.log(`User ${userId} throttled. ${remainingTime}s remaining.`);
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingTime} seconds before submitting another color.`,
                    remainingTime: remainingTime
                });
            }
        }

        // Update last submission time
        userSubmissionTimes.set(userId, now);

        // Update last activity time for background worker
        lastActivityTime = now;

        await set(model);

        // Broadcast the new global average to all connected clients
        try {
            const color = await getColor();
            const average = await getAverageColor();
            broadcast({
                color: '#' + color,
                average: '#' + average
            });
        } catch (broadcastError) {
            console.error('Error broadcasting:', broadcastError);
            // Don't fail the request if broadcast fails
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error setting color:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

function validate(model) {
    if (!model || !model.color) {
        return false;
    }

    const color = model.color;

    // Check if it starts with #
    if (!color.startsWith('#')) {
        return false;
    }

    // Check if it's exactly 7 characters (#RRGGBB)
    if (color.length !== 7) {
        return false;
    }

    // Check if the remaining 6 characters are valid hex
    const hexPart = color.slice(1);
    const hexPattern = /^[0-9A-Fa-f]{6}$/;

    if (!hexPattern.test(hexPart)) {
        return false;
    }

    // Validate that the color is in the palette
    const colorUpper = color.toUpperCase();
    const isInPalette = PALETTE_DATA.colors.some(c => c.hex.toUpperCase() === colorUpper);
    if (!isInPalette) {
        console.log(`Color ${color} not in palette`);
        return false;
    }

    // Validate geolocation data
    if (!model.id || typeof model.id !== 'string') {
        return false;
    }

    if (typeof model.lat !== 'number' || isNaN(model.lat)) {
        return false;
    }

    if (typeof model.long !== 'number' || isNaN(model.long)) {
        return false;
    }

    // Validate lat/long ranges
    if (model.lat < -90 || model.lat > 90) {
        return false;
    }

    if (model.long < -180 || model.long > 180) {
        return false;
    }

    return true;
}

async function set(model) {
    try {
        const timestamp = Date.now();

        // Store color in time series
        await setColor(model.color);

        // Store user data in hash
        await rClient.hSet(`viridis:user:${model.id}`, {
            lat: model.lat.toString(),
            long: model.long.toString(),
            color: model.color,
            timestamp: timestamp.toString()
        });

        // Store submission in sorted set for history and proximity queries
        const submission = JSON.stringify({
            id: model.id,
            lat: model.lat,
            long: model.long,
            color: model.color,
            timestamp: timestamp
        });

        await rClient.zAdd('viridis:submissions', {
            score: timestamp,
            value: submission
        });

        // Clean up old submissions (older than 24 hours)
        const oneDayAgo = timestamp - 86400000;
        await rClient.zRemRangeByScore('viridis:submissions', '-inf', oneDayAgo);

        console.log('Stored submission:', { id: model.id, lat: model.lat, long: model.long, color: model.color });
    } catch (error) {
        console.error('Error in set function:', error);
        throw error;
    }
}

async function getColor() {
    try {
        let lastColor = await rClient.ts.get(rtsKey);
        if (lastColor && lastColor.value) {
            return lastColor.value.toString(16).toUpperCase().padStart(6, '0');
        } else {
            return randomColorHex();
        }
    } catch (error) {
        console.error('Error getting color:', error);
        return randomColorHex();
    }
}

async function getAverageColor() {
    try {
        // Get the last 8 submissions from the sorted set
        const now = Date.now();
        const oneDayAgo = now - 86400000;

        // Get all submissions from last 24 hours, sorted by timestamp
        const submissions = await rClient.zRangeByScore('viridis:submissions', oneDayAgo, now);

        if (!submissions || submissions.length === 0) {
            return randomColorHex();
        }

        // Take only the last 8 submissions
        const recentSubmissions = submissions.slice(-8);

        // Calculate average RGB
        let totalR = 0, totalG = 0, totalB = 0;

        for (const submissionStr of recentSubmissions) {
            const submission = JSON.parse(submissionStr);
            const colorInt = parseInt(submission.color.replace('#', ''), 16);

            totalR += (colorInt >> 16) & 0xFF;
            totalG += (colorInt >> 8) & 0xFF;
            totalB += colorInt & 0xFF;
        }

        const avgR = Math.round(totalR / recentSubmissions.length);
        const avgG = Math.round(totalG / recentSubmissions.length);
        const avgB = Math.round(totalB / recentSubmissions.length);

        // Convert to integer and snap to palette
        const avgColorInt = (avgR << 16) | (avgG << 8) | avgB;
        const rawAverage = avgColorInt.toString(16).toUpperCase().padStart(6, '0');
        const snappedColor = snapToPalette(avgColorInt);
        const snappedHex = snappedColor.toString(16).toUpperCase().padStart(6, '0');

        console.log(`Global average from last ${recentSubmissions.length} submissions: #${rawAverage} (raw) → #${snappedHex} (snapped to palette)`);

        return snappedHex;
    } catch (error) {
        console.error('Error getting average color:', error);
        return randomColorHex();
    }
}

async function setColor(color) {
    try {
        let colorInt = parseInt(color.replace('#', ''), 16);
        let at = new Date().setHours(0);
        await rClient.ts.add(rtsKey, at, colorInt);
    } catch (error) {
        console.error('Error setting color:', error);
        throw error;
    }
}

function randomColorHex() {
    var code = '';
    for (var count = 0; count < 6; count++) {
        code += makeColorCode[Math.floor(Math.random() * 16)];
    }
    return code;
}

/**
 * Calculate the Euclidean distance between two colors in RGB space
 * @param {number} color1 - First color as integer
 * @param {number} color2 - Second color as integer
 * @returns {number} Distance between colors
 */
function colorDistance(color1, color2) {
    const r1 = (color1 >> 16) & 0xFF;
    const g1 = (color1 >> 8) & 0xFF;
    const b1 = color1 & 0xFF;

    const r2 = (color2 >> 16) & 0xFF;
    const g2 = (color2 >> 8) & 0xFF;
    const b2 = color2 & 0xFF;

    // Euclidean distance in RGB space
    return Math.sqrt(
        Math.pow(r2 - r1, 2) +
        Math.pow(g2 - g1, 2) +
        Math.pow(b2 - b1, 2)
    );
}

/**
 * Snap a color to the nearest color in the palette
 * @param {number} colorInt - Color as integer (0xRRGGBB)
 * @returns {number} Nearest palette color as integer
 */
function snapToPalette(colorInt) {
    let minDistance = Infinity;
    let nearestColor = COLOR_PALETTE[0];

    for (const paletteColor of COLOR_PALETTE) {
        const distance = colorDistance(colorInt, paletteColor);
        if (distance < minDistance) {
            minDistance = distance;
            nearestColor = paletteColor;
        }
    }

    return nearestColor;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Get proximity-based average color for a given location
 * @param {number} lat - User's latitude
 * @param {number} long - User's longitude
 * @param {number} radiusKm - Radius in kilometers (default: 50km)
 * @returns {Promise<string>} Average color in hex format
 */
async function getProximityAverageColor(lat, long, radiusKm = 50) {
    try {
        // Get all submissions from the last 24 hours
        const now = Date.now();
        const oneDayAgo = now - 86400000;

        const submissions = await rClient.zRangeByScore('viridis:submissions', oneDayAgo, now);

        if (!submissions || submissions.length === 0) {
            return randomColorHex();
        }

        // Take only the last 8 submissions
        const recentSubmissions = submissions.slice(-8);

        // Parse submissions and calculate weighted colors based on proximity
        let totalWeight = 0;
        let weightedR = 0;
        let weightedG = 0;
        let weightedB = 0;

        for (const submissionStr of recentSubmissions) {
            const submission = JSON.parse(submissionStr);
            const distance = haversineDistance(lat, long, submission.lat, submission.long);

            // Only include submissions within the radius
            if (distance <= radiusKm) {
                // Weight decreases with distance (inverse square law)
                // Add 1 to avoid division by zero for same location
                const weight = 1 / (1 + distance * distance);

                // Parse color
                const colorInt = parseInt(submission.color.replace('#', ''), 16);
                const r = (colorInt >> 16) & 0xFF;
                const g = (colorInt >> 8) & 0xFF;
                const b = colorInt & 0xFF;

                weightedR += r * weight;
                weightedG += g * weight;
                weightedB += b * weight;
                totalWeight += weight;
            }
        }

        if (totalWeight === 0) {
            // No submissions within radius, return global average
            return await getAverageColor();
        }

        // Calculate weighted average
        const avgR = Math.round(weightedR / totalWeight);
        const avgG = Math.round(weightedG / totalWeight);
        const avgB = Math.round(weightedB / totalWeight);

        // Convert to integer and snap to palette
        const avgColorInt = (avgR << 16) | (avgG << 8) | avgB;
        const snappedColor = snapToPalette(avgColorInt);
        const avgColor = snappedColor.toString(16).toUpperCase().padStart(6, '0');

        console.log(`Proximity average for (${lat}, ${long}): #${avgColor} (snapped from raw average) from ${recentSubmissions.length} recent submissions, ${totalWeight.toFixed(2)} total weight`);

        return avgColor;
    } catch (error) {
        console.error('Error getting proximity average color:', error);
        return await getAverageColor();
    }
}

// Export the app for testing
module.exports = app;

// Only start the server if this file is run directly (not required for testing)
if (require.main === module) {
    server.listen(port, () => {
        console.log('Viridis server listening on port', port);
    });
}
