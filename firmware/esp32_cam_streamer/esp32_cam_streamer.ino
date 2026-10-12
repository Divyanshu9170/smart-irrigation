/*
  =====================================================================================
  📷 SMART FARM - ESP32-CAM VIDEO & IMAGE CAPTURE SERVER
  =====================================================================================
  Board: "AI Thinker ESP32-CAM"
  CPU Frequency: 240MHz
  Flash Frequency: 80MHz
  Flash Mode: QIO
  Partition Scheme: Huge APP (3MB No OTA/1MB SPIFFS)
  
  Features:
  - High-Resolution OV2640 Image Capture
  - HTTP Server serving /capture for Dashboard live view & 1-min auto snapshots
  - Automatically notifies NestJS backend about its live IP address
  - Built-in LED Flashlight control
  =====================================================================================
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// =====================================================================================
// 🌐 1. WI-FI & BACKEND CONFIGURATION
// =====================================================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend Server IP & Port (same as main controller):
const char* BACKEND_CAM_REGISTER_URL = "http://192.168.1.100:5000/devices/camera-url";

// =====================================================================================
// 📌 2. AI-THINKER CAMERA PIN CONFIGURATION
// =====================================================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define FLASH_LED_PIN      4     // On-board bright white flash LED

WiFiServer server(80);

// =====================================================================================
// 📸 3. CAMERA HARDWARE INITIALIZATION
// =====================================================================================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Frame size & quality configuration
  if (psramFound()) {
    config.frame_size   = FRAMESIZE_SVGA; // 800x600 (Clear for AI & fast for Wi-Fi)
    config.jpeg_quality = 12;             // 0-63 (lower means higher quality)
    config.fb_count     = 2;
  } else {
    config.frame_size   = FRAMESIZE_VGA;  // 640x480 fallback if no PSRAM
    config.jpeg_quality = 15;
    config.fb_count     = 1;
  }

  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    return false;
  }

  sensor_t * s = esp_camera_sensor_get();
  // Image tuning for natural foliage green balance
  s->set_brightness(s, 1);
  s->set_contrast(s, 1);
  s->set_saturation(s, 0);
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_wb_mode(s, 0);

  Serial.println("✅ OV2640 Optics Sensor Initialized Successfully!");
  return true;
}

// =====================================================================================
// 📡 4. AUTO-REGISTER IP WITH NESTJS BACKEND
// =====================================================================================
void registerCameraWithBackend() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_CAM_REGISTER_URL);
    http.addHeader("Content-Type", "application/json");

    String myUrl = "http://" + WiFi.localIP().toString();
    String payload = "{\"url\":\"" + myUrl + "\"}";

    int code = http.POST(payload);
    if (code > 0) {
      Serial.printf("✅ Camera URL auto-registered with Backend: %s\n", myUrl.c_str());
    } else {
      Serial.printf("⚠️ Failed to auto-register Camera URL (%d)\n", code);
    }
    http.end();
  }
}

// =====================================================================================
// 🚀 5. SETUP
// =====================================================================================
void setup() {
  // Disable brownout detector to prevent reboot on Wi-Fi current spikes
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW); // Flash OFF

  Serial.println("\n==================================================");
  Serial.println("📷 SMART FARM - ESP32-CAM OPTICAL NODE STARTING");
  Serial.println("==================================================");

  // Initialize Camera
  if (!initCamera()) {
    Serial.println("Retrying camera in 3s...");
    delay(3000);
    ESP.restart();
  }

  // Connect Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ ESP32-CAM Wi-Fi Connected!");
    Serial.print("📡 Stream / Capture URL: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/capture");

    // Start HTTP Server
    server.begin();
    Serial.println("🌐 HTTP Frame Server Listening on Port 80");

    // Inform Backend of new IP
    registerCameraWithBackend();
  } else {
    Serial.println("\n❌ Wi-Fi Connection failed. Please check SSID & Password.");
  }
}

// =====================================================================================
// 🔁 6. MAIN LOOP - SERVE HTTP /capture REQUESTS
// =====================================================================================
void loop() {
  WiFiClient client = server.available();
  if (!client) {
    delay(10);
    return;
  }

  String request = "";
  while (client.connected() && !client.available()) {
    delay(1);
  }

  while (client.available()) {
    char c = client.read();
    request += c;
    if (c == '\n') break;
  }

  // Handle /capture request
  if (request.indexOf("GET /capture") >= 0 || request.indexOf("GET /") >= 0) {
    // Capture fresh JPEG frame from OV2640 sensor
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("❌ Camera capture failed");
      client.println("HTTP/1.1 500 Internal Server Error");
      client.println("Content-Type: text/plain\r\n");
      client.println("Camera capture error");
      client.stop();
      return;
    }

    // Send HTTP Response Headers with full CORS enablement
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: image/jpeg");
    client.println("Content-Disposition: inline; filename=capture.jpg");
    client.println("Access-Control-Allow-Origin: *");
    client.println("Cache-Control: no-cache, no-store, must-revalidate");
    client.printf("Content-Length: %u\r\n\r\n", fb->len);

    // Stream JPEG bytes directly to client
    client.write(fb->buf, fb->len);
    client.flush();
    client.stop();

    // Release frame buffer back to camera driver
    esp_camera_fb_return(fb);
  } else {
    client.println("HTTP/1.1 404 Not Found");
    client.println("Content-Type: text/plain\r\n");
    client.println("Endpoint not found. Use /capture");
    client.stop();
  }
}
