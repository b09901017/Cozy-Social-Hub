# 系統目的：
－在咖啡廳中建立一個互動社交平台
－讓用戶可以發起和參與話題討論
－通過實體感應卡片來實現線上線下結合的互動

# 硬體設置：
－插卡槽：用於顯示用戶在咖啡廳的存在
－報名感應點（A-Z）：用於話題報名的實體互動點

# 完整互動流程：
A. 話題創建者（以阿華為例）：
   1. 阿華先在個人資料頁面建立個人資料
   2. 阿華建立話題「聊聊遠端工作的經驗」
   3. 阿華來到咖啡廳，將卡片插入插卡槽
   4. 系統自動分配報名感應點 A 給阿華的話題
   5. 展示螢幕顯示阿華的話題和報名點資訊
B. 報名者（以小美為例）：
   1. 小美看到展示螢幕上阿華的話題
   2. 小美對話題感興趣，看到報名點是 A
   3. 小美拿著卡片去感應報名點 A
   4. 系統記錄小美的報名意願（pendingRegistrations）
   5. 小美將卡片插入插卡槽完成報名確認
   6. 系統更新話題參與者列表和進度條

# 資料流動：
   －personal-card.json：儲存所有用戶的基本資料和歷史記錄
   －topic-card.json：儲存所有話題的詳細資訊
   －active-users.json：記錄當前在咖啡廳的用戶和活動狀態

# 即時更新機制：
－使用 WebSocket 實現即時更新
－當有新的卡片感應時，展示螢幕立即更新
－顯示最新的用戶列表和話題狀態

# 狀態追蹤：
－話題進度：顯示目前參與人數和目標人數
－報名狀態：pending（待確認）→ confirmed（已確認）
－用戶活動：記錄創建的話題和參與的活動

# 系統特色：
－結合實體互動和數位顯示
－兩步驟報名機制確保真實性
即時更新保持資訊同步
完整的歷史記錄追蹤
清晰的視覺化展示

# 測試流程 :

初始設置：
# 1. 啟動後端服務器
cd backend
node server.js

# 2. 打開展示頁面
http://localhost:3000/display/display.html

測試流程一：阿華創建話題並插卡
# 1. 阿華先建立個人資料和話題（使用表單頁面）
http://localhost:3000/login/personal-and-topic-card.html?id=042B5A2ACE1190

# 2. 模擬阿華插卡
POST http://localhost:3000/api/card-detected
Content-Type: application/json
{
    "cardId": "042B5A2ACE1190"
}

# 3. 分配報名感應點
POST http://localhost:3000/api/assign-registration-point
{
    "cardId": "042B5A2ACE1190"
}

預期結果：
展示頁面顯示阿華的個人資料
顯示阿華的話題「聊聊遠端工作的經驗」
話題卡片上顯示報名點 A


測試流程二：小美報名阿華的話題
# 1. 小美在報名點 A 感應
POST http://localhost:3000/api/registration-point-detected
{
    "cardId": "042B5A2ACE1191",
    "registrationPointId": "A"
}

# 2. 小美插卡
POST http://localhost:3000/api/card-detected
{
    "cardId": "042B5A2ACE1191"
}

預期結果：
話題卡片顯示「待確認報名: 1人」
小美的資料出現在左側用戶列表
點擊小美的頭像可以看到她的報名狀態


驗證資料更新：
# 檢查各個 JSON 檔案的狀態
cat backend/data/active-users.json
cat backend/data/personal-card.json
cat backend/data/topic-card.json

需要檢查的重點：
－active-users.json：
阿華和小美都在 activeUsers 列表中
阿華的話題資訊完整
－personal-card.json：
小美的 currentActivities 記錄了報名狀態
報名狀態為 "pending"
－topic-card.json：
阿華的話題有報名點 A
pendingRegistrations 包含小美的報名記錄

# WebSocket 即時更新測試：
每次卡片感應操作後
展示頁面應該立即更新，無需重新整理

這樣的測試流程可以完整驗證：
－話題創建和報名點分配
－報名流程的兩個步驟
－資料的即時更新
－用戶介面的反饋
－各種狀態的正確記錄

# 當用戶離開咖啡廳時，我們需要處理幾個情況：
- 如果離開的人是話題主持人：
  - 需要關閉該話題的報名功能（registrationStatus.isOpen = false）
  - 需要通知所有參與者該話題暫停
  - 釋放該話題的報名感應點，讓其他話題可以使用
- 如果離開的人是參與者：
  - 從話題的 currentAttendees 列表中移除
  - 更新話題的 attendeeCount
  - 如果人數低於最低要求，可能需要標記話題狀態
更新用戶的歷史記錄：
  - 在 personal-card.json 中更新該用戶的記錄
  - 如果是主持人：在 createdTopics 中標記該話題結束時間
  - 如果是參與者：在 joinedTopics 中標記離開時間
  - 清空 currentActivities 列表

## 報名流程測試（需要兩個步驟）：
# 第一步：在報名感應點感應
POST http://localhost:3000/api/registration-point-detected
Content-Type: application/json

{
    "cardId": "042B5A2ACE1200",     // 阿信的卡片
    "registrationPointId": "A"       // 阿華的話題報名點
}
# 預期結果：
personal-card.json 中阿信的 currentActivities 會新增一筆待確認的報名記錄
顯示訊息「已記錄報名意願，請將卡片插入插卡槽完成報名」

# 第二步：插入卡片確認報名
POST http://localhost:3000/api/card-detected
Content-Type: application/json

{
    "cardId": "042B5A2ACE1200"      // 阿信的卡片
}
# 預期結果：
active-users.json 會新增阿信的資料
topic-card.json 中阿華話題的參與者會新增阿信
展示頁面即時更新

## 離開測試：
POST http://localhost:3000/api/user-leave
Content-Type: application/json

{
    "cardId": "042B5A2ACE1190"      // 阿華的卡片
}
# 預期結果：
active-users.json 中移除阿華
topic-card.json 中阿華的話題狀態改變：
registrationStatus.isOpen = false
釋放報名點 A
personal-card.json 中更新阿華的歷史記錄
展示頁面即時更新

## 需要注意的事項：
- 測試報名時：
  - 確認報名點是否存在且開放
  - 確認用戶未重複報名
  - 要按照正確順序：先報名點感應，再插卡確認
- 測試離開時：
  - 如果是話題主持人離開，要特別注意話題狀態的變化
  - 如果是參與者離開，要確認參與者列表正確更新
  - 確認歷史記錄正確更新
- 每次測試後檢查：
  - 三個 JSON 檔案的資料一致性
WebSocket 是否正常推送更新
展示頁面是否正確反映變化

# 話題資料結構
{
    "title": String,
    "gmail": String,
    "minAttendees": Number,
    "types": {
        "default": Array<String>,
        "custom": Array<String>
    },
    "description": String,
    "status": {
        "currentAttendees": [{
            "id": String,
            "nickname": String
        }],
        "attendeeCount": Number,
        "host": {
            "id": String,
            "nickname": String,
            "gmail": String
        },
        "comments": Array,
        "registrationStatus": {
            "isOpen": Boolean,
            "pendingRegistrations": Array
        }
    }
}