# Kafka Patient Vitals Monitoring

Real-time patient vitals monitoring using Kafka streams.

## Prerequisites

- Docker & Docker Compose
- Python 3.8+

## Setup

### 1. Start Kafka & Zookeeper

```bash
docker-compose up -d
```

Wait 10-15 seconds for services to initialize.

### 2. Verify Services

```bash
docker ps
```

You should see `kafka-patient-vitals-kafka-1` and `kafka-patient-vitals-zookeeper-1` running.

### 3. Install Python Dependencies

```bash
pip install kafka-python
```

## Running the Application

### Terminal 1: Start Producer

```bash
python producer.py --interval 2
```

**Options:**
- `--mode random` (default) - Generate random vitals
- `--mode csv --csv sample_vitals.csv` - Stream from CSV
- `--interval 2` - Send message every 2 seconds
- `--patients P001,P002,P003` - Patient IDs for random mode

### Terminal 2: Start Consumer

```bash
python consumer.py
```

The consumer will display patient vitals and trigger alerts for:
- Heart rate > 110 bpm
- SpO2 < 92%

## Expected Output

**Producer:**
```
SENT {'patient_id': 'P001', 'timestamp': '2025-10-14T18:30:00Z', 'heart_rate': 115, ...}
```

**Consumer:**
```
[2025-10-14T18:30:00Z] P001 -> HR:115 SpO2:89 BP:{'systolic': 140, 'diastolic': 90} RR:20 T:37.5
  >>> ALERT: High heart rate: 115; Low SpO2: 89
```

## Troubleshooting

**No messages received:**
```bash
# Check topic exists
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --list --bootstrap-server localhost:9093

# Create topic manually if needed
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --create --topic patient.vitals --bootstrap-server localhost:9093 --partitions 1 --replication-factor 1
```

**Reset consumer group:**
```bash
docker exec -it kafka-patient-vitals-kafka-1 kafka-consumer-groups --bootstrap-server localhost:9093 --group vitals-monitor-consumer-v7 --reset-offsets --to-earliest --topic patient.vitals --execute
```

## Stop Services

```bash
docker-compose down
```

## Configuration

- **Kafka Bootstrap:** `localhost:9093`
- **Topic:** `patient.vitals`
- **Consumer Group:** `vitals-monitor-consumer-v7`