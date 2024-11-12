# 咖啡廳互動系統

這是一個結合 RFID 卡片感應的咖啡廳互動系統，包含個人資料管理、話題創建、報名功能和即時顯示功能。

## 系統架構

- 前端：HTML, CSS, JavaScript
- 後端：Node.js, Express
- 即時通訊：WebSocket
- 資料儲存：JSON 檔案
- 硬體設備：ESP32 + RC522 讀卡機

## 目錄結構 
project/
├── frontend/
│ ├── login/
│ │ ├── personal-and-topic-card.html # 個人資料和話題創建頁面
│ │ ├── Personal-and-topic-card.css
│ │ └── Personal-and-topic-card.js
│ └── display/
│ ├── display.html # 展示頁面
│ ├── display.css
│ └── display.js
└── backend/
├── server.js # 後端服務器
└── data/
├── personal-card.json # 個人資料儲存
├── topic-card.json # 話題資料儲存
└── active-users.json # 即時活動用戶資料

## 功能特色

### 1. 個人資料管理
- 基本資料設定（暱稱、年齡層、職業）
- 興趣標籤（預設 + 自定義）
- 常來時段選擇
- 完整的活動歷史記錄

### 2. 話題管理
- 話題創建與設定
  * 主題設定
  * 最低參與人數
  * 話題類型標籤
  * 補充說明
- 自動分配報名感應點（A-Z）
- 即時人數統計
- 達標自動通知（Gmail）

### 3. 實體互動功能
- 插卡槽感應
  * 顯示個人在線狀態
  * 自動分配報名點（話題創建者）
  * 完成報名確認
- 報名感應點
  * 兩步驟報名機制
  * 防止重複報名
  * 即時狀態更新

### 4. 即時顯示系統
- 在線用戶列表
- 進行中的話題
- 報名進度追蹤
- 參與者狀態
- WebSocket 即時更新

## 安裝與設置

### 1. 環境需求
- Node.js (v14.0.0 或以上)
- npm (v6.0.0 或以上)

### 2. 安裝步驟
bash
1. 安裝依賴套件
cd backend
npm install express cors ws nodemailer
2. 設置 Gmail 應用程式密碼
- 登入 Google 帳號
- 開啟兩步驟驗證
- 設置應用程式密碼
- 在 server.js 中設定郵件資訊
3. 啟動後端服務器
node server.js

## 測試流程

### 1. 基本設置測試
bash
1. 啟動後端服務器
node server.js
2. 訪問個人資料表單
http://localhost:3000/login/personal-and-topic-card.html?id=test001
3. 開啟展示頁面
http://localhost:3000/display/display.html

### 2. 話題創建者流程測試
1. 話題創建者插卡
POST http://localhost:3000/api/card-detected
{
"cardId": "test001"
}
預期結果：
在 active-users.json 中出現
自動分配報名點 A
顯示在展示頁面上

### 3. 報名流程測試
http
1. 在報名點感應
POST http://localhost:3000/api/registration-point-detected
{
"cardId": "test002",
"registrationPointId": "A"
}
預期結果：
在話題卡片上顯示「待確認報名: 1人」
更新 topic-card.json 中的 pendingRegistrations
2. 插卡確認報名
POST http://localhost:3000/api/card-detected
{
"cardId": "test002"
}
預期結果：
加入話題的參與者列表
更新進度條
在展示頁面顯示新的參與者

### 4. 達標通知測試
當參與人數達到最低要求時：
進度條變成綠色
自動發送 Gmail 通知給主持人
顯示達標動畫效果


### 5. 離開測試
http
1. 普通參與者離開
POST http://localhost:3000/api/user-leave
{
"cardId": "test002"
}
預期結果：
從 active-users.json 中移除
從話題參與者列表中移除
更新進度條
2. 話題主持人離開
POST http://localhost:3000/api/user-leave
{
"cardId": "test001"
}
預期結果：
關閉話題報名功能
釋放報名點
更新所有參與者的狀態

## 資料結構

### 1. personal-card.json
- 儲存所有註冊用戶的個人資料
- 包含個人資訊、興趣、時段偏好
- 記錄活動歷史

### 2. topic-card.json
- 儲存所有話題資訊
- 包含話題設定、參與者、報名狀態
- 記錄報名點分配

### 3. active-users.json
- 記錄當前在咖啡廳的用戶
- 即時話題狀態
- 報名進度追蹤

## 注意事項

1. 系統啟動前：
   - 確認所有 JSON 檔案存在
   - 設置正確的 Gmail 資訊
   - 確保 WebSocket 端口（8080）可用

2. 資料安全：
   - 定期備份 JSON 檔案
   - 避免直接修改資料檔案
   - 使用環境變數存儲敏感資訊

3. 錯誤處理：
   - 檢查伺服器日誌
   - 確認 WebSocket 連接狀態
   - 驗證資料完整性

## 系統限制

1. 報名點分配：
   - 最多支援 26 個同時進行的話題（A-Z）
   - 需手動管理報名點的清理

2. 資料儲存：
   - 使用 JSON 檔案儲存，適合小規模使用
   - 大量資料建議遷移至資料庫

3. 網路要求：
   - 需要穩定的網路連接
   - WebSocket 需要持續連接

## 未來展望

1. 功能擴充：
   - 話題分類系統
   - 用戶配對推薦
   - 活動回顧功能

2. 效能優化：
   - 資料庫整合
   - 快取機制
   - 負載平衡

3. 使用者體驗：
   - 手機版面適配
   - 多語言支援
   - 客製化主題