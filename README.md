# Patient Vitals Monitoring System

A real-time patient vitals monitoring system using Apache Kafka for streaming data and Apache Cassandra for data persistence. This system simulates IoT medical devices sending patient vital signs, processes them for alerts, and stores them in a database.

## System Architecture

- **Kafka**: Message broker for streaming patient vitals data
- **Zookeeper**: Coordination service for Kafka
- **Cassandra**: NoSQL database for storing patient vitals
- **Producer**: Python script that generates/streams patient vitals data
- **Consumer**: Python script that consumes data, checks for alerts, and saves to Cassandra

## Prerequisites

Before starting, ensure you have the following installed:

- **Python 3.12+** ([Download Python](https://www.python.org/downloads/))
- **Docker Desktop** ([Download Docker](https://www.docker.com/products/docker-desktop/))
- **Git** (optional, for version control)

## Project Structure

```
kafka-patient-vitals/
├── docker-compose.yml          # Docker configuration for Kafka, Zookeeper, Cassandra
├── consumer.py                 # Kafka consumer script
├── producer.py                 # Kafka producer script
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

---

## Step-by-Step Setup Guide (PowerShell)

### Step 1: Create Project Directory

```powershell
# Create project directory
New-Item -ItemType Directory -Path "kafka-patient-vitals"
Set-Location kafka-patient-vitals
```

### Step 2: Create Project Files

Create the following files in your project directory:
- `docker-compose.yml`
- `consumer.py`
- `producer.py`
- `requirements.txt`

(Copy the content from the provided files)

### Step 3: Create Python Virtual Environment

```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 4: Install Python Dependencies

```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install required packages
pip install -r requirements.txt
```

### Step 5: Start Docker Services

```powershell
# Start all services (Kafka, Zookeeper, Cassandra)
docker-compose up -d

# Wait 60 seconds for services to fully start
Start-Sleep -Seconds 60

# Verify services are running
docker-compose ps
```

You should see three services running:
- `zookeeper` (port 2181)
- `kafka` (ports 9092, 9093)
- `cassandra` (port 9042)

### Step 6: Set Up Cassandra Database

```powershell
# Connect to Cassandra container
docker exec -it cassandra cqlsh
```

Once inside the Cassandra shell, run these CQL commands:

```cql
-- Create keyspace
CREATE KEYSPACE IF NOT EXISTS hospital 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Use the keyspace
USE hospital;

-- Create table for patient vitals
CREATE TABLE IF NOT EXISTS patient_vitals (
    patient_id TEXT,
    timestamp TEXT,
    heart_rate INT,
    spo2 INT,
    systolic INT,
    diastolic INT,
    respiratory_rate INT,
    temperature FLOAT,
    PRIMARY KEY (patient_id, timestamp)
);

-- Verify table creation
DESCRIBE TABLE patient_vitals;

-- Exit Cassandra shell
exit
```

### Step 7: Create Kafka Topic (Optional)

```powershell
# Create the patient.vitals topic
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --create --topic patient.vitals --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

# Verify topic creation
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --list --bootstrap-server localhost:9092
```

### Step 8: Start the Consumer

Open a **new PowerShell window** in the project directory:

```powershell
# Navigate to project directory
Set-Location kafka-patient-vitals

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start consumer
python consumer.py
```

Expected output:
```
Consumer started, listening to 'patient.vitals'
Bootstrap servers: localhost:9093
Consumer group: vitals-monitor-consumer-v7
Waiting for partition assignment...
Partitions assigned: {TopicPartition(topic='patient.vitals', partition=0)}
Listening for messages... (Press Ctrl+C to stop)
```

### Step 9: Start the Producer

Open **another PowerShell window** in the project directory:

```powershell
# Navigate to project directory
Set-Location kafka-patient-vitals

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start producer in random mode
python producer.py --mode random --interval 2 --patients "P001,P002,P003,P004,P005"
```

### Step 10: Monitor the System

You should now see:

**Consumer Window:**
```
--- Message #1 ---
Topic: patient.vitals, Partition: 0, Offset: 0
[2025-10-26T10:30:15.123456+00:00] P001 -> HR:95 SpO2:98 BP:{'systolic': 120, 'diastolic': 80} RR:16 T:36.8
```

**Producer Window:**
```
SENT {'patient_id': 'P001', 'timestamp': '2025-10-26T10:30:15.123456+00:00', 'heart_rate': 95, ...}
```

**Alert Example (when thresholds are exceeded):**
```
[2025-10-26T10:30:20.123456+00:00] P002 -> HR:115 SpO2:90 BP:{'systolic': 135, 'diastolic': 88} RR:22 T:37.2
  >>> ALERT: High heart rate: 115; Low SpO2: 90
```

### Step 11: Verify Data in Cassandra

Open a **new PowerShell window**:

```powershell
# Connect to Cassandra
docker exec -it cassandra cqlsh

# Inside cqlsh:
USE hospital;

# View stored data
SELECT * FROM patient_vitals LIMIT 10;

# Count total records
SELECT COUNT(*) FROM patient_vitals;

# View data for specific patient
SELECT * FROM patient_vitals WHERE patient_id = 'P001' LIMIT 5;

# Exit
exit
```

---

## Producer Options

### Random Mode (Default)
Generates random vitals data for specified patients:

```powershell
python producer.py --mode random --interval 2 --patients "P001,P002,P003"
```

### CSV Mode
Streams data from a CSV file:

```powershell
# Create sample CSV first
# File format: patient_id,heart_rate,spo2,systolic,diastolic,respiratory_rate,temperature

python producer.py --mode csv --csv sample_vitals.csv --interval 1
```

### Producer Arguments

- `--mode`: `random` or `csv` (default: random)
- `--interval`: Seconds between messages (default: 1.0)
- `--patients`: Comma-separated patient IDs (default: "P001,P002,P003,P004")
- `--csv`: Path to CSV file (only for csv mode)

---

## Alert Rules

The consumer monitors the following thresholds:

- **High Heart Rate**: > 110 bpm
- **Low SpO2**: < 92%

When vitals exceed these thresholds, an alert is displayed and logged.

---

## Stopping the System

### Stop Consumer and Producer

In each terminal window, press:
```
Ctrl+C
```

### Stop Docker Services

```powershell
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (removes all data)
docker-compose down -v
```

### Deactivate Virtual Environment

```powershell
deactivate
```

---

## Troubleshooting

### Issue: Consumer not receiving messages

**Solution:**
```powershell
# Check Kafka logs
docker logs kafka-patient-vitals-kafka-1

# Verify topic exists
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --list --bootstrap-server localhost:9092

# Check if messages are in topic
docker exec -it kafka-patient-vitals-kafka-1 kafka-console-consumer --bootstrap-server localhost:9092 --topic patient.vitals --from-beginning --max-messages 5
```

### Issue: Cannot connect to Cassandra

**Solution:**
```powershell
# Check Cassandra status
docker logs cassandra

# Cassandra takes 60-90 seconds to fully start
# Wait longer and try again

# Verify Cassandra is ready
docker exec -it cassandra cqlsh -e "DESCRIBE KEYSPACES"
```

### Issue: Port already in use

**Solution:**
```powershell
# Check what's using the ports
netstat -ano | findstr "2181"
netstat -ano | findstr "9042"
netstat -ano | findstr "9092"

# Stop conflicting services or change ports in docker-compose.yml
```

### Issue: Python execution policy error

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Module not found errors

**Solution:**
```powershell
# Ensure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### Issue: Gevent/Cassandra connection errors

**Solution:**
```powershell
# Ensure gevent is properly installed
pip uninstall gevent greenlet -y
pip install gevent greenlet

# Verify cassandra-driver installation
pip install --upgrade cassandra-driver
```

---

## Testing the System

### Test 1: Verify End-to-End Flow

1. Start all services
2. Start consumer
3. Start producer
4. Verify messages appear in consumer window
5. Check Cassandra for stored data

### Test 2: Verify Alert System

```powershell
# Modify producer.py temporarily to generate alerts
# Change random_vitals() function to always return high HR:
# "heart_rate": random.randint(111, 130)

# Restart producer and observe alerts in consumer
```

### Test 3: Performance Test

```powershell
# Send messages at high frequency
python producer.py --mode random --interval 0.1

# Monitor consumer lag
docker exec -it kafka-patient-vitals-kafka-1 kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group vitals-monitor-consumer-v7
```

---

## Data Schema

### Patient Vitals Message Format (JSON)

```json
{
  "patient_id": "P001",
  "timestamp": "2025-10-26T10:30:15.123456+00:00",
  "heart_rate": 95,
  "spo2": 98,
  "blood_pressure": {
    "systolic": 120,
    "diastolic": 80
  },
  "respiratory_rate": 16,
  "temperature": 36.8
}
```

### Cassandra Table Schema

```sql
patient_vitals (
    patient_id TEXT,
    timestamp TEXT,
    heart_rate INT,
    spo2 INT,
    systolic INT,
    diastolic INT,
    respiratory_rate INT,
    temperature FLOAT,
    PRIMARY KEY (patient_id, timestamp)
)
```

---

## Useful Commands

### Docker Commands

```powershell
# View logs
docker-compose logs -f                    # All services
docker logs kafka-patient-vitals-kafka-1  # Kafka only
docker logs cassandra                     # Cassandra only

# Restart services
docker-compose restart

# Remove everything
docker-compose down -v
docker system prune -a
```

### Kafka Commands

```powershell
# List topics
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --list --bootstrap-server localhost:9092

# Describe topic
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --describe --topic patient.vitals --bootstrap-server localhost:9092

# View messages
docker exec -it kafka-patient-vitals-kafka-1 kafka-console-consumer --bootstrap-server localhost:9092 --topic patient.vitals --from-beginning

# Delete topic
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --delete --topic patient.vitals --bootstrap-server localhost:9092

# Check consumer group status
docker exec -it kafka-patient-vitals-kafka-1 kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group vitals-monitor-consumer-v7
```

### Cassandra Commands

```powershell
# Connect to Cassandra
docker exec -it cassandra cqlsh

# Backup data
docker exec -it cassandra cqlsh -e "COPY hospital.patient_vitals TO '/tmp/backup.csv'"

# Drop table (careful!)
docker exec -it cassandra cqlsh -e "DROP TABLE hospital.patient_vitals;"

# Check cluster status
docker exec -it cassandra nodetool status
```

---

## Quick Reference: Complete Setup Commands

```powershell
# 1. Create project and virtual environment
New-Item -ItemType Directory -Path "kafka-patient-vitals"
Set-Location kafka-patient-vitals
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 3. Start Docker services
docker-compose up -d
Start-Sleep -Seconds 60

# 4. Setup Cassandra (run in cqlsh)
docker exec -it cassandra cqlsh
# Then run the CREATE KEYSPACE and CREATE TABLE commands

# 5. Create Kafka topic (optional)
docker exec -it kafka-patient-vitals-kafka-1 kafka-topics --create --topic patient.vitals --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

# 6. Start consumer (Terminal 1)
python consumer.py

# 7. Start producer (Terminal 2)
python producer.py --mode random --interval 2

# 8. Verify in Cassandra (Terminal 3)
docker exec -it cassandra cqlsh -e "USE hospital; SELECT * FROM patient_vitals LIMIT 5;"
```

---

## System Requirements

### Minimum Hardware
- **CPU**: 2 cores
- **RAM**: 4 GB (8 GB recommended)
- **Disk**: 10 GB free space

### Software Versions
- **Python**: 3.12 or higher
- **Docker**: 20.10 or higher
- **Docker Compose**: 2.0 or higher

---

## Project Features

✅ Real-time streaming data pipeline  
✅ Alert system for abnormal vitals  
✅ Persistent data storage in Cassandra  
✅ Scalable architecture with Kafka  
✅ Configurable data generation (random or CSV)  
✅ Consumer group management  
✅ Docker containerization  
✅ Python 3.12+ compatible  

---

## Next Steps / Enhancements

- Add more sophisticated alert rules (trend analysis, multiple thresholds)
- Implement real-time dashboard using Grafana or Streamlit
- Add patient demographic data
- Implement data retention policies
- Add authentication and encryption
- Scale to multiple Kafka brokers and Cassandra nodes
- Add unit tests and integration tests
- Implement machine learning for predictive alerts
- Add REST API for data access
- Create mobile app for monitoring

---

## Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Cassandra Documentation](https://cassandra.apache.org/doc/latest/)
- [kafka-python Documentation](https://kafka-python.readthedocs.io/)
- [DataStax Python Driver](https://docs.datastax.com/en/developer/python-driver/)
- [Docker Documentation](https://docs.docker.com/)
- [Gevent Documentation](http://www.gevent.org/)

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Services won't start | Check if ports are available, restart Docker Desktop |
| Consumer shows no partitions | Wait longer for Kafka startup, verify topic exists |
| Cassandra timeout | Cassandra needs 60-90s to start, check logs |
| Import errors | Activate venv, reinstall requirements.txt |
| Permission denied | Run PowerShell as Administrator |

---

## License

This project is for educational purposes.

## Author

Created for Big Data Analytics coursework.

## Contributing

Feel free to submit issues and enhancement requests!

---

## FAQ

**Q: How do I reset everything and start fresh?**  
A: Run `docker-compose down -v` to remove all containers and data, then follow setup steps again.

**Q: Can I run multiple consumers?**  
A: Yes! Start consumer.py in multiple terminals. Kafka will distribute messages among them.

**Q: How do I change alert thresholds?**  
A: Edit the `process()` function in consumer.py and modify the if conditions.

**Q: Can I use a different database instead of Cassandra?**  
A: Yes, modify the `save_to_cassandra()` function to connect to your preferred database.

**Q: How do I monitor system performance?**  
A: Use `docker stats` for container metrics and Kafka consumer group commands for lag monitoring.

---

**Happy Monitoring! 🏥📊**