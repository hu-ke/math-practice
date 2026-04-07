// 星空背景动画
function createStars() {
    const starsBg = document.getElementById('stars-bg');
    if (!starsBg) return;
    const starCount = 150;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star' + (Math.random() > 0.9 ? ' big' : '');
        const size = Math.random() > 0.9 ? (3 + Math.random() * 3) : (1 + Math.random() * 2);
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.setProperty('--duration', (2 + Math.random() * 4) + 's');
        star.style.animationDelay = Math.random() * 5 + 's';
        starsBg.appendChild(star);
    }
}

createStars();

// 全局变量
let currentGrade = 0;
let gradeQuestions = {}; // 存储每个年级的题目
let gradeTimers = {}; // 存储每个年级的计时器
let gradeStartTimes = {}; // 存储每个年级的开始时间
let gradeElapsedTimes = {}; // 存储每个年级的已用时间
let gradeWrongQuestions = {}; // 存储每个年级的错题
let practiceHistory = []; // 存储练习历史

// 奖励系统数据
let userRewards = {
    stars: 0,
    trophies: 0,
    score: 0,
    achievements: {},
    badges: {}
};

// 成就系统定义
const achievements = [
    { id: 'first_practice', name: '初次尝试', icon: '🌟', desc: '完成第一次练习', condition: (history) => history.length >= 1 },
    { id: 'ten_practices', name: '坚持不懈', icon: '💪', desc: '完成10次练习', condition: (history) => history.length >= 10 },
    { id: 'fifty_practices', name: '练习达人', icon: '🏅', desc: '完成50次练习', condition: (history) => history.length >= 50 },
    { id: 'perfect_score', name: '完美表现', icon: '🎯', desc: '获得100分', condition: (history) => history.some(h => h.score === 100) },
    { id: 'speed_master', name: '速度之星', icon: '⚡', desc: '在60秒内完成练习', condition: (history) => history.some(h => h.timeUsed <= 60) },
    { id: 'all_grades', name: '全能选手', icon: '🎓', desc: '完成所有年级的练习', condition: (history) => {
        const grades = new Set(history.map(h => h.grade));
        return grades.size === 5;
    }},
    { id: 'grade_master', name: '年级专家', icon: '📚', desc: '在同一年级完成10次练习', condition: (history) => {
        const gradeCounts = {};
        history.forEach(h => {
            gradeCounts[h.grade] = (gradeCounts[h.grade] || 0) + 1;
        });
        return Object.values(gradeCounts).some(count => count >= 10);
    }},
    { id: 'high_score', name: '高分达人', icon: '🏆', desc: '获得90分以上10次', condition: (history) => {
        return history.filter(h => h.score >= 90).length >= 10;
    }}
];

// 徽章系统定义
const badges = [
    { id: 'grade1_master', name: '一年级大师', icon: '1️⃣', desc: '一年级练习10次', condition: (history) => history.filter(h => h.grade === 1).length >= 10 },
    { id: 'grade2_master', name: '二年级大师', icon: '2️⃣', desc: '二年级练习10次', condition: (history) => history.filter(h => h.grade === 2).length >= 10 },
    { id: 'grade3_master', name: '三年级大师', icon: '3️⃣', desc: '三年级练习10次', condition: (history) => history.filter(h => h.grade === 3).length >= 10 },
    { id: 'grade4_master', name: '四年级大师', icon: '4️⃣', desc: '四年级练习10次', condition: (history) => history.filter(h => h.grade === 4).length >= 10 },
    { id: 'grade5_master', name: '五年级大师', icon: '5️⃣', desc: '五年级练习10次', condition: (history) => history.filter(h => h.grade === 5).length >= 10 },
    { id: 'speed_demon', name: '速度恶魔', icon: '🚀', desc: '在30秒内完成练习', condition: (history) => history.some(h => h.timeUsed <= 30) },
    { id: 'accuracy_king', name: '精准之王', icon: '🎯', desc: '连续5次获得95分以上', condition: (history) => {
        let consecutive = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].score >= 95) {
                consecutive++;
                if (consecutive >= 5) return true;
            } else {
                consecutive = 0;
            }
        }
        return false;
    }},
    { id: 'dedication', name: '坚持不懈', icon: '🔥', desc: '连续7天练习', condition: (history) => {
        const dates = [...new Set(history.map(h => h.date.split(' ')[0]))];
        return dates.length >= 7;
    }}
];

// 页面加载完成后初始化
window.onload = function() {
    // 读取保存的数据
    loadData();
    // 为每个年级按钮添加事件监听
    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const grade = parseInt(this.getAttribute('data-grade'));
            startPractice(grade);
        });
    });
    
    // 为提交按钮添加事件监听
    document.getElementById('submit-btn').addEventListener('click', function() {
        if (currentGrade > 0) {
            submitAnswers(currentGrade);
        }
    });
    
    // 为重新开始按钮添加事件监听
    document.getElementById('reset-btn').addEventListener('click', function() {
        if (currentGrade > 0) {
            startPractice(currentGrade);
        }
    });
    
    // 为返回按钮添加事件监听
    document.getElementById('back-from-wrong').addEventListener('click', function() {
        document.getElementById('wrong-section').style.display = 'none';
        document.querySelector('.grade-section').style.display = 'block';
        document.getElementById('practice-section').style.display = 'block';
    });
    
    // 为练习历史返回按钮添加事件监听
    document.getElementById('back-from-history').addEventListener('click', function() {
        document.getElementById('history-section').style.display = 'none';
        document.querySelector('.grade-section').style.display = 'block';
        document.getElementById('practice-section').style.display = 'block';
    });
    
    // 为我的奖励返回按钮添加事件监听
    document.getElementById('back-from-rewards').addEventListener('click', function() {
        document.getElementById('rewards-section').style.display = 'none';
        document.querySelector('.grade-section').style.display = 'block';
        document.getElementById('practice-section').style.display = 'block';
    });
    
    // 为清除数据按钮添加事件监听
    document.getElementById('clear-data-btn').addEventListener('click', function() {
        if (confirm('确定要清除所有数据吗？这将删除所有练习历史、奖励和错题记录！')) {
            if (clearData()) {
                alert('数据已清除！');
                showRewards();
            } else {
                alert('清除数据失败！');
            }
        }
    });
    
    // 为导航标签添加事件监听
    document.querySelectorAll('.nav-item').forEach((item, index) => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            this.classList.add('active');
            
            if (index === 0) {
                document.querySelector('.grade-section').style.display = 'block';
                document.getElementById('practice-section').style.display = 'block';
                document.getElementById('battle-section').style.display = 'none';
                document.getElementById('wrong-section').style.display = 'none';
                document.getElementById('history-section').style.display = 'none';
                document.getElementById('rewards-section').style.display = 'none';
            } else if (index === 1) {
                document.querySelector('.grade-section').style.display = 'none';
                document.getElementById('practice-section').style.display = 'none';
                document.getElementById('battle-section').style.display = 'block';
                document.getElementById('wrong-section').style.display = 'none';
                document.getElementById('history-section').style.display = 'none';
                document.getElementById('rewards-section').style.display = 'none';
                resetBattleSetup();
            } else if (index === 2) {
                document.querySelector('.grade-section').style.display = 'none';
                document.getElementById('practice-section').style.display = 'none';
                document.getElementById('battle-section').style.display = 'none';
                document.getElementById('wrong-section').style.display = 'block';
                document.getElementById('history-section').style.display = 'none';
                document.getElementById('rewards-section').style.display = 'none';
                showWrongQuestions();
            } else if (index === 3) {
                document.querySelector('.grade-section').style.display = 'none';
                document.getElementById('practice-section').style.display = 'none';
                document.getElementById('battle-section').style.display = 'none';
                document.getElementById('wrong-section').style.display = 'none';
                document.getElementById('history-section').style.display = 'none';
                document.getElementById('rewards-section').style.display = 'block';
                showRewards();
            } else if (index === 4) {
                document.querySelector('.grade-section').style.display = 'none';
                document.getElementById('practice-section').style.display = 'none';
                document.getElementById('battle-section').style.display = 'none';
                document.getElementById('wrong-section').style.display = 'none';
                document.getElementById('history-section').style.display = 'block';
                document.getElementById('rewards-section').style.display = 'none';
                showPracticeHistory();
            }
        });
    });

    // 多人比赛模式事件
    initBattleMode();
};

// 开始练习
function startPractice(grade) {
    currentGrade = grade;
    
    // 生成题目
    if (!gradeQuestions[grade] || gradeQuestions[grade].length !== 50) {
        gradeQuestions[grade] = generateQuestions(grade, 50);
    }
    
    // 显示题目
    displayQuestions(grade);
    
    // 重置计时器
    resetTimer(grade);
    
    // 开始计时
    startTimer(grade);
    
    // 重置正确数
    document.getElementById('correct-count').textContent = '0';
    
    // 显示练习区域
    document.getElementById('practice-section').style.display = 'block';
}

// 生成题目
function generateQuestions(grade, count) {
    const questions = [];
    
    for (let i = 0; i < count; i++) {
        let question, answer;
        
        switch (grade) {
            case 1: // 一年级：10以内加减法
                if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 10) + 1;
                    const b = Math.floor(Math.random() * (10 - a + 1));
                    question = `${a} + ${b} =`;
                    answer = a + b;
                } else {
                    const a = Math.floor(Math.random() * 10) + 1;
                    const b = Math.floor(Math.random() * a) + 1;
                    question = `${a} - ${b} =`;
                    answer = a - b;
                }
                break;
                
            case 2: // 二年级：100以内加减法，简单乘法
                if (Math.random() > 0.7) {
                    const a = Math.floor(Math.random() * 9) + 1;
                    const b = Math.floor(Math.random() * 9) + 1;
                    question = `${a} × ${b} =`;
                    answer = a * b;
                } else if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    question = `${a} + ${b} =`;
                    answer = a + b;
                } else {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * a) + 1;
                    question = `${a} - ${b} =`;
                    answer = a - b;
                }
                break;
                
            case 3: // 三年级：多位数加减法，表内乘法，简单除法
                if (Math.random() > 0.6) {
                    const b = Math.floor(Math.random() * 9) + 1;
                    answer = Math.floor(Math.random() * 9) + 1;
                    const a = b * answer;
                    question = `${a} ÷ ${b} =`;
                } else if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 9) + 1;
                    question = `${a} × ${b} =`;
                    answer = a * b;
                } else if (Math.random() > 0.3) {
                    const a = Math.floor(Math.random() * 900) + 100;
                    const b = Math.floor(Math.random() * 900) + 100;
                    question = `${a} + ${b} =`;
                    answer = a + b;
                } else {
                    const a = Math.floor(Math.random() * 900) + 100;
                    const b = Math.floor(Math.random() * a) + 1;
                    question = `${a} - ${b} =`;
                    answer = a - b;
                }
                break;
                
            case 4: // 四年级：多位数乘除法，小数加减法
                if (Math.random() > 0.7) {
                    const a = (Math.random() * 10).toFixed(1);
                    const b = (Math.random() * 10).toFixed(1);
                    if (Math.random() > 0.5) {
                        question = `${a} + ${b} =`;
                        answer = parseFloat(a) + parseFloat(b);
                    } else {
                        const max = Math.max(parseFloat(a), parseFloat(b));
                        const min = Math.min(parseFloat(a), parseFloat(b));
                        question = `${max} - ${min} =`;
                        answer = max - min;
                    }
                } else if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    question = `${a} × ${b} =`;
                    answer = a * b;
                } else {
                    const b = Math.floor(Math.random() * 90) + 10;
                    answer = Math.floor(Math.random() * 9) + 1;
                    const a = b * answer;
                    question = `${a} ÷ ${b} =`;
                }
                break;
                
            case 5: // 五年级：小数乘除法，分数加减法
                if (Math.random() > 0.7) {
                    const denominator = Math.floor(Math.random() * 9) + 2;
                    const numerator1 = Math.floor(Math.random() * (denominator - 1)) + 1;
                    const numerator2 = Math.floor(Math.random() * (denominator - 1)) + 1;
                    if (Math.random() > 0.5) {
                        question = `${numerator1}/${denominator} + ${numerator2}/${denominator} =`;
                        answer = (numerator1 + numerator2) / denominator;
                    } else {
                        const max = Math.max(numerator1, numerator2);
                        const min = Math.min(numerator1, numerator2);
                        question = `${max}/${denominator} - ${min}/${denominator} =`;
                        answer = (max - min) / denominator;
                    }
                } else if (Math.random() > 0.5) {
                    const a = (Math.random() * 10).toFixed(1);
                    const b = (Math.random() * 10).toFixed(1);
                    question = `${a} × ${b} =`;
                    answer = parseFloat(a) * parseFloat(b);
                } else {
                    const b = (Math.random() * 9 + 1).toFixed(1);
                    answer = (Math.random() * 9 + 1);
                    const a = (parseFloat(b) * answer).toFixed(2);
                    question = `${a} ÷ ${b} =`;
                }
                break;
        }
        
        questions.push({ question, answer: parseFloat(answer.toFixed(2)) });
    }
    
    return questions;
}

// 显示题目
function displayQuestions(grade) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    gradeQuestions[grade].forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.innerHTML = `
            <span class="question-number">${index + 1}.</span>
            <span class="question-text">${q.question}</span>
            <input type="text" class="answer-input" data-grade="${grade}" data-index="${index}">
        `;
        container.appendChild(questionDiv);
    });
    
    // 为所有输入框添加键盘事件监听
    const inputs = document.querySelectorAll('.answer-input');
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                // 跳转到下一个输入框
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    // 如果是最后一个输入框，聚焦到提交按钮
                    document.getElementById('submit-btn').focus();
                }
            }
        });
    });
}

// 重置计时器
function resetTimer(grade) {
    stopTimer(grade);
    gradeElapsedTimes[grade] = 0;
    document.getElementById('time-used').textContent = '0';
}

// 开始计时
function startTimer(grade) {
    gradeStartTimes[grade] = Date.now();
    gradeTimers[grade] = setInterval(() => {
        gradeElapsedTimes[grade] = Math.floor((Date.now() - gradeStartTimes[grade]) / 1000);
        document.getElementById('time-used').textContent = gradeElapsedTimes[grade];
    }, 1000);
}

// 停止计时
function stopTimer(grade) {
    if (gradeTimers[grade]) {
        clearInterval(gradeTimers[grade]);
        gradeTimers[grade] = null;
    }
}

// 提交答案
function submitAnswers(grade) {
    // 停止计时
    stopTimer(grade);
    
    // 检查答案
    let correctCount = 0;
    const answerInputs = document.querySelectorAll('.answer-input');
    const totalQuestions = gradeQuestions[grade].length;
    
    // 初始化错题存储
    if (!gradeWrongQuestions[grade]) {
        gradeWrongQuestions[grade] = [];
    }
    
    answerInputs.forEach((input, index) => {
        const userAnswer = parseFloat(input.value);
        const correctAnswer = gradeQuestions[grade][index].answer;
        
        if (Math.abs(userAnswer - correctAnswer) < 0.01) {
            correctCount++;
            input.classList.add('correct');
            input.classList.remove('incorrect');
        } else {
            input.classList.add('incorrect');
            input.classList.remove('correct');
            
            // 记录错题
            const question = gradeQuestions[grade][index];
            gradeWrongQuestions[grade].push({
                ...question,
                userAnswer: userAnswer
            });
        }
    });
    
    // 更新正确数
    document.getElementById('correct-count').textContent = correctCount;
    
    // 记录练习历史
    const score = Math.round((correctCount / totalQuestions) * 100);
    const historyItem = {
        grade: grade,
        totalQuestions: totalQuestions,
        correctCount: correctCount,
        wrongCount: totalQuestions - correctCount,
        score: score,
        timeUsed: gradeElapsedTimes[grade],
        date: new Date().toLocaleString('zh-CN')
    };
    
    practiceHistory.unshift(historyItem); // 添加到历史记录开头
    
    // 限制历史记录数量为50条
    if (practiceHistory.length > 50) {
        practiceHistory = practiceHistory.slice(0, 50);
    }
    
    // 计算奖励
    calculateRewards(historyItem);
    
    // 保存数据
    saveData();
}

// 显示错题
function showWrongQuestions() {
    const container = document.getElementById('wrong-container');
    container.innerHTML = '';
    
    // 检查是否有错题
    let hasWrongQuestions = false;
    for (let grade in gradeWrongQuestions) {
        if (gradeWrongQuestions[grade].length > 0) {
            hasWrongQuestions = true;
            break;
        }
    }
    
    if (!hasWrongQuestions) {
        container.innerHTML = '<p style="text-align: center; color: #27ae60; font-size: 1.2em;">暂无错题记录</p>';
        return;
    }
    
    // 按年级显示错题
    for (let grade in gradeWrongQuestions) {
        const wrongQuestions = gradeWrongQuestions[grade];
        if (wrongQuestions.length > 0) {
            const gradeSection = document.createElement('div');
            gradeSection.className = 'grade-wrong-section';
            gradeSection.innerHTML = `<h3>${grade}年级错题</h3>`;
            
            wrongQuestions.forEach((q, index) => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question';
                questionDiv.innerHTML = `
                    <span class="question-number">${index + 1}.</span>
                    <span class="question-text">${q.question}</span>
                    <div class="wrong-answer-info">
                        <span class="user-answer">你的答案：${q.userAnswer}</span>
                        <span class="correct-answer">正确答案：${q.answer.toFixed(2)}</span>
                    </div>
                `;
                gradeSection.appendChild(questionDiv);
            });
            
            container.appendChild(gradeSection);
        }
    }
}

// 显示练习历史
function showPracticeHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = '';
    
    // 检查是否有练习历史
    if (practiceHistory.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #3498db; font-size: 1.2em;">暂无练习记录</p>';
        return;
    }
    
    // 显示练习历史
    practiceHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <h3>${item.grade}年级练习</h3>
            <p>总题数：${item.totalQuestions}</p>
            <p>正确数：${item.correctCount}</p>
            <p>错误数：${item.wrongCount}</p>
            <p>得分：<span class="history-score">${item.score}分</span></p>
            <p>用时：${item.timeUsed}秒</p>
            <p class="history-date">练习时间：${item.date}</p>
        `;
        container.appendChild(historyItem);
    });
}

// 计算奖励
function calculateRewards(historyItem) {
    // 计算星星：每答对一题得1颗星
    const starsEarned = historyItem.correctCount;
    userRewards.stars += starsEarned;
    
    // 计算奖杯：每得100分得1个奖杯
    if (historyItem.score === 100) {
        userRewards.trophies += 1;
    }
    
    // 计算积分：分数即为积分
    userRewards.score += historyItem.score;
    
    // 检查成就
    checkAchievements();
    
    // 检查徽章
    checkBadges();
}

// 检查成就
function checkAchievements() {
    achievements.forEach(achievement => {
        if (!userRewards.achievements[achievement.id]) {
            if (achievement.condition(practiceHistory)) {
                userRewards.achievements[achievement.id] = true;
                showAchievementNotification(achievement);
                saveData();
            }
        }
    });
}

// 检查徽章
function checkBadges() {
    badges.forEach(badge => {
        if (!userRewards.badges[badge.id]) {
            if (badge.condition(practiceHistory)) {
                userRewards.badges[badge.id] = true;
                showBadgeNotification(badge);
                saveData();
            }
        }
    });
}

// 显示成就通知
function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f39c12, #e67e22);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.5s ease-out;
    `;
    notification.innerHTML = `
        <div style="font-size: 2em; text-align: center; margin-bottom: 10px;">${achievement.icon}</div>
        <div style="font-weight: bold; font-size: 1.2em; text-align: center;">🎉 成就解锁！</div>
        <div style="text-align: center; margin-top: 5px;">${achievement.name}</div>
        <div style="text-align: center; font-size: 0.9em; opacity: 0.9;">${achievement.desc}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// 显示徽章通知
function showBadgeNotification(badge) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #9b59b6, #8e44ad);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.5s ease-out;
    `;
    notification.innerHTML = `
        <div style="font-size: 2em; text-align: center; margin-bottom: 10px;">${badge.icon}</div>
        <div style="font-weight: bold; font-size: 1.2em; text-align: center;">🎖️ 徽章获得！</div>
        <div style="text-align: center; margin-top: 5px;">${badge.name}</div>
        <div style="text-align: center; font-size: 0.9em; opacity: 0.9;">${badge.desc}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// 显示奖励界面
function showRewards() {
    updateRewardsDisplay();
    showAchievements();
    showBadges();
}

// 更新奖励显示
function updateRewardsDisplay() {
    document.getElementById('total-stars').textContent = userRewards.stars;
    document.getElementById('total-trophies').textContent = userRewards.trophies;
    document.getElementById('total-score').textContent = userRewards.score;
}

// 显示成就
function showAchievements() {
    const container = document.getElementById('achievements-container');
    container.innerHTML = '';
    
    achievements.forEach(achievement => {
        const isUnlocked = userRewards.achievements[achievement.id];
        const achievementDiv = document.createElement('div');
        achievementDiv.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
        achievementDiv.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.desc}</div>
            ${isUnlocked ? '<div class="achievement-progress">✓ 已解锁</div>' : '<div class="achievement-progress">🔒 未解锁</div>'}
        `;
        container.appendChild(achievementDiv);
    });
}

// 显示徽章
function showBadges() {
    const container = document.getElementById('badges-container');
    container.innerHTML = '';
    
    badges.forEach(badge => {
        const isUnlocked = userRewards.badges[badge.id];
        const badgeDiv = document.createElement('div');
        badgeDiv.className = `badge-item ${isUnlocked ? '' : 'locked'}`;
        badgeDiv.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-desc">${badge.desc}</div>
            ${isUnlocked ? '<div class="achievement-progress">✓ 已获得</div>' : '<div class="achievement-progress">🔒 未获得</div>'}
        `;
        container.appendChild(badgeDiv);
    });
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 数据保存和读取功能
const STORAGE_KEY = 'mathPracticeData';

// 保存数据到localStorage
function saveData() {
    const data = {
        practiceHistory: practiceHistory,
        userRewards: userRewards,
        gradeWrongQuestions: gradeWrongQuestions
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('保存数据失败:', error);
    }
}

// 从localStorage读取数据
function loadData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.practiceHistory) {
                practiceHistory = data.practiceHistory;
            }
            if (data.userRewards) {
                userRewards = data.userRewards;
            }
            if (data.gradeWrongQuestions) {
                gradeWrongQuestions = data.gradeWrongQuestions;
            }
            return true;
        }
    } catch (error) {
        console.error('读取数据失败:', error);
    }
    return false;
}

// 清除所有保存的数据
function clearData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        practiceHistory = [];
        userRewards = {
            stars: 0,
            trophies: 0,
            score: 0,
            achievements: {},
            badges: {}
        };
        gradeWrongQuestions = {};
        return true;
    } catch (error) {
        console.error('清除数据失败:', error);
        return false;
    }
}

// ==================== 多人比赛模式 ====================

const PLAYER_AVATARS = ['🚀', '⚡', '🌟', '🔥'];
const PLAYER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f'];

let battleState = {
    playerCount: 2,
    grade: 1,
    questionCount: 20,
    players: [],
    questions: [],
    currentPlayerIndex: 0,
    currentQuestionIndex: 0,
    timer: null,
    startTime: 0,
    elapsed: 0,
    isPlaying: false
};

function initBattleMode() {
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            battleState.playerCount = parseInt(this.dataset.count);
            updatePlayerNameInputs();
        });
    });

    document.querySelectorAll('.battle-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.battle-grade-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            battleState.grade = parseInt(this.dataset.grade);
        });
    });

    document.querySelectorAll('.qcount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.qcount-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            battleState.questionCount = parseInt(this.dataset.count);
        });
    });

    document.getElementById('battle-start-btn').addEventListener('click', startBattle);
    document.getElementById('battle-restart-btn').addEventListener('click', function() {
        resetBattleSetup();
    });
    document.getElementById('battle-back-btn').addEventListener('click', function() {
        resetBattleSetup();
    });

    document.getElementById('battle-answer-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitBattleAnswer();
        }
    });
}

function updatePlayerNameInputs() {
    const container = document.getElementById('player-names');
    container.innerHTML = '';
    for (let i = 0; i < battleState.playerCount; i++) {
        const div = document.createElement('div');
        div.className = 'player-name-input';
        div.innerHTML = `
            <span class="player-avatar" style="background: ${PLAYER_COLORS[i]};">${PLAYER_AVATARS[i]}</span>
            <input type="text" class="pname-input" placeholder="选手${i + 1}名字" value="选手${i + 1}">
        `;
        container.appendChild(div);
    }
}

function resetBattleSetup() {
    if (battleState.timer) {
        clearInterval(battleState.timer);
        battleState.timer = null;
    }
    battleState.isPlaying = false;
    document.getElementById('battle-setup').style.display = 'block';
    document.getElementById('battle-playing').style.display = 'none';
    document.getElementById('battle-result').style.display = 'none';
    updatePlayerNameInputs();
}

function startBattle() {
    const nameInputs = document.querySelectorAll('.pname-input');
    battleState.players = [];
    nameInputs.forEach((input, i) => {
        battleState.players.push({
            name: input.value.trim() || ('选手' + (i + 1)),
            avatar: PLAYER_AVATARS[i],
            color: PLAYER_COLORS[i],
            score: 0,
            correct: 0,
            wrong: 0,
            currentQuestion: 0,
            results: [],
            startTime: 0,
            endTime: 0,
            totalTime: 0
        });
    });

    battleState.questions = generateQuestions(battleState.grade, battleState.questionCount);
    battleState.currentPlayerIndex = 0;
    battleState.currentQuestionIndex = 0;
    battleState.isPlaying = true;
    battleState.startTime = Date.now();
    battleState.elapsed = 0;

    document.getElementById('battle-setup').style.display = 'none';
    document.getElementById('battle-playing').style.display = 'block';
    document.getElementById('battle-result').style.display = 'none';

    battleState.timer = setInterval(() => {
        battleState.elapsed = Math.floor((Date.now() - battleState.startTime) / 1000);
        document.getElementById('battle-timer').textContent = '⏱️ ' + battleState.elapsed + '秒';
    }, 1000);

    showBattleTurn();
}

function showBattleTurn() {
    const player = battleState.players[battleState.currentPlayerIndex];
    const qIndex = player.currentQuestion;

    updateBattlePlayersStatus();
    updateBattleCurrentPlayer(player);
    updateBattleQuestion(player, qIndex);
    updateBattleProgress(player);

    document.getElementById('battle-feedback').textContent = '';
    document.getElementById('battle-feedback').className = 'battle-feedback';

    const input = document.getElementById('battle-answer-input');
    input.value = '';
    input.focus();
}

function updateBattlePlayersStatus() {
    const container = document.getElementById('battle-players-status');
    container.innerHTML = '';
    battleState.players.forEach((player, i) => {
        const div = document.createElement('div');
        div.className = 'battle-player-status' + (i === battleState.currentPlayerIndex ? ' current' : '');
        div.innerHTML = `
            <div class="bps-name" style="color: ${player.color};">${player.avatar} ${player.name}</div>
            <div class="bps-score">${player.score}</div>
            <div class="bps-progress">${player.currentQuestion}/${battleState.questionCount}</div>
        `;
        container.appendChild(div);
    });
}

function updateBattleCurrentPlayer(player) {
    const container = document.getElementById('battle-current-player');
    container.innerHTML = `
        <div class="bcp-label">当前答题</div>
        <div class="bcp-name" style="color: ${player.color};">${player.avatar} ${player.name}</div>
    `;
}

function updateBattleQuestion(player, qIndex) {
    if (qIndex >= battleState.questions.length) {
        return;
    }
    const question = battleState.questions[qIndex];
    document.getElementById('battle-question-display').textContent = question.question;
}

function updateBattleProgress(player) {
    const container = document.getElementById('battle-progress');
    container.innerHTML = '';
    for (let i = 0; i < battleState.questionCount; i++) {
        const dot = document.createElement('div');
        dot.className = 'battle-progress-dot';
        if (i < player.results.length) {
            dot.classList.add(player.results[i] ? 'correct' : 'wrong');
        } else if (i === player.currentQuestion) {
            dot.classList.add('current');
        }
        container.appendChild(dot);
    }
}

function submitBattleAnswer() {
    if (!battleState.isPlaying) return;

    const input = document.getElementById('battle-answer-input');
    const userAnswer = parseFloat(input.value);
    const player = battleState.players[battleState.currentPlayerIndex];
    const qIndex = player.currentQuestion;

    if (isNaN(userAnswer)) return;

    const correctAnswer = battleState.questions[qIndex].answer;
    const isCorrect = Math.abs(userAnswer - correctAnswer) < 0.01;

    player.results.push(isCorrect);

    if (isCorrect) {
        player.score += 10;
        player.correct++;
        showBattleFeedback(true, '✅ 回答正确！');
    } else {
        player.wrong++;
        showBattleFeedback(false, '❌ 答错了！正确答案是 ' + correctAnswer);
    }

    player.currentQuestion++;

    if (player.currentQuestion >= battleState.questionCount) {
        player.endTime = Date.now();
        player.totalTime = Math.floor((player.endTime - battleState.startTime) / 1000);
    }

    setTimeout(() => {
        advanceBattle();
    }, 800);
}

function showBattleFeedback(isCorrect, message) {
    const feedback = document.getElementById('battle-feedback');
    feedback.textContent = message;
    feedback.className = 'battle-feedback ' + (isCorrect ? 'correct' : 'wrong');
}

function advanceBattle() {
    let allDone = battleState.players.every(p => p.currentQuestion >= battleState.questionCount);

    if (allDone) {
        endBattle();
        return;
    }

    battleState.currentPlayerIndex = (battleState.currentPlayerIndex + 1) % battleState.players.length;

    while (battleState.players[battleState.currentPlayerIndex].currentQuestion >= battleState.questionCount) {
        battleState.currentPlayerIndex = (battleState.currentPlayerIndex + 1) % battleState.players.length;
    }

    showBattleTurn();
}

function endBattle() {
    battleState.isPlaying = false;
    if (battleState.timer) {
        clearInterval(battleState.timer);
        battleState.timer = null;
    }

    const sorted = [...battleState.players].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correct !== a.correct) return b.correct - a.correct;
        return a.totalTime - b.totalTime;
    });

    showBattleResult(sorted);
}

function showBattleResult(sorted) {
    document.getElementById('battle-playing').style.display = 'none';
    document.getElementById('battle-result').style.display = 'block';

    const podium = document.getElementById('result-podium');
    podium.innerHTML = '';

    const rankClasses = ['first', 'second', 'third'];
    const rankEmojis = ['🥇', '🥈', '🥉'];

    sorted.forEach((player, i) => {
        const div = document.createElement('div');
        div.className = 'podium-item ' + (i < 3 ? rankClasses[i] : 'other');
        div.innerHTML = `
            <div class="podium-rank">${i < 3 ? rankEmojis[i] : (i + 1)}</div>
            <div class="podium-name" style="color: ${player.color};">${player.avatar} ${player.name}</div>
            <div class="podium-score">${player.score}分</div>
            <div class="podium-detail">正确${player.correct}题 | 用时${player.totalTime}秒</div>
        `;
        podium.appendChild(div);
    });

    const details = document.getElementById('result-details');
    details.innerHTML = '<h3 style="color: #00bfff; margin-bottom: 15px; text-align: center;">详细成绩</h3>';

    sorted.forEach((player, i) => {
        const accuracy = battleState.questionCount > 0 ? Math.round((player.correct / battleState.questionCount) * 100) : 0;
        const row = document.createElement('div');
        row.className = 'result-detail-row';
        row.innerHTML = `
            <div class="result-detail-name">
                <span style="font-size: 1.3em;">${player.avatar}</span>
                <span>${player.name}</span>
            </div>
            <div class="result-detail-stats">
                <span>📝 ${player.correct}/${battleState.questionCount}</span>
                <span>🎯 ${accuracy}%</span>
                <span>⏱️ ${player.totalTime}秒</span>
                <span>⭐ ${player.score}分</span>
            </div>
        `;
        details.appendChild(row);
    });

    const winner = sorted[0];
    const winnerNotification = document.createElement('div');
    winnerNotification.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 165, 0, 0.95));
        color: #1a0533; padding: 40px 60px; border-radius: 20px;
        box-shadow: 0 0 60px rgba(255, 215, 0, 0.5); z-index: 10000;
        text-align: center; animation: popIn 0.5s ease-out;
    `;
    winnerNotification.innerHTML = `
        <div style="font-size: 4em; margin-bottom: 10px;">🏆</div>
        <div style="font-size: 1.5em; font-weight: bold;">恭喜 ${winner.avatar} ${winner.name} 获得冠军！</div>
        <div style="font-size: 1.2em; margin-top: 10px;">${winner.score}分 | 正确率${Math.round((winner.correct / battleState.questionCount) * 100)}%</div>
    `;
    document.body.appendChild(winnerNotification);

    const popStyle = document.createElement('style');
    popStyle.textContent = `
        @keyframes popIn { from { transform: translate(-50%, -50%) scale(0.3); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    `;
    document.head.appendChild(popStyle);

    setTimeout(() => {
        winnerNotification.style.transition = 'opacity 0.5s';
        winnerNotification.style.opacity = '0';
        setTimeout(() => {
            winnerNotification.remove();
            popStyle.remove();
        }, 500);
    }, 3000);
}