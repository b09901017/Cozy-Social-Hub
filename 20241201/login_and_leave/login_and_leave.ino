#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>

// 定義 MFRC522 的腳位
#define RST_PIN         22
#define SS_PIN          21

// // 定義 MFRC522 的腳位
// #define A_RST_PIN         22
// #define A_SS_PIN          21

// WiFi 設定
const char* ssid = "HTC U23 pro";
const char* password = "htcu23pro";

// 伺服器設定
const char* serverUrl = "https://4ff4-180-217-241-190.ngrok-free.app";  // 替換成你的伺服器 URL

// 建立 MFRC522 實例 
MFRC522 mfrc522(SS_PIN, RST_PIN);

// 報名點A
// MFRC522 mfrc522(A_SS_PIN, A_RST_PIN);


// 追蹤卡片狀態的變數
String currentCardId = "";
bool wasCardPresent = false;  // 上一次是否有卡片

void setup() {
    Serial.begin(115200);
    SPI.begin();
    mfrc522.PCD_Init();
    
    // 連接 WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");
}

// 將卡片 ID 轉換為字串
String getCardId(MFRC522::Uid uid) {
    String cardId = "";
    for (byte i = 0; i < uid.size; i++) {
        if (uid.uidByte[i] < 0x10) {
            cardId += "0";
        }
        cardId += String(uid.uidByte[i], HEX);
    }
    cardId.toUpperCase();
    return cardId;
}

// 發送 HTTP 請求
void sendHttpRequest(String cardId, String endpoint) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = String(serverUrl) + endpoint;
        
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        
        String jsonData = "{\"cardId\":\"" + cardId + "\"}";
        
        int httpResponseCode = http.POST(jsonData);
        
        if (httpResponseCode > 0) {
            String response = http.getString();
            Serial.println("HTTP Response code: " + String(httpResponseCode));
            Serial.println("Response: " + response);
        } else {
            Serial.println("Error on sending POST: " + String(httpResponseCode));
        }
        
        http.end();
    }
}

void loop() {
    bool isCardPresent = false;
    String detectedCardId = "";

    // 重要：每次讀取前重置卡片 ///////// 其他方法都沒用 ， 一直無法偵測是否停留在感應區 會自己認為使用者離開 /// 每1s從新初始化
    mfrc522.PCD_Init();

    // 檢查是否有卡片
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
        isCardPresent = true;
        detectedCardId = getCardId(mfrc522.uid);
        mfrc522.PICC_HaltA();
        mfrc522.PCD_StopCrypto1();
    }

    // 狀態變化處理
    if (isCardPresent && !wasCardPresent) {
        // 卡片剛放上
        currentCardId = detectedCardId;
        Serial.println("Card detected: " + currentCardId);
        sendHttpRequest(currentCardId, "/api/card-detected");
    }
    else if (!isCardPresent && wasCardPresent) {
        // 卡片剛移開
        Serial.println("Card removed: " + currentCardId);
        sendHttpRequest(currentCardId, "/api/user-leave");
        currentCardId = "";
    }

    // 更新狀態
    wasCardPresent = isCardPresent;
    
    delay(300);  // 短暫延遲以避免過度讀取
}