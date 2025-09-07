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
expressWs(app);
const server = http.createServer(app);

app.use(express.json());

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
        res.json({
            color: '#' + color,
            average: '#' + average
        });
    } catch (error) {
        console.error('Error getting color:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.ws('/ws/color', async function (ws, req) {
    console.log('WebSocket connection established');
    
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
    
    return hexPattern.test(hexPart);
}

async function set(model) {
    try {
        await setColor(model.color);
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

// Export the app for testing
module.exports = app;

// Only start the server if this file is run directly (not required for testing)
if (require.main === module) {
    server.listen(port, () => {
        console.log('Viridis server listening on port', port);
    });
}
