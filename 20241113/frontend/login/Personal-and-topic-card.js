/**
 * 從 URL 中獲取指定參數的值
 * @param {string} name - 要獲取的參數名稱
 * @returns {string|null} - 參數值，如果不存在則返回 null
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 初始化切換按鈕功能
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // 如果按鈕已經是 active 狀態，則不執行任何操作
        if (btn.classList.contains('active')) return;

        // 更新切換按鈕的狀態
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 獲取目標區段和當前區段
        const targetSection = document.getElementById(`${btn.dataset.section}-section`);
        const currentSection = document.querySelector('.form-section.active');

        // 更新頁面主題樣式
        document.body.classList.remove('profile-mode', 'topic-mode');
        document.body.classList.add(`${btn.dataset.section}-mode`);

        // 執行切換動畫
        currentSection.style.opacity = '0';
        currentSection.style.transform = 'translateY(10px)';

        // 使用 setTimeout 來確保動畫順暢
        setTimeout(() => {
            currentSection.classList.remove('active');
            targetSection.classList.add('active');

            // 使用 requestAnimationFrame 來確保 CSS 轉換正確執行
            requestAnimationFrame(() => {
                targetSection.style.opacity = '1';
                targetSection.style.transform = 'translateY(0)';
            });
        }, 300);

        // 根據當前區段更新儲存按鈕顏色
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.style.background = btn.dataset.section === 'profile' ? '#718096' : '#ed8936';
    });
});

// 頁面載入時的初始化設置
document.addEventListener('DOMContentLoaded', () => {
    // 獲取並顯示卡片 ID
    const cardId = getUrlParameter('id') || '未指定 ID';
    document.getElementById('card-id').textContent = cardId;

    // 設置初始主題為個人資料模式
    document.body.classList.add('profile-mode');

    // 初始化個人資料
    initializePersonalData();
});

// 設置標籤和時間選擇的點擊效果
document.querySelectorAll('.tag, .time-slot').forEach(element => {
    element.addEventListener('click', function() {
        // 切換 active 狀態
        this.classList.toggle('active');
        
        // 添加點擊反饋動畫
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'translateY(0)';
        }, 100);
    });
});

// 優化表單輸入體驗
document.querySelectorAll('input, select, textarea').forEach(input => {
    // 輸入框獲得焦點時的效果
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });

    // 輸入框失去焦點時的效果
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// 初始化自定義興趣標籤功能
document.addEventListener('DOMContentLoaded', () => {
    const customInterestInput = document.getElementById('custom-interest');
    const addInterestButton = document.getElementById('add-interest');
    const interestsContainer = document.getElementById('interests');

    /**
     * 添加自定義興趣標籤
     * @param {string} interest - 興趣名稱
     */
    function addCustomInterest(interest) {
        const tag = document.createElement('div');
        tag.className = 'tag custom-tag';
        tag.setAttribute('data-value', interest.toLowerCase());
        
        // 創建標籤文本
        const textSpan = document.createElement('span');
        textSpan.textContent = interest;
        tag.appendChild(textSpan);
        
        // 創建刪除按鈕
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        tag.appendChild(deleteBtn);
        
        // 設置點擊事件處理
        tag.addEventListener('click', function(e) {
            if (e.target.className === 'delete-btn') {
                this.remove();  // 點擊刪除按鈕時移除標籤
            } else {
                this.classList.toggle('active');  // 點擊標籤時切換狀態
            }
        });

        interestsContainer.appendChild(tag);
    }

    /**
     * 處理添加興趣的操作
     */
    function handleAddInterest() {
        // 分割並處理輸入的興趣
        const interests = customInterestInput.value
            .split(',')
            .map(interest => interest.trim())
            .filter(interest => interest !== '');

        interests.forEach(interest => {
            // 檢查是否已存在相同的興趣標籤
            const existingTags = Array.from(interestsContainer.querySelectorAll('.tag'))
                .map(tag => tag.textContent.toLowerCase());
            
            if (!existingTags.includes(interest.toLowerCase())) {
                addCustomInterest(interest);
            }
        });

        // 清空輸入框
        customInterestInput.value = '';
    }

    // 綁定添加按鈕點擊事件
    addInterestButton.addEventListener('click', handleAddInterest);

    // 綁定 Enter 鍵事件
    customInterestInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddInterest();
        }
    });
});

// 初始化自定義話題類型功能
document.addEventListener('DOMContentLoaded', () => {
    const customTopicInput = document.getElementById('custom-topic-type');
    const addTopicButton = document.getElementById('add-topic-type');
    const topicTagsContainer = document.getElementById('topic-tags');

    /**
     * 添加自定義話題類型標籤
     * @param {string} topicType - 話題類型名稱
     */
    function addCustomTopicType(topicType) {
        const tag = document.createElement('div');
        tag.className = 'tag custom-tag';
        tag.setAttribute('data-value', topicType.toLowerCase());
        
        // 創建標籤文本
        const textSpan = document.createElement('span');
        textSpan.textContent = topicType;
        tag.appendChild(textSpan);
        
        // 創建刪除按鈕
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        tag.appendChild(deleteBtn);
        
        // 設置點擊事件處理
        tag.addEventListener('click', function(e) {
            if (e.target.className === 'delete-btn') {
                this.remove();
            } else {
                this.classList.toggle('active');
            }
        });

        topicTagsContainer.appendChild(tag);
    }

    /**
     * 處理添加話題類型的操作
     */
    function handleAddTopicType() {
        const topicTypes = customTopicInput.value
            .split(',')
            .map(type => type.trim())
            .filter(type => type !== '');

        topicTypes.forEach(type => {
            // 檢查是否已存在相同的類型標籤
            const existingTags = Array.from(topicTagsContainer.querySelectorAll('.tag'))
                .map(tag => tag.textContent.toLowerCase());
            
            if (!existingTags.includes(type.toLowerCase())) {
                addCustomTopicType(type);
            }
        });

        // 清空輸入框
        customTopicInput.value = '';
    }

    // 綁定添加按鈕點擊��件
    addTopicButton.addEventListener('click', handleAddTopicType);

    // 綁定 Enter 鍵事件
    customTopicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTopicType();
        }
    });
});

// 儲存按鈕點擊處理
document.querySelector('.save-btn').addEventListener('click', async function() {
    // 動畫效果
    this.style.transform = 'scale(0.98)';
    setTimeout(() => {
        this.style.transform = 'translateY(-2px)';
    }, 100);

    const cardId = getUrlParameter('id') || '未指定 ID';

    // 收集表單資料
    const requestData = {
        method: 'POST',
        url: '/api/personal-card',
        data: {
            cardId: cardId,
            timestamp: new Date().toISOString(),
            profile: {
                nickname: document.getElementById('nickname').value,
                ageRange: document.getElementById('age-range').value,
                occupation: document.getElementById('occupation').value,
                interests: {
                    default: Array.from(document.querySelectorAll('#interests .tag.active'))
                        .map(tag => tag.dataset.value)
                        .filter(value => value),
                    custom: Array.from(document.querySelectorAll('#interests .custom-tag'))
                        .map(tag => tag.textContent.trim())
                },
                timeSlots: Array.from(document.querySelectorAll('.time-slot.active'))
                    .map(slot => slot.dataset.value),
                history: {
                    createdTopics: [],
                    joinedTopics: [],
                    currentActivities: []
                }
            }
        }
    };

    // 如果有填寫話題資訊，添加話題資料
    const topicTitle = document.getElementById('topic-title').value;
    if (topicTitle) {
        const topicData = {
            title: topicTitle,
            gmail: document.getElementById('topic-gmail').value,
            minAttendees: parseInt(document.getElementById('topic-min-attendees').value) || 0,
            types: {
                default: Array.from(document.querySelectorAll('#topic-tags .tag.active'))
                    .map(tag => tag.dataset.value)
                    .filter(value => value),
                custom: Array.from(document.querySelectorAll('#topic-tags .custom-tag'))
                    .map(tag => tag.textContent.trim())
            },
            description: document.getElementById('topic-description').value,
            status: {
                currentAttendees: [{
                    id: cardId,
                    nickname: document.getElementById('nickname').value
                }],
                attendeeCount: 1,
                host: {
                    id: cardId,
                    nickname: document.getElementById('nickname').value,
                    gmail: document.getElementById('topic-gmail').value
                },
                comments: [],
                registrationStatus: {
                    isOpen: true,
                    pendingRegistrations: []
                },
                hasReachedMinimum: false,  // 是否曾經達標
                isActive: false,           // 話題是否正在進行中
                endReason: null           // 結束原因
            }
        };

        // 發送話題資料到後端
        try {
            const topicResponse = await fetch('http://localhost:3000/api/topic-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: {
                        cardId: cardId,
                        topic: topicData
                    }
                })
            });

            if (!topicResponse.ok) {
                throw new Error('話題儲存失敗');
            }
        } catch (error) {
            console.error('儲存話題時發生錯誤:', error);
            alert('話題儲存失敗');
            return;
        }
    }

    // 發送個人資料到後端
    try {
        const response = await fetch('http://localhost:3000/api/personal-card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error('個人資料儲存失敗');
        }

        alert('資料儲存成功！');
    } catch (error) {
        console.error('儲存個人資料時發生錯誤:', error);
        alert('個人資料儲存失敗');
    }
});

// 在文件開頭添加初始化函數
async function initializePersonalData() {
    try {
        const cardId = getUrlParameter('id');
        if (!cardId) {
            console.log('未提供卡片 ID');
            return;
        }

        // 從後端獲取個人資料
        const response = await fetch(`http://localhost:3000/api/personal-card/${cardId}`);
        const result = await response.json();

        if (result.success && result.data) {
            // 填充個人資料
            document.getElementById('nickname').value = result.data.nickname || '';
            document.getElementById('age-range').value = result.data.ageRange || '';
            document.getElementById('occupation').value = result.data.occupation || '';

            // 設置興趣標籤
            if (result.data.interests) {
                // 處理預設興趣
                if (result.data.interests.default) {
                    result.data.interests.default.forEach(interest => {
                        const tag = document.querySelector(`#interests .tag[data-value="${interest}"]`);
                        if (tag) tag.classList.add('active');
                    });
                }

                // 處理自定義興趣
                if (result.data.interests.custom) {
                    result.data.interests.custom.forEach(interest => {
                        const customInterestInput = document.getElementById('custom-interest');
                        customInterestInput.value = interest;
                        document.getElementById('add-interest').click();
                        customInterestInput.value = '';
                    });
                }
            }

            // 設置時段選擇
            if (result.data.timeSlots) {
                result.data.timeSlots.forEach(slot => {
                    const timeSlot = document.querySelector(`.time-slot[data-value="${slot}"]`);
                    if (timeSlot) timeSlot.classList.add('active');
                });
            }

            console.log('個人資料載入完成');
        } else {
            console.log('這是新的卡片');
        }
    } catch (error) {
        console.error('初始化個人資料時發生錯誤:', error);
    }
} 