# producer.py
import json
import time
import random
from datetime import datetime, timezone
from kafka import KafkaProducer
import csv
import argparse

TOPIC = "patient.vitals"
BOOTSTRAP = "localhost:9093"  # Change this line in producer.py
def json_serializer(obj):
    return json.dumps(obj).encode("utf-8")

def random_vitals(patient_id):
    return {
        "patient_id": patient_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "heart_rate": random.randint(50, 120),
        "spo2": random.randint(88, 100),
        "blood_pressure": {"systolic": random.randint(90, 140), "diastolic": random.randint(60, 95)},
        "respiratory_rate": random.randint(10, 30),
        "temperature": round(random.uniform(35.5, 39.0), 1)
    }

def stream_random(producer, patient_ids, interval):
    try:
        while True:
            pid = random.choice(patient_ids)
            msg = random_vitals(pid)
            producer.send(TOPIC, msg)
            producer.flush()
            print("SENT", msg)
            time.sleep(interval)
    except KeyboardInterrupt:
        print("Stopping producer...")

def stream_from_csv(producer, csv_path, interval):
    with open(csv_path, newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    try:
        idx = 0
        while True:
            r = rows[idx % len(rows)]
            # assume CSV columns: patient_id,heart_rate,spo2,systolic,diastolic,respiratory_rate,temperature
            msg = {
                "patient_id": r["patient_id"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "heart_rate": int(r["heart_rate"]),
                "spo2": int(r["spo2"]),
                "blood_pressure": {"systolic": int(r["systolic"]), "diastolic": int(r["diastolic"])},
                "respiratory_rate": int(r["respiratory_rate"]),
                "temperature": float(r["temperature"])
            }
            producer.send(TOPIC, msg)
            producer.flush()
            print("SENT (csv)", msg)
            idx += 1
            time.sleep(interval)
    except KeyboardInterrupt:
        print("Stopping producer...")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["random", "csv"], default="random")
    parser.add_argument("--csv", type=str, default="sample_vitals.csv")
    parser.add_argument("--interval", type=float, default=1.0, help="seconds between messages")
    parser.add_argument("--patients", type=str, default="P001,P002,P003,P004", help="comma separated patient ids")
    args = parser.parse_args()

    producer = KafkaProducer(bootstrap_servers=BOOTSTRAP, value_serializer=json_serializer)
    if args.mode == "random":
        patient_ids = args.patients.split(",")
        stream_random(producer, patient_ids, args.interval)
    else:
        stream_from_csv(producer, args.csv, args.interval)
