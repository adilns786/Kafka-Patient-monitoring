const { Kafka } = require('kafkajs');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const kafka = new Kafka({
  clientId: 'twitter-consumer',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

const consumer = kafka.consumer({ groupId: 'twitter-group' });
const TOPIC = 'twitter-stream';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 Client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

async function run() {
  await consumer.connect();
  console.log('✅ Kafka Consumer connected');

  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
  console.log(`🔄 Subscribed to topic: ${TOPIC}`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        
        // ADDITIONAL TRANSFORMATION in consumer (optional)
        const finalData = additionalTransformation(data);
        
        console.log(`📥 Received: ${finalData.id_str}`);
        
        // Broadcast to all connected WebSocket clients
        broadcast({
          message: finalData,
          timetoken: Date.now() * 10000 // PubNub format
        });
      } catch (err) {
        console.error('Error processing message:', err);
      }
    }
  });
}

// Optional: Additional transformation in consumer
function additionalTransformation(data) {
  return {
    ...data,
    // Add consumer-side transformations here
    processed_by_consumer: true,
    delivery_timestamp: new Date().toISOString(),
    // Convert sentiment to label
    sentiment_label: getSentimentLabel(data.sentiment_score)
  };
}

function getSentimentLabel(score) {
  if (score > 0) return 'Positive';
  if (score < 0) return 'Negative';
  return 'Neutral';
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  run().catch(console.error);
});

process.on('SIGTERM', async () => {
  await consumer.disconnect();
  server.close();
  process.exit(0);
});