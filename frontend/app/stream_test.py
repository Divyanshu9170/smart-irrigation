import time
import base64
import requests

IMAGE_URL = "http://10.97.53.164/capture"
BACKEND_URL = "http://localhost:5000/sensor-readings/upload-image"

print("🚀 Starting image sender...")

while True:
    try:
        # Fetch image from ESP32
        response = requests.get(IMAGE_URL)

        if response.status_code == 200:
            image_bytes = response.content

            # Convert to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')

            # Send to backend
            res = requests.post(
                BACKEND_URL,
                json={"image": image_base64}
            )

            print("✅ Sent to backend:", res.json())

        else:
            print("❌ Failed to fetch image")

    except Exception as e:
        print("❌ Error:", e)

    time.sleep(10)