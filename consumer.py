# consumer.py
import json
from kafka import KafkaConsumer
from kafka.errors import KafkaError
import time

# ---- FIX: Cassandra connection setup for Python 3.12 ----
from gevent import monkey
monkey.patch_all()

from cassandra.cluster import Cluster
# ---------------------------------------------------------

# Connect to Cassandra
cluster = Cluster(['localhost'])
session = cluster.connect('hospital')

TOPIC = "patient.vitals"
BOOTSTRAP = "localhost:9093"
GROUP_ID = "vitals-monitor-consumer-v7"  # Fresh consumer group

def save_to_cassandra(data):
    """Save patient vitals data to Cassandra database"""
    session.execute(
        """
        INSERT INTO patient_vitals (patient_id, timestamp, heart_rate, spo2, systolic, diastolic, respiratory_rate, temperature)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            data['patient_id'],
            data['timestamp'],
            data['heart_rate'],
            data['spo2'],
            data['blood_pressure']['systolic'],
            data['blood_pressure']['diastolic'],
            data['respiratory_rate'],
            data['temperature']
        )
    )

def process(msg):
    """Process incoming patient vitals message and check for alerts"""
    # msg is string -> parse JSON
    data = json.loads(msg)
    
    # Simple alert rules: high HR or low SpO2
    hr = data.get("heart_rate")
    spo2 = data.get("spo2")
    alerts = []
    
    if hr and hr > 110:
        alerts.append(f"High heart rate: {hr}")
    if spo2 and spo2 < 92:
        alerts.append(f"Low SpO2: {spo2}")
    
    ts = data.get("timestamp")
    print(f"[{ts}] {data['patient_id']} -> HR:{hr} SpO2:{spo2} BP:{data['blood_pressure']} RR:{data['respiratory_rate']} T:{data['temperature']}")
    
    if alerts:
        print("  >>> ALERT:", "; ".join(alerts))
    
    # Save to Cassandra
    save_to_cassandra(data)

if __name__ == "__main__":
    consumer = None
    try:
        consumer = KafkaConsumer(
            TOPIC,
            bootstrap_servers=BOOTSTRAP,
            auto_offset_reset='earliest',  # Start from beginning
            enable_auto_commit=True,
            group_id=GROUP_ID,
            value_deserializer=lambda m: m.decode('utf-8')
        )
        
        print(f"Consumer started, listening to '{TOPIC}'")
        print(f"Bootstrap servers: {BOOTSTRAP}")
        print(f"Consumer group: {GROUP_ID}")
        
        # Give Kafka time to assign partitions
        print("Waiting for partition assignment...")
        time.sleep(2)
        
        # Check partition assignment
        partitions = consumer.assignment()
        print(f"Partitions assigned: {partitions}")
        
        if not partitions:
            print("WARNING: No partitions assigned! Waiting longer...")
            time.sleep(3)
            partitions = consumer.assignment()
            print(f"Partitions now: {partitions}")
        
        print("\nListening for messages... (Press Ctrl+C to stop)\n")
        
        message_count = 0
        for record in consumer:
            message_count += 1
            print(f"\n--- Message #{message_count} ---")
            print(f"Topic: {record.topic}, Partition: {record.partition}, Offset: {record.offset}")
            process(record.value)
            
    except KafkaError as e:
        print(f"Kafka Error: {e}")
    except KeyboardInterrupt:
        print("\n\nStopping consumer...")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if consumer:
            consumer.close()
            print("Consumer closed")
        if cluster:
            cluster.shutdown()
            print("Cassandra connection closed")