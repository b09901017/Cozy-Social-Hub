const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// 中間件設置
app.use(cors());
app.use(express.json());

/**
 * 修正靜態檔案路徑錯誤
 * 問題：原本無法訪問 /login/personal-and-topic-card.html
 * 原因：express.static() 的路徑設置不正確
 * 解決：使用 path.join() 來正確設置根目錄路徑，指向 frontend 資料夾
 */
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * 確保資料檔案存在的功能
 * 用途：自動創建必要的資料檔案和目錄
 * 包含：
 * 1. data 目錄
 * 2. personal-card.json
 * 3. topic-card.json
 * 4. active-users.json
 */
async function ensureDataFiles() {
    const dataDir = path.join(__dirname, 'data');
    const files = {
        'personal-card.json': {},
        'topic-card.json': {},
        'active-users.json': {
            activeUsers: [],
            lastUpdate: null
        }
    };

    try {
        // 確保資料目錄存在
        await fs.mkdir(dataDir, { recursive: true });

        // 確保所有 JSON 檔案存在
        for (const [filename, defaultContent] of Object.entries(files)) {
            const filePath = path.join(dataDir, filename);
            try {
                await fs.access(filePath);
            } catch {
                await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
            }
        }
    } catch (error) {
        console.error('初始化資料檔案時發生錯誤:', error);
    }
}

/**
 * 在 server.js 中設置 nodemailer
 * 設置 Gmail 應用程式密碼：
 * 1. 登入你的 Google 帳號
 * 2. 前往 Google 帳號設定
 * 3. 安全性 > 2 步驟驗證 > 開啟
 * 4. 回到安全性，找到「應用程式密碼」
 * 5. 選擇「其他」，輸入名稱（如：咖啡廳系統）
 * 6. 複製生成的 16 位元密碼
 */
// const nodemailer = require('nodemailer');

// 創建郵件傳送器
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cozycoffee.project@gmail.com',     // 你的 Gmail 帳號
        pass: 'tlci pkdj lefv azqp'         // Gmail 應用程式密碼
    }
});

// 發送郵件的函數
async function sendMinimumReachedEmail(hostEmail, topicTitle, currentCount) {
    const mailOptions = {
        from: 'cozycoffee.project@gmail.com',    // 寄件者信箱
        to: hostEmail,                   // 收件者信箱（話題主持人）
        subject: `【話題人數達標通知】${topicTitle}`,
        html: `
            <h2>您的話題已達到最低人數！</h2>
            <p>話題：${topicTitle}</p>
            <p>目前參與人數：${currentCount} 人</p>
            <p>您可以開始準備與大家討論了！</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('達標通知郵件已發送');
    } catch (error) {
        console.error('發送郵件時發生錯誤:', error);
    }
}

/**
 * API 端點：儲存個人卡片資料
 * 修正：
 * 1. 確保資料結構完整性
 * 2. 添加錯誤處理
 * 3. 自動添加最後更新時間
 */
app.post('/api/personal-card', async (req, res) => {
    try {
        const { cardId, profile } = req.body.data;
        
        // 讀取現有資料
        const filePath = path.join(__dirname, 'data', 'personal-card.json');
        const fileData = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileData);

        // 更新資料
        data[cardId] = {
            ...profile,
            lastUpdated: new Date().toISOString()
        };

        // 寫入檔案
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));

        res.json({ success: true, message: '個人資料儲存' });
    } catch (error) {
        console.error('儲存人資料時發生錯誤:', error);
        res.status(500).json({ success: false, message: '儲存失敗' });
    }
});

/**
 * API 端點：儲存話題卡片資料
 * 修正：
 * 1. 添加資料驗證
 * 2. 自動添加創建和更新時間
 * 3. 確保資料完整性
 */
app.post('/api/topic-card', async (req, res) => {
    try {
        const { cardId, topic } = req.body.data;
        
        // 基本資料驗證
        if (!topic.title) {
            return res.status(400).json({ success: false, message: '缺少必要的話題資訊' });
        }

        // 讀取話題資料
        const topicFilePath = path.join(__dirname, 'data', 'topic-card.json');
        const topicFileData = await fs.readFile(topicFilePath, 'utf8');
        const topicData = JSON.parse(topicFileData);

        // 建立新話題資料
        const newTopic = {
            ...topic,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        // 更新話題資料
        topicData[cardId] = newTopic;
        await fs.writeFile(topicFilePath, JSON.stringify(topicData, null, 2));

        // 讀取個人資料
        const personalFilePath = path.join(__dirname, 'data', 'personal-card.json');
        const personalFileData = await fs.readFile(personalFilePath, 'utf8');
        const personalData = JSON.parse(personalFileData);

        // 確保用戶料和歷史記錄存在
        if (!personalData[cardId]) {
            personalData[cardId] = { history: { createdTopics: [] } };
        }
        if (!personalData[cardId].history) {
            personalData[cardId].history = { createdTopics: [] };
        }
        if (!personalData[cardId].history.createdTopics) {
            personalData[cardId].history.createdTopics = [];
        }

        // 添加新話題到用戶的創建歷史中
        const topicRecord = {
            topicId: cardId,
            title: topic.title,
            createdAt: newTopic.createdAt
        };

        // 確保不會重複添加相同的話題
        const existingIndex = personalData[cardId].history.createdTopics
            .findIndex(t => t.topicId === cardId);
        
        if (existingIndex === -1) {
            personalData[cardId].history.createdTopics.push(topicRecord);
        } else {
            personalData[cardId].history.createdTopics[existingIndex] = topicRecord;
        }

        // 更新個人資料檔案
        await fs.writeFile(personalFilePath, JSON.stringify(personalData, null, 2));

        res.json({ 
            success: true, 
            message: '話題資料已儲存，並更新個人歷史記錄'
        });
    } catch (error) {
        console.error('儲存話題資料時發生錯誤:', error);
        res.status(500).json({ success: false, message: '儲存失敗' });
    }
});

/**
 * API 端點：獲取個人卡片資料
 * 用途：根據 ID 獲取已存在的個人資料
 */
app.get('/api/personal-card/:cardId', async (req, res) => {
    try {
        const cardId = req.params.cardId;
        
        // 讀取個人資料檔案
        const filePath = path.join(__dirname, 'data', 'personal-card.json');
        const fileData = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileData);

        // 檢查是否存在該 ID 的資料
        if (data[cardId]) {
            res.json({
                success: true,
                data: data[cardId]
            });
        } else {
            res.json({
                success: false,
                message: '找不到對應的個人資料'
            });
        }
    } catch (error) {
        console.error('獲取個人資料時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取資料失敗'
        });
    }
});

/**
 * API 端點：處理 ESP32 發送的卡片感應資訊
 */
app.post('/api/card-detected', async (req, res) => {
    try {
        const { cardId } = req.body;
        console.log('收到卡��感應資訊：', cardId);

        // 讀取所有必要的資料
        const activeUsersPath = path.join(__dirname, 'data', 'active-users.json');
        const personalPath = path.join(__dirname, 'data', 'personal-card.json');
        const topicPath = path.join(__dirname, 'data', 'topic-card.json');

        const activeUsersData = JSON.parse(await fs.readFile(activeUsersPath, 'utf8'));
        const personalData = JSON.parse(await fs.readFile(personalPath, 'utf8'));
        const topicData = JSON.parse(await fs.readFile(topicPath, 'utf8'));

        const userData = personalData[cardId];
        const userTopic = topicData[cardId];

        if (!userData) {
            return res.status(404).json({
                success: false,
                message: '找不到該卡片的資料'
            });
        }

        // 準備用戶記錄
        const userRecord = {
            cardId,
            timestamp: new Date().toISOString(),
            personalInfo: userData,
            topic: null
        };

        // 如用戶有創建話題，理話題相關邏輯
        if (userTopic) {
            // 檢查是否需要分配報名點
            if (!userTopic.registrationPoint) {
                // 確保 activeUsersData 有正確的結構
                if (!activeUsersData.activeUsers) {
                    activeUsersData.activeUsers = [];
                }

                // 從 active-users 獲取已使用的感應點
                const usedPoints = activeUsersData.activeUsers
                    .filter(user => user.topic && user.topic.registrationPoint)
                    .map(user => user.topic.registrationPoint);

                // 分配新的感應點（從 A 開始）
                const availablePoints = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                    .split('')
                    .filter(point => !usedPoints.includes(point));

                if (availablePoints.length > 0) {
                    const assignedPoint = availablePoints[0];  // 會拿到第一個未使用的字母
                    userTopic.registrationPoint = assignedPoint;
                    topicData[cardId].registrationPoint = assignedPoint;

                    // 初始化報名狀態
                    if (!userTopic.status.registrationStatus) {
                        userTopic.status.registrationStatus = {
                            isOpen: true,
                            pendingRegistrations: []
                        };
                    }
                }
            }

            // 確保創建者本身是參與者
            if (!userTopic.status.currentAttendees.some(a => a.id === cardId)) {
                userTopic.status.currentAttendees.push({
                    id: cardId,
                    nickname: userData.nickname
                });
                userTopic.status.attendeeCount = userTopic.status.currentAttendees.length;
            }

            // 更新用戶記錄中的話題資訊
            userRecord.topic = userTopic;
        }

        // 檢查是否有待完成的報名
        if (userData.history.currentActivities) {
            const pendingRegistration = userData.history.currentActivities
                .find(activity => !activity.completed);

            if (pendingRegistration) {
                const topic = topicData[pendingRegistration.topicId];
                if (topic) {
                    // 更新話題的參與者列表
                    if (!topic.status.currentAttendees.some(a => a.id === cardId)) {
                        topic.status.currentAttendees.push({
                            id: cardId,
                            nickname: userData.nickname
                        });
                        topic.status.attendeeCount = topic.status.currentAttendees.length;

                        // 更新 active-users.json 中主持人的話題資訊
                        const hostUserIndex = activeUsersData.activeUsers.findIndex(user => 
                            user.cardId === pendingRegistration.topicId
                        );
                        if (hostUserIndex !== -1) {
                            activeUsersData.activeUsers[hostUserIndex].topic = {
                                ...topic,
                                status: {
                                    ...topic.status,
                                    currentAttendees: [...topic.status.currentAttendees]
                                }
                            };
                        }

                        // 標記報名完成
                        pendingRegistration.completed = true;
                        pendingRegistration.completedAt = new Date().toISOString();

                        // 添加到 joinedTopics 歷史記錄
                        if (!userData.history.joinedTopics) {
                            userData.history.joinedTopics = [];
                        }
                        userData.history.joinedTopics.push({
                            topicId: pendingRegistration.topicId,
                            title: topic.title,
                            joinedAt: pendingRegistration.completedAt
                        });

                        // 從待確認列表中移除
                        if (topic.status.registrationStatus?.pendingRegistrations) {
                            topic.status.registrationStatus.pendingRegistrations = 
                                topic.status.registrationStatus.pendingRegistrations
                                    .filter(reg => reg.cardId !== cardId);
                        }

                        const newCount = topic.status.currentAttendees.length;
                        
                        // 檢查是否剛好達到最低人數
                        if (newCount === topic.minAttendees && !topic.minimumReached) {
                            // 標記已達到最低人數
                            topic.status.hasReachedMinimum = true;
                            topic.status.isActive = true;
                            
                            // 發送通知郵件給主持人
                            await sendMinimumReachedEmail(
                                topic.status.host.gmail,
                                topic.title,
                                newCount
                            );
                        }
                    }
                }
            }
        }

        // 更新活動用戶列表
        const existingUserIndex = activeUsersData.activeUsers
            .findIndex(user => user.cardId === cardId);

        if (existingUserIndex === -1) {
            activeUsersData.activeUsers.push(userRecord);
        } else {
            activeUsersData.activeUsers[existingUserIndex] = userRecord;
        }

        activeUsersData.lastUpdate = new Date().toISOString();

        // 儲存所有更新
        await Promise.all([
            fs.writeFile(activeUsersPath, JSON.stringify(activeUsersData, null, 2)),
            fs.writeFile(topicPath, JSON.stringify(topicData, null, 2)),
            fs.writeFile(personalPath, JSON.stringify(personalData, null, 2))
        ]);

        // 廣播更新
        broadcastUpdate({
            type: 'update',
            data: activeUsersData
        });

        res.json({
            success: true,
            message: '卡片感應成功',
            data: userRecord
        });

    } catch (error) {
        console.error('處理卡片感應時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '處理卡片感應失敗'
        });
    }
});

/**
 * API 端點：獲取目前活動中的戶資料
 * 用途：供展示螢幕（display.html）獲取即的在線用戶和話題資料
 * 流程：
 * 1. 讀取 active-users.json 中的資料
 * 2. 回傳所有目前感應中的用戶資料
 * 注意：這個端點會被展示頁面定期呼叫以更新顯示
 */
app.get('/api/active-users', async (req, res) => {
    try {
        const activeUsersPath = path.join(__dirname, 'data', 'active-users.json');
        const activeUsersData = JSON.parse(await fs.readFile(activeUsersPath, 'utf8'));

        res.json({
            success: true,
            data: activeUsersData
        });
    } catch (error) {
        console.error('獲取活動用戶資料時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取活動用戶資料失敗'
        });
    }
});

/**
 * API 端點：分配報名感應點
 * 用途：當有新話題創建時，自動分一個名感應點
 */
app.post('/api/assign-registration-point', async (req, res) => {
    try {
        const { cardId } = req.body;
        
        // 讀取話題資料
        const topicFilePath = path.join(__dirname, 'data', 'topic-card.json');
        const topicData = JSON.parse(await fs.readFile(topicFilePath, 'utf8'));
        
        // 檢查話題是否存在
        if (!topicData[cardId]) {
            return res.status(404).json({
                success: false,
                message: '找不到對應的話題'
            });
        }

        // 獲取已使用的感應點
        const usedPoints = Object.values(topicData)
            .map(topic => topic.registrationPoint)
            .filter(point => point);

        // 分配新的感應點（A-Z）
        const availablePoints = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            .split('')
            .filter(point => !usedPoints.includes(point));

        if (availablePoints.length === 0) {
            return res.status(400).json({
                success: false,
                message: '沒有可用的感應點'
            });
        }

        // 分配第一個可用的感應點
        const assignedPoint = availablePoints[0];
        topicData[cardId].registrationPoint = assignedPoint;
        
        // 初始化報名狀態
        topicData[cardId].status.registrationStatus = {
            isOpen: true,
            pendingRegistrations: []
        };

        // 儲存更新
        await fs.writeFile(topicFilePath, JSON.stringify(topicData, null, 2));

        res.json({
            success: true,
            message: `已分配感應點 ${assignedPoint}`,
            data: { registrationPoint: assignedPoint }
        });

    } catch (error) {
        console.error('分配感應點時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '分配感應點失敗'
        });
    }
});

/**
 * API 端點：處理報名感應點的卡片感應
 * 用途：當用戶在報名感應點感應卡片時呼叫
 * 流程：
 * 1. 接收卡片 ID 和感應點 ID
 * 2. 查找該感應點對應的話題
 * 3. 將話題加入用戶的 currentActivities
 */
app.post('/api/registration-point-detected', async (req, res) => {
    try {
        const { cardId, registrationPointId } = req.body;
        console.log(`收到報名感應：卡片 ${cardId} 在感應點 ${registrationPointId}`);

        // 讀取所有必要的資料
        const personalData = JSON.parse(
            await fs.readFile(path.join(__dirname, 'data', 'personal-card.json'), 'utf8')
        );
        const activeUsersData = JSON.parse(
            await fs.readFile(path.join(__dirname, 'data', 'active-users.json'), 'utf8')
        );
        const topicData = JSON.parse(
            await fs.readFile(path.join(__dirname, 'data', 'topic-card.json'), 'utf8')
        );

        // 查找對應的話題主持人
        const hostUser = activeUsersData.activeUsers.find(user => 
            user.topic && 
            user.topic.registrationPoint === registrationPointId &&
            user.topic.status.registrationStatus.isOpen
        );

        if (!hostUser) {
            return res.status(404).json({
                success: false,
                message: '找不到對應話題'
            });
        }

        const topicId = hostUser.cardId;  // 獲取話題 ID
        const topic = topicData[topicId];  // 從 topic-card.json 獲取話題資料

        if (!topic) {
            return res.status(404).json({
                success: false,
                message: '找不到對應的話題資料'
            });
        }

        // 檢查是否已經報名
        const alreadyRegistered = personalData[cardId].history.currentActivities
            .some(activity => activity.topicId === topicId);

        if (!alreadyRegistered) {
            // 更新 topic-card.json 中的 pendingRegistrations
            if (!topic.status.registrationStatus.pendingRegistrations) {
                topic.status.registrationStatus.pendingRegistrations = [];
            }
            topic.status.registrationStatus.pendingRegistrations.push({
                cardId,
                timestamp: new Date().toISOString()
            });

            // 更新 active-users.json 中主持人的話題資訊
            const hostUserIndex = activeUsersData.activeUsers.findIndex(user => 
                user.cardId === topicId
            );
            if (hostUserIndex !== -1) {
                activeUsersData.activeUsers[hostUserIndex].topic = {
                    ...topic,
                    status: {
                        ...topic.status,
                        registrationStatus: {
                            ...topic.status.registrationStatus
                        }
                    }
                };
            }

            // 更新用戶的 currentActivities
            if (!personalData[cardId].history.currentActivities) {
                personalData[cardId].history.currentActivities = [];
            }

            personalData[cardId].history.currentActivities.push({
                topicId: topicId,
                title: topic.title,
                registrationPoint: registrationPointId,
                registeredAt: new Date().toISOString(),
                status: "pending",
                completed: false
            });

            // 儲存更新
            await Promise.all([
                fs.writeFile(
                    path.join(__dirname, 'data', 'topic-card.json'),
                    JSON.stringify(topicData, null, 2)
                ),
                fs.writeFile(
                    path.join(__dirname, 'data', 'personal-card.json'),
                    JSON.stringify(personalData, null, 2)
                ),
                fs.writeFile(
                    path.join(__dirname, 'data', 'active-users.json'),
                    JSON.stringify(activeUsersData, null, 2)
                )
            ]);

            // 廣播更新
            broadcastUpdate({
                type: 'update',
                data: activeUsersData
            });

            res.json({
                success: true,
                message: '已記錄報名意願，請將卡片插入插卡槽完成報名',
                data: {
                    topic: topic,
                    registrationPoint: registrationPointId
                }
            });
        } else {
            res.json({
                success: false,
                message: '已經報名過此話題'
            });
        }
    } catch (error) {
        console.error('處理報名感應時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '處理報名感應失敗'
        });
    }
});

/**
 * API 端點：處理用戶離開咖啡廳
 * 用途：當 ESP32 偵測到卡片被移除時呼叫
 * 流程：
 * 1. 從 active-users 移除用戶
 * 2. 處理相關話題的狀態
 * 3. 更新用戶的歷史錄
 */
app.post('/api/user-leave', async (req, res) => {
    try {
        const { cardId } = req.body;
        console.log(`用戶離開：${cardId}`);

        // 讀取所有必要的資料
        const activeUsersPath = path.join(__dirname, 'data', 'active-users.json');
        const topicPath = path.join(__dirname, 'data', 'topic-card.json');
        const personalPath = path.join(__dirname, 'data', 'personal-card.json');

        const activeUsersData = JSON.parse(await fs.readFile(activeUsersPath, 'utf8'));
        const topicData = JSON.parse(await fs.readFile(topicPath, 'utf8'));
        const personalData = JSON.parse(await fs.readFile(personalPath, 'utf8'));

        // 找到離開的用戶
        const leavingUser = activeUsersData.activeUsers.find(user => user.cardId === cardId);
        if (!leavingUser) {
            return res.status(404).json({
                success: false,
                message: '找不到該用戶'
            });
        }

        const currentTime = new Date().toISOString();

        // 檢查用戶是否有參與任何話題
        const participatingTopics = Object.entries(topicData).filter(([topicId, topic]) => 
            topic.status.currentAttendees.some(a => a.id === cardId)
        );

        // 處理所有參與的話題
        for (const [topicId, topic] of participatingTopics) {
            if (topicId === cardId) {
                // 如果是話題主持人
                if (!topic.status.hasReachedMinimum) {
                    // 情況一：話題還沒達標，主持人離開直接結束話題
                    console.log('未達標話題結束：主持人離開');
                    
                    // 更新話題狀態
                    topic.status.registrationStatus.isOpen = false;
                    topic.status.hostLeft = true;
                    topic.status.hostLeftAt = currentTime;
                    topic.status.endReason = 'host_left';
                    topic.status.isActive = false;
                    delete topic.registrationPoint;

                    // 通知所有參與者話題已結束並更新他們的歷史記錄
                    topic.status.currentAttendees.forEach(attendee => {
                        if (personalData[attendee.id]) {
                            const attendeeHistory = personalData[attendee.id].history.joinedTopics.find(
                                t => t.topicId === cardId
                            );
                            if (attendeeHistory) {
                                attendeeHistory.endedAt = currentTime;
                                attendeeHistory.endReason = 'host_left';
                            }
                        }
                    });

                    // 清空參與者列表
                    topic.status.currentAttendees = [];
                    topic.status.attendeeCount = 0;

                    // 從 active-users 中移除話題資訊
                    activeUsersData.activeUsers.forEach(user => {
                        if (user.topic && user.topic.topicId === topicId) {
                            user.topic = null;
                        }
                    });
                } else {
                    // 情況二：達標後人數不足，結束話題
                    console.log('達標話題結束：人數不足');

                    // 更新話題狀態
                    topic.status.isActive = false;
                    topic.status.endReason = 'insufficient_members';
                    topic.status.registrationStatus.isOpen = false;
                    delete topic.registrationPoint;

                    // 更新剩餘參與者的歷史記錄
                    topic.status.currentAttendees.forEach(attendee => {
                        if (personalData[attendee.id]) {
                            const attendeeHistory = personalData[attendee.id].history.joinedTopics.find(
                                t => t.topicId === topicId
                            );
                            if (attendeeHistory) {
                                attendeeHistory.endedAt = currentTime;
                                attendeeHistory.endReason = 'insufficient_members';
                            }
                        }
                    });

                    // 清空參與者列表
                    topic.status.currentAttendees = [];
                    topic.status.attendeeCount = 0;

                    // 從所有參與者的 active-users 記錄中移除話題
                    activeUsersData.activeUsers.forEach(user => {
                        if (user.topic && user.topic.topicId === topicId) {
                            user.topic = null;
                        }
                    });
                }
            } else {
                // 一般參與者離開的邏輯
                console.log(`用戶 ${cardId} 離開話題 ${topicId}`);
                
                // 從話題的參與者列表中移除
                topic.status.currentAttendees = topic.status.currentAttendees
                    .filter(a => a.id !== cardId);
                topic.status.attendeeCount = topic.status.currentAttendees.length;

                // 更新 active-users.json 中主持人的話題資訊
                const hostUser = activeUsersData.activeUsers.find(user => 
                    user.cardId === topicId
                );
                if (hostUser && hostUser.topic) {
                    hostUser.topic.status.currentAttendees = topic.status.currentAttendees;
                    hostUser.topic.status.attendeeCount = topic.status.attendeeCount;
                }

                // 更新用戶的參與歷史
                const joinedTopic = personalData[cardId].history.joinedTopics.find(
                    t => t.topicId === topicId
                );
                if (joinedTopic && !joinedTopic.leftAt) {
                    joinedTopic.leftAt = currentTime;
                    joinedTopic.endReason = 'user_left';
                }

                // 情況二：達標後人數不足，結束話題
                if (topic.status.hasReachedMinimum && 
                    topic.status.isActive && 
                    topic.status.attendeeCount <= 1) {
                    
                    console.log('達標話題結束：人數不足');

                    // 更新話題狀態
                    topic.status.isActive = false;
                    topic.status.endReason = 'insufficient_members';
                    topic.status.registrationStatus.isOpen = false;
                    delete topic.registrationPoint;

                    // 更新剩餘參與者的歷史記錄
                    topic.status.currentAttendees.forEach(attendee => {
                        if (personalData[attendee.id]) {
                            const attendeeHistory = personalData[attendee.id].history.joinedTopics.find(
                                t => t.topicId === topicId
                            );
                            if (attendeeHistory) {
                                attendeeHistory.endedAt = currentTime;
                                attendeeHistory.endReason = 'insufficient_members';
                            }
                        }
                    });

                    // 清空參與者列表
                    topic.status.currentAttendees = [];
                    topic.status.attendeeCount = 0;

                    // 從所有參與者的 active-users 記錄中移除話題
                    activeUsersData.activeUsers.forEach(user => {
                        if (user.topic && user.topic.topicId === topicId) {
                            user.topic = null;
                        }
                    });
                }
            }
        }

        // 清空用戶的當前活動
        personalData[cardId].history.currentActivities = [];

        // 從 active-users 中移除用戶
        activeUsersData.activeUsers = activeUsersData.activeUsers
            .filter(user => user.cardId !== cardId);
        activeUsersData.lastUpdate = currentTime;

        // 儲存所有更新
        await Promise.all([
            fs.writeFile(activeUsersPath, JSON.stringify(activeUsersData, null, 2)),
            fs.writeFile(topicPath, JSON.stringify(topicData, null, 2)),
            fs.writeFile(personalPath, JSON.stringify(personalData, null, 2))
        ]);

        // 廣播更新
        broadcastUpdate({
            type: 'update',
            data: activeUsersData
        });

        res.json({
            success: true,
            message: '用戶已成功離開',
            data: {
                wasHost: Boolean(leavingUser.topic),
                affectedTopics: participatingTopics.map(([topicId]) => topicId)
            }
        });

    } catch (error) {
        console.error('處理用戶離開時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '處理用戶離開失敗'
        });
    }
});

// 創建 WebSocket 服務器
const wss = new WebSocket.Server({ port: 8080 });

// 儲存所有連接的客戶端
const clients = new Set();

// WebSocket 連接處理
wss.on('connection', (ws) => {
    // 添加新客戶端
    clients.add(ws);
    console.log('新的顯示器連接');

    // 當客戶端斷開連接
    ws.on('close', () => {
        clients.delete(ws);
        console.log('顯示器斷開連接');
    });
});

// 廣播函數：向所有連接的客戶端發送更新
function broadcastUpdate(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

/**
 * 伺服器啟動函數
 * 修正：
 * 1. 確保資料檔案在伺服器啟動前就已創建
 * 2. 添加完整的前端訪問網址顯示
 * 3. 添加分隔線以提高可讀性
 */
async function startServer() {
    await ensureDataFiles();
    app.listen(PORT, () => {
        console.log(`伺服器運行在 http://localhost:${PORT}`);
        console.log('前端頁面訪問網址：');
        console.log(`http://localhost:${PORT}/login/personal-and-topic-card.html?id=042B5A2ACE1190`);
        console.log('-----------------------------------');
    });
}

startServer(); 