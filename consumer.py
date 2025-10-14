# consumer.py
import json
from kafka import KafkaConsumer
from kafka.errors import KafkaError
import time

TOPIC = "patient.vitals"
BOOTSTRAP = "localhost:9093"
GROUP_ID = "vitals-monitor-consumer-v7"  # Fresh consumer group

def process(msg):
    # msg is bytes -> decode
    data = json.loads(msg)
    # simple alert rule: high HR or low SpO2
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

if __name__ == "__main__":
    try:
        consumer = KafkaConsumer(
            TOPIC,
            bootstrap_servers=BOOTSTRAP,
            auto_offset_reset='earliest',  # Start from beginning
            enable_auto_commit=True,
            group_id=GROUP_ID,
            value_deserializer=lambda m: m.decode('utf-8')
            # Removed consumer_timeout_ms - let it wait indefinitely
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
        consumer.close()
        print("Consumer closed")