const { Kafka } = require('kafkajs');
const PubNub = require('pubnub');

const kafka = new Kafka({
  clientId: 'twitter-producer',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

const producer = kafka.producer();
const TOPIC = 'twitter-stream';

// PubNub setup to fetch Twitter stream
const pubnub = new PubNub({
  uuid: 'KafkaProducer',
  subscribeKey: 'sub-c-d00e0d32-66ac-4628-aa65-a42a1f0c493b'
});

async function run() {
  await producer.connect();
  console.log('✅ Kafka Producer connected');

  pubnub.addListener({
    message: async (payload) => {
      try {
        // DATA TRANSFORMATION - Add enrichments and processing
        const transformedData = transformTwitterData(payload.message);
        
        if (transformedData) {
          await producer.send({
            topic: TOPIC,
            messages: [{
              key: transformedData.id_str,
              value: JSON.stringify(transformedData),
              timestamp: Date.now().toString()
            }]
          });
          console.log(`📤 Sent transformed tweet: ${transformedData.id_str}`);
        }
      } catch (err) {
        console.error('Error sending to Kafka:', err);
      }
    }
  });

  pubnub.subscribe({
    channels: ['pubnub-twitter']
  });

  console.log('🔄 Subscribed to Twitter stream via PubNub');
}

// TRANSFORMATION LOGIC - Customize as needed
function transformTwitterData(message) {
  if (!message || !message.user || !message.place) {
    return null;
  }

  return {
    // Original data
    id_str: message.id_str,
    text: message.text,
    source: message.source,
    user: {
      screen_name: message.user.screen_name,
      location: message.user.location,
      followers_count: message.user.followers_count
    },
    place: {
      country: message.place.country
    },
    
    // TRANSFORMED/ENRICHED DATA
    processed_at: new Date().toISOString(),
    text_length: message.text.length,
    sentiment_score: calculateSimpleSentiment(message.text),
    has_mentions: message.text.includes('@'),
    has_hashtags: message.text.includes('#'),
    follower_category: categorizeFollowers(message.user.followers_count),
    word_count: message.text.split(/\s+/).length,
    country_code: message.place.country_code || 'UNKNOWN'
  };
}

// Simple sentiment analysis (demo purpose)
function calculateSimpleSentiment(text) {
  const positiveWords = ['good', 'great', 'awesome', 'love', 'excellent', 'happy', '😊', '❤️'];
  const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'sad', 'angry', '😢', '😡'];
  
  const lowerText = text.toLowerCase();
  let score = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score--;
  });
  
  return score;
}

// Categorize users by follower count
function categorizeFollowers(count) {
  if (count < 100) return 'micro';
  if (count < 1000) return 'small';
  if (count < 10000) return 'medium';
  if (count < 100000) return 'large';
  return 'influencer';
}

run().catch(console.error);

process.on('SIGTERM', async () => {
  await producer.disconnect();
  process.exit(0);
});