/**
 * 創建話題標籤的 HTML
 * @param {Object} types - 包含預設和自定義標籤的物件
 * @returns {string} 標籤的 HTML 字串
 */
function createTopicTags(types) {
    const allTypes = [
        ...(types.default || []).map(type => ({ type, isCustom: false })),
        ...(types.custom || []).map(type => ({ type, isCustom: true }))
    ];

    return allTypes.map(({ type, isCustom }) => `
        <span class="tag ${isCustom ? 'custom-tag' : ''}">
            <i class="fas fa-tag"></i> ${type}
        </span>
    `).join('');
}

/**
 * 創建參與者頭像的 HTML
 * @param {Array} attendees - 參與者陣列
 * @returns {string} 頭像的 HTML 字串
 */
function createAttendeeAvatars(attendees) {
    if (!attendees || attendees.length === 0) return '';
    
    return attendees.map(attendee => `
        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${attendee.id}" 
             alt="${attendee.nickname}" 
             title="${attendee.nickname}"
             data-user-id="${attendee.id}">
    `).join('');
}

/**
 * 創建話題卡片的 HTML
 */
function createTopicCard(topic) {
    const progressPercentage = (topic.status.attendeeCount / topic.minAttendees) * 100;
    const showGreenProgress = topic.status.hasReachedMinimum || 
                            topic.status.attendeeCount >= topic.minAttendees;
    
    console.log('渲染話題:', topic);
    
    return `
        <div class="topic-card" data-topic-id="${topic.topicId}">
            <div class="topic-header">
                <h3>
                    <i class="fas fa-coffee"></i> ${topic.title}
                    ${topic.registrationPoint ? 
                        `<span class="registration-point">報名點: ${topic.registrationPoint}</span>` 
                        : ''}
                </h3>
                <div class="topic-tags">
                    ${createTopicTags(topic.types)}
                </div>
            </div>
            
            <div class="topic-content">
                <p class="topic-description">
                    ${topic.description || ''}
                </p>
                
                <div class="topic-progress">
                    <div class="progress-info">
                        <span>目前人數：${topic.status.attendeeCount}/${topic.minAttendees}</span>
                        <span class="min-attendees">
                            <i class="fas fa-users"></i> 最少需要：${topic.minAttendees}人
                        </span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress ${showGreenProgress ? 'reached' : ''}" 
                             style="width: ${Math.min(progressPercentage, 100)}%">
                        </div>
                    </div>
                </div>

                <div class="topic-attendees">
                    <div class="attendee-avatars">
                        ${createAttendeeAvatars(topic.status.currentAttendees)}
                    </div>
                </div>

                <div class="registration-status">
                    ${topic.status.registrationStatus?.pendingRegistrations.length > 0 ?
                        `<div class="pending-registrations">
                            待確認報名: ${topic.status.registrationStatus.pendingRegistrations.length} 人
                        </div>`
                        : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * 創建用戶卡片的 HTML
 */
function createUserCard(userId, user) {
    return `
        <div class="user-card" data-user-id="${userId}">
            <div class="user-avatar">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}" 
                     alt="${user.nickname}">
                <span class="status-dot"></span>
            </div>
            <div class="user-info">
                <h3>${user.nickname}</h3>
                <p><i class="fas fa-briefcase"></i> ${user.occupation}</p>
            </div>
        </div>
    `;
}

/**
 * 顯示用戶詳細資訊的模態框
 * @param {string} userId - 用戶ID
 */
function showUserModal(userId) {
    const user = allUsers[userId];
    if (!user) return;

    const modal = document.getElementById('userModal');
    const profileInfo = modal.querySelector('.profile-info');
    
    // 設置用戶資訊
    modal.querySelector('.profile-avatar').src = 
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
    modal.querySelector('.profile-name').textContent = user.nickname;
    
    // 創建詳細資訊 HTML
    profileInfo.innerHTML = `
        <div class="info-item">
            <i class="fas fa-briefcase"></i>
            <span>職業：${user.occupation}</span>
        </div>
        <div class="info-item">
            <i class="fas fa-clock"></i>
            <span>年齡層：${user.ageRange}</span>
        </div>
        <div class="info-item">
            <i class="fas fa-heart"></i>
            <span>興趣：${[...(user.interests.default || []), ...(user.interests.custom || [])].join(', ')}</span>
        </div>
        <div class="info-item">
            <i class="fas fa-calendar"></i>
            <span>常來時段：${user.timeSlots.map(slot => {
                switch(slot) {
                    case 'morning': return '早上';
                    case 'afternoon': return '下午';
                    case 'evening': return '晚上';
                    default: return slot;
                }
            }).join(', ')}</span>
        </div>
        ${user.history.currentActivities.length > 0 ? `
            <div class="info-item">
                <i class="fas fa-star"></i>
                <span>目前活動：${user.history.currentActivities.map(activity => 
                    `${activity.title}${activity.status === 'pending' ? ' (待確認)' : ''}`
                ).join(', ')}</span>
            </div>
        ` : ''}
    `;

    // 顯示模態框
    modal.style.display = 'block';

    // 添加關閉按鈕事件
    modal.querySelector('.close-btn').onclick = () => {
        modal.style.display = 'none';
    };

    // 點擊模態框外部關閉
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// 全局變數
let allTopics = [];
let allUsers = {};

/**
 * 初始化頁面
 * 1. 獲取所有在線用戶資料
 * 2. 渲染頁面
 */
async function initializePage() {
    try {
        // 建立 WebSocket 連接
        connectWebSocket();

        // 初始載入資料
        await fetchActiveUsers();

        // 渲染頁面
        renderTopics();
        renderOnlineUsers();

    } catch (error) {
        console.error('初始化頁面時發生錯誤:', error);
    }
}

/**
 * 獲取在線用戶資料
 * 只獲取目前插卡槽中的用戶資料
 */
async function fetchActiveUsers() {
    try {
        const response = await fetch('http://localhost:3000/api/active-users');
        const data = await response.json();
        if (data.success) {
            // 儲存在線用戶資料
            allUsers = data.data.activeUsers.reduce((acc, user) => {
                acc[user.cardId] = user.personalInfo;
                return acc;
            }, {});

            // 收集所有活動用戶的話題
            allTopics = data.data.activeUsers
                .filter(user => user.topic)  // 只取有創建話題的用戶
                .map(user => ({
                    ...user.topic,
                    topicId: user.cardId
                }));

            console.log('在線用戶:', allUsers);
            console.log('活動話題:', allTopics);
        }
    } catch (error) {
        console.error('獲取在線用戶資料時發生錯誤:', error);
    }
}

/**
 * 渲染話題列表
 * 只顯示插卡槽中用戶創建的話題
 */
function renderTopics() {
    const topicsContainer = document.querySelector('.topics-list');
    topicsContainer.innerHTML = allTopics.map(topic => createTopicCard(topic)).join('');
}

/**
 * 渲染在線用戶列表
 * 只顯示插卡槽中的用戶
 */
function renderOnlineUsers() {
    const usersList = document.querySelector('.users-list');
    usersList.innerHTML = Object.entries(allUsers)
        .map(([id, user]) => createUserCard(id, user))
        .join('');

    // 添加用戶卡片點擊事件
    document.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', () => showUserModal(card.dataset.userId));
    });
}

// WebSocket 連接
function connectWebSocket() {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
        console.log('WebSocket 連接成功');
    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
            // 更新資料
            allUsers = data.data.activeUsers.reduce((acc, user) => {
                acc[user.cardId] = user.personalInfo;
                return acc;
            }, {});

            allTopics = data.data.activeUsers
                .filter(user => user.topic)
                .map(user => ({
                    ...user.topic,
                    topicId: user.cardId
                }));

            // 重新渲染頁面
            renderTopics();
            renderOnlineUsers();
        }
    };

    ws.onclose = () => {
        console.log('WebSocket 連接斷開，嘗試重新連接...');
        setTimeout(connectWebSocket, 3000);
    };
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', initializePage);