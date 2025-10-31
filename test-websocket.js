// Test WebSocket broadcasting
const WebSocket = require('ws');
const axios = require('axios');

console.log('Starting WebSocket test...\n');

// Create two WebSocket clients
const ws1 = new WebSocket('ws://localhost:9099/ws/color');
const ws2 = new WebSocket('ws://localhost:9099/ws/color');

let ws1Connected = false;
let ws2Connected = false;

ws1.on('open', () => {
    console.log('✅ WebSocket 1 connected');
    ws1Connected = true;
    checkAndTest();
});

ws2.on('open', () => {
    console.log('✅ WebSocket 2 connected');
    ws2Connected = true;
    checkAndTest();
});

ws1.on('message', (data) => {
    console.log('📨 WS1 received:', data.toString());
});

ws2.on('message', (data) => {
    console.log('📨 WS2 received:', data.toString());
});

ws1.on('error', (err) => {
    console.error('❌ WS1 error:', err.message);
});

ws2.on('error', (err) => {
    console.error('❌ WS2 error:', err.message);
});

async function checkAndTest() {
    if (!ws1Connected || !ws2Connected) return;
    
    console.log('\n🧪 Both WebSockets connected. Testing broadcast...\n');
    
    // Wait a moment for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Submit a color via API
    console.log('📤 Submitting color #FF0000 via API...');
    try {
        const response = await axios.put('http://localhost:9099/api/color', {
            id: 'test-ws-user-1',
            color: '#FF0000',
            lat: 37.7749,
            long: -122.4194
        });
        console.log('✅ API response:', response.data);
    } catch (error) {
        console.error('❌ API error:', error.message);
    }
    
    // Wait to see if WebSockets receive the broadcast
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n📤 Submitting another color #0000FF via API...');
    try {
        const response = await axios.put('http://localhost:9099/api/color', {
            id: 'test-ws-user-2',
            color: '#0000FF',
            lat: 40.7128,
            long: -74.0060
        });
        console.log('✅ API response:', response.data);
    } catch (error) {
        console.error('❌ API error:', error.message);
    }
    
    // Wait to see if WebSockets receive the broadcast
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n✅ Test complete. Check if both WebSockets received messages above.');
    console.log('Expected: Both WS1 and WS2 should have received 2 messages each.\n');
    
    ws1.close();
    ws2.close();
    process.exit(0);
}

