/*
 * ==============================================================================
 * Smart E-Fining System — ESP32 + NEO-6M GPS (Render Cloud & Serial Debugger)
 * ==============================================================================
 * 
 * Features:
 *   1. Clear Serial Monitor output showing Wi-Fi, GPS, and Render server status.
 *   2. Checks if NEO-6M GPS hardware is actually sending data (UART test).
 *   3. If GPS is indoors (no satellite fix), optionally sends simulated Dhaka coordinates
 *      so your Render server and Web Dashboard can be tested immediately!
 *   4. Connects to Render via HTTPS (WiFiClientSecure with SSL bypass & cold-start timeout).
 *   5. Parses and prints server response (Zone name, Speed Limit, Warnings, Fines).
 * 
 * Hardware Connections:
 *   ESP32 GPIO 16 (RX2) <--- NEO-6M TX
 *   ESP32 GPIO 17 (TX2) ---> NEO-6M RX
 *   ESP32 3.3V or 5V    ---> NEO-6M VCC
 *   ESP32 GND           ---> NEO-6M GND
 * 
 * Serial Monitor Baud Rate: 115200
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <TinyGPS++.h>

// -----------------------------------------------------------------------------
// 1. CONFIGURATION (Wi-Fi, Render URL, Device ID)
// -----------------------------------------------------------------------------
const char* WIFI_SSID     = "Do IT!";
const char* WIFI_PASSWORD = "do683times";

// Render Cloud Endpoint
const char* RENDER_URL    = "https://smart-efining-system-1.onrender.com/api/telemetry";

// Device & Vehicle ID (Must match registered MongoDB records)
const char* DEVICE_ID     = "ESP32-DVC-45821";
const char* VEHICLE_ID    = "VH-10294";

// If true: When GPS has no satellites/fix indoors, sends simulated Dhaka coordinates
// so you can confirm data is reaching Render right from your desk!
// Set to false if you strictly want to send ONLY real GPS satellite data.
const bool USE_TEST_COORDS_IF_NO_FIX = true;

// Timing
const unsigned long SEND_INTERVAL_MS = 6000; // Send telemetry every 6 seconds

// GPS Hardware Serial Pins
#define GPS_RX_PIN  16
#define GPS_TX_PIN  17
#define GPS_BAUD    9600
#define SERIAL_BAUD 115200

// -----------------------------------------------------------------------------
// 2. OBJECTS & GLOBALS
// -----------------------------------------------------------------------------
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

unsigned long lastSendTime = 0;
int packetCount = 0;

// Simulated test data (moves slightly to test speed/zones if indoors)
double testLat = 23.8103;
double testLng = 90.4125;
double testSpeed = 45.0; // km/h

// -----------------------------------------------------------------------------
// 3. FUNCTION DECLARATIONS
// -----------------------------------------------------------------------------
void connectWiFi();
void maintainWiFi();
void checkGpsHardware();
void sendDataToRender(double lat, double lng, double speed_kmh, int sats, bool isRealGps);
void printServerResponse(int statusCode, const String& response);
String extractJsonString(const String& json, const String& key);
String extractJsonValue(const String& json, const String& key);

// -----------------------------------------------------------------------------
// 4. SETUP
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1500);

  Serial.println();
  Serial.println("=============================================================");
  Serial.println("   SMART E-FINING SYSTEM — ESP32 TELEMETRY SENDER            ");
  Serial.println("=============================================================");
  Serial.printf(" Device ID      : %s\n", DEVICE_ID);
  Serial.printf(" Vehicle ID     : %s\n", VEHICLE_ID);
  Serial.printf(" Render Server  : %s\n", RENDER_URL);
  Serial.printf(" Test Fallback  : %s\n", USE_TEST_COORDS_IF_NO_FIX ? "ENABLED (Indoors OK)" : "DISABLED (Needs 3D GPS Fix)");
  Serial.println("=============================================================");

  // Initialize GPS Serial
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] UART2 started on RX: GPIO16, TX: GPIO17 (9600 baud)");

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  connectWiFi();
}

// -----------------------------------------------------------------------------
// 5. MAIN LOOP
// -----------------------------------------------------------------------------
void loop() {
  // Feed GPS characters to TinyGPS++ parser
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Ensure Wi-Fi remains connected
  maintainWiFi();

  // Send telemetry at regular intervals
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    // Check GPS data
    bool hasGpsFix = (gps.location.isValid() && gps.location.age() < 4000 && gps.satellites.value() >= 4);

    Serial.println("\n-------------------------------------------------------------");
    Serial.printf("[STATUS CHECK #%d]\n", ++packetCount);
    checkGpsHardware();

    double lat = 0.0;
    double lng = 0.0;
    double speed = 0.0;
    int satellites = 0;
    bool isRealGps = false;

    if (hasGpsFix) {
      // We have a real satellite fix!
      lat = gps.location.lat();
      lng = gps.location.lng();
      speed = gps.speed.isValid() ? gps.speed.kmph() : 0.0;
      satellites = gps.satellites.isValid() ? gps.satellites.value() : 4;
      isRealGps = true;

      Serial.println("[GPS STATUS] >>> REAL GPS FIX ACQUIRED! <<<");
      Serial.printf("  Latitude  : %.6f\n", lat);
      Serial.printf("  Longitude : %.6f\n", lng);
      Serial.printf("  Speed     : %.2f km/h\n", speed);
      Serial.printf("  Satellites: %d\n", satellites);
    } 
    else {
      // No GPS fix yet (common indoors)
      satellites = gps.satellites.isValid() ? gps.satellites.value() : 0;
      Serial.println("[GPS STATUS] Searching for satellite fix...");
      Serial.printf("  Visible Satellites: %d (Need >= 4 and sky visibility)\n", satellites);

      if (USE_TEST_COORDS_IF_NO_FIX) {
        // Use test coordinates inside Bangladesh (Dhaka zone)
        testLat += 0.00005; // Simulate gentle forward motion
        testLng += 0.00003;
        lat = testLat;
        lng = testLng;
        speed = testSpeed;
        satellites = 6;
        isRealGps = false;

        Serial.println("[FALLBACK] Using Simulated Dhaka Coordinates for testing Render:");
        Serial.printf("  Lat: %.6f | Lng: %.6f | Speed: %.1f km/h\n", lat, lng, speed);
      } else {
        Serial.println("[INFO] Telemetry paused until satellite lock is obtained.");
        return;
      }
    }

    // Send payload to Render Cloud
    sendDataToRender(lat, lng, speed, satellites, isRealGps);
  }
}

// -----------------------------------------------------------------------------
// 6. WI-FI MANAGER
// -----------------------------------------------------------------------------
void connectWiFi() {
  Serial.printf("\n[WiFi] Connecting to \"%s\" ", WIFI_SSID);
  WiFi.disconnect(true);
  delay(200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Connected successfully!");
    Serial.printf("[WiFi] ESP32 Local IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WiFi] Signal RSSI   : %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("[WiFi] Connection failed! Will retry in loop...");
  }
}

void maintainWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 8000) {
      lastRetry = millis();
      Serial.println("[WiFi] Lost connection. Reconnecting...");
      connectWiFi();
    }
  }
}

// -----------------------------------------------------------------------------
// 7. GPS HARDWARE DIAGNOSTIC
// -----------------------------------------------------------------------------
void checkGpsHardware() {
  unsigned long chars = gps.charsProcessed();
  if (chars == 0) {
    Serial.println("[GPS HARDWARE WARNING] 0 bytes received from GPS module!");
    Serial.println("  -> Check wiring: GPS TX must go to ESP32 GPIO 16 (RX2).");
    Serial.println("  -> Check GPS VCC (3.3V or 5V) and GND.");
  } else {
    Serial.printf("[GPS HARDWARE OK] %lu raw NMEA characters received.\n", chars);
  }
}

// -----------------------------------------------------------------------------
// 8. SEND TELEMETRY TO RENDER VIA HTTPS
// -----------------------------------------------------------------------------
void sendDataToRender(double lat, double lng, double speed_kmh, int sats, bool isRealGps) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi is disconnected. Cannot send data.");
    return;
  }

  // Construct JSON Payload
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"vehicleId\":\"" + String(VEHICLE_ID) + "\",";
  payload += "\"latitude\":" + String(lat, 6) + ",";
  payload += "\"longitude\":" + String(lng, 6) + ",";
  payload += "\"gpsSpeed\":" + String(speed_kmh, 1) + ",";
  payload += "\"satellites\":" + String(sats);
  payload += "}";

  Serial.println("[HTTP] Sending JSON to Render Cloud:");
  Serial.println("  Payload: " + payload);

  // Use WiFiClientSecure for HTTPS connection to Render
  WiFiClientSecure client;
  client.setInsecure(); // Bypass CA certificate check for ease of development

  HTTPClient http;
  http.begin(client, RENDER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(25000); // 25s timeout to accommodate Render free-tier cold starts

  Serial.printf("[HTTP] POST %s ...\n", RENDER_URL);
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.printf("[HTTP] SUCCESS! Response Code: %d\n", httpCode);
    String response = http.getString();
    printServerResponse(httpCode, response);
  } else {
    Serial.printf("[HTTP] FAILED! Error: %s (Code %d)\n", http.errorToString(httpCode).c_str(), httpCode);
    Serial.println("  [Tips]:");
    Serial.println("  1. If code is -1 or timeout: Render free server might be waking up (takes ~30-50s).");
    Serial.println("  2. Verify your internet connection on this Wi-Fi network.");
  }

  http.end();
}

// -----------------------------------------------------------------------------
// 9. PARSE & DISPLAY SERVER RESPONSE
// -----------------------------------------------------------------------------
void printServerResponse(int statusCode, const String& response) {
  if (response.length() == 0) return;

  String status     = extractJsonString(response, "status");
  String speedStr   = extractJsonValue(response, "speed");
  String limitStr   = extractJsonValue(response, "allowedSpeed");
  String roadStr    = extractJsonString(response, "road");
  String message    = extractJsonString(response, "message");
  String fineId     = extractJsonString(response, "fineId");
  String fineAmount = extractJsonValue(response, "fineAmount");

  Serial.println("  +----------------- RENDER RESPONSE -----------------+");
  Serial.printf("  | Status      : %s\n", status.length() > 0 ? status.c_str() : "OK");
  if (roadStr.length() > 0)
    Serial.printf("  | Road/Zone   : %s\n", roadStr.c_str());
  if (limitStr.length() > 0)
    Serial.printf("  | Speed Limit : %s km/h\n", limitStr.c_str());
  if (speedStr.length() > 0)
    Serial.printf("  | Rec. Speed  : %s km/h\n", speedStr.c_str());

  if (status == "WARNING") {
    Serial.println("  | [!] WARNING: Overspeed detected, slow down!");
  } else if (status == "OVERSPEED" || status == "VIOLATION") {
    Serial.println("  | [!] VIOLATION: Fine generated on Render database!");
    if (fineId.length() > 0)   Serial.printf("  | Fine ID     : %s\n", fineId.c_str());
    if (fineAmount.length() > 0) Serial.printf("  | Fine Amount : BDT %s\n", fineAmount.c_str());
  } else {
    Serial.println("  | [v] Status: NORMAL (Within speed limit)");
  }

  if (message.length() > 0) {
    Serial.printf("  | Server Note : %s\n", message.c_str());
  }
  Serial.println("  +---------------------------------------------------+");
}

// -----------------------------------------------------------------------------
// 10. LIGHTWEIGHT JSON PARSER HELPERS
// -----------------------------------------------------------------------------
String extractJsonString(const String& json, const String& key) {
  String searchKey = "\"" + key + "\":\"";
  int startIdx = json.indexOf(searchKey);
  if (startIdx < 0) return "";
  startIdx += searchKey.length();
  int endIdx = json.indexOf("\"", startIdx);
  if (endIdx < 0) return "";
  return json.substring(startIdx, endIdx);
}

String extractJsonValue(const String& json, const String& key) {
  String searchKey = "\"" + key + "\":";
  int startIdx = json.indexOf(searchKey);
  if (startIdx < 0) return "";
  startIdx += searchKey.length();
  while (startIdx < (int)json.length() && (json.charAt(startIdx) == ' ' || json.charAt(startIdx) == '\t')) {
    startIdx++;
  }
  if (json.charAt(startIdx) == '"') {
    return extractJsonString(json, key);
  }
  int endIdx = startIdx;
  while (endIdx < (int)json.length()) {
    char c = json.charAt(endIdx);
    if (c == ',' || c == '}' || c == ']') break;
    endIdx++;
  }
  return json.substring(startIdx, endIdx);
}
