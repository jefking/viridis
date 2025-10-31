const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const redis = require('redis');
const { TimeSeriesDuplicatePolicies, TimeSeriesEncoding, TimeSeriesAggregationType } = require('@node-redis/time-series');
const fs = require('fs');
const { env } = require('process');
const { response } = require('express');

const conVars = {
    url: env.REDIS_URL || '127.0.0.1:6379'
};
const port = 9099;
const makeColorCode = '0123456789ABCDEF';

const rtsKey = 'viridis:color';

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

const html = fs.readFileSync('./index.htm', 'utf-8');
const rClient = redis.createClient(conVars);
rClient.connect();
startRedisTimeSeries(rClient);

const app = express();
const server = http.createServer(app);
const wsInstance = expressWs(app, server);

console.log('Express-WS initialized:', wsInstance ? 'SUCCESS' : 'FAILED');

app.use(express.json());
app.use(express.static(__dirname));

// Track all WebSocket connections for broadcasting
const wsConnections = new Set();

// Middleware to handle JSON parsing errors
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ success: false, message: 'Invalid JSON' });
    }
    next();
});

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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
                color: color,
                average: average
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

        await set(model);

        // Broadcast the new global average to all connected clients
        try {
            const color = await getColor();
            const average = await getAverageColor();
            const message = JSON.stringify({
                color: color,
                average: average
            });

            console.log(`Broadcasting to ${wsConnections.size} clients:`, message);

            wsConnections.forEach(client => {
                if (client.readyState === 1) { // 1 = OPEN
                    client.send(message);
                }
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
        let fromTimestamp = new Date().setHours(0) - 86400000; // 24 hours ago
        let toTimestamp = new Date().setHours(0);
        
        let colorsResponse = await rClient.ts.range(rtsKey, fromTimestamp, toTimestamp, {
            AGGREGATION: {
                type: TimeSeriesAggregationType.AVERAGE,
                timeBucket: 86400000
            }
        });
        
        if (colorsResponse && colorsResponse.length > 0) {
            let averageColor = colorsResponse[0].value;
            return Math.round(averageColor).toString(16).toUpperCase().padStart(6, '0');
        } else {
            return randomColorHex();
        }
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

        // Parse submissions and calculate weighted colors based on proximity
        let totalWeight = 0;
        let weightedR = 0;
        let weightedG = 0;
        let weightedB = 0;

        for (const submissionStr of submissions) {
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

        // Convert back to hex
        const avgColor = ((avgR << 16) | (avgG << 8) | avgB).toString(16).toUpperCase().padStart(6, '0');

        console.log(`Proximity average for (${lat}, ${long}): #${avgColor} from ${submissions.length} submissions, ${totalWeight.toFixed(2)} total weight`);

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
