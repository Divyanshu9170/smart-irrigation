import time
import base64
import requests

BACKEND_BASE = "http://localhost:5000"
FALLBACK_CAMERA_URL = "http://10.97.53.164"

def get_active_capture_url():
    """
    Dynamically asks the backend for the latest active ESP32-CAM URL.
    This prevents having to manually update the IP every time DHCP changes!
    """
    try:
        res = requests.get(f"{BACKEND_BASE}/devices/camera-url", timeout=3)
        if res.status_code == 200:
            cam_data = res.json()
            cam_url = cam_data.get("url")
            if cam_url:
                return f"{cam_url.rstrip('/')}/capture"
    except Exception as e:
        print(f"⚠️ Could not fetch dynamic camera URL from backend: {e}")

    # Fallback to direct backend proxy capture or hardcoded fallback
    return f"{FALLBACK_CAMERA_URL}/capture"

print("🚀 Starting Smart Farm dynamic image stream worker...")
print(f"📡 Backend URL: {BACKEND_BASE}")

while True:
    try:
        capture_url = get_active_capture_url()
        print(f"📸 Fetching frame from: {capture_url}")

        response = requests.get(capture_url, timeout=5)

        if response.status_code == 200:
            image_bytes = response.content
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')

            # Send to backend for storage & Gemini AI processing
            res = requests.post(
                f"{BACKEND_BASE}/sensor-readings/upload-image",
                json={"image": image_base64},
                timeout=15
            )

            print("✅ Sent to backend:", res.json())
        else:
            print(f"❌ Failed to fetch image (HTTP {response.status_code})")

    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

    time.sleep(10)