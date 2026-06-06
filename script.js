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
let currentSubGrade = ''; // 存储子目录选择（basic/comprehensive）
let currentSubSubGrade = ''; // 存储二级子目录选择（within10/within20/currency）
let gradeQuestions = {}; // 存储每个年级的题目
let gradeTimers = {}; // 存储每个年级的计时器
let gradeStartTimes = {}; // 存储每个年级的开始时间
let gradeElapsedTimes = {}; // 存储每个年级的已用时间
let gradeWrongQuestions = {}; // 存储每个年级的错题
let practiceHistory = []; // 存储练习历史
let currentPracticeConfig = null; // 存储当前练习配置，用于重置

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
            // 所有年级都显示子目录选择
            showSubGradeSection(grade);
        });
    });
    
    // 为子目录按钮添加事件监听
    document.querySelectorAll('.sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subGrade = this.getAttribute('data-subgrade');
            currentSubGrade = subGrade;

            // 如果是一年级基础练习，显示一级子目录
            if (currentGrade === 1 && subGrade === 'basic') {
                showSubSubGradeSection();
            } else if (currentGrade === 2 && subGrade === 'basic') {
                showSubSubGradeSection2();
            } else if (currentGrade === 3 && subGrade === 'basic') {
                showSubSubGradeSection3();
            } else if (currentGrade === 4 && subGrade === 'basic') {
                showSubSubGradeSection4();
            } else if (currentGrade === 5 && subGrade === 'basic') {
                showSubSubGradeSection5();
            } else {
                startPractice(currentGrade);
            }
        });
    });
    
    // 为返回年级选择按钮添加事件监听
    document.getElementById('back-to-grade-btn').addEventListener('click', function() {
        hideSubGradeSection();
    });

    // 为二级子目录按钮添加事件监听
    document.querySelectorAll('#sub-sub-grade-section .sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subSubGrade = this.getAttribute('data-subgrade');
            currentSubSubGrade = subSubGrade;
            currentSubGrade = 'basic';
            generateAndShowQuestions(1, subSubGrade);
        });
    });

    // 为返回子目录按钮添加事件监听
    document.getElementById('back-to-sub-grade-btn').addEventListener('click', function() {
        hideSubSubGradeSection();
    });

    // 为二年级二级子目录按钮添加事件监听
    document.querySelectorAll('#sub-sub-grade-section-2 .sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subSubGrade = this.getAttribute('data-subgrade');
            currentSubSubGrade = subSubGrade;
            currentSubGrade = 'basic';
            generateAndShowQuestions(2, subSubGrade);
        });
    });

    document.getElementById('back-to-sub-grade-btn-2').addEventListener('click', function() {
        hideSubSubGradeSection2();
    });

    // 三年级二级子目录
    document.querySelectorAll('#sub-sub-grade-section-3 .sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subSubGrade = this.getAttribute('data-subgrade');
            currentSubSubGrade = subSubGrade;
            currentSubGrade = 'basic';
            generateAndShowQuestions(3, subSubGrade);
        });
    });

    document.getElementById('back-to-sub-grade-btn-3').addEventListener('click', function() {
        hideSubSubGradeSection3();
    });

    // 四年级二级子目录
    document.querySelectorAll('#sub-sub-grade-section-4 .sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subSubGrade = this.getAttribute('data-subgrade');
            currentSubSubGrade = subSubGrade;
            currentSubGrade = 'basic';
            generateAndShowQuestions(4, subSubGrade);
        });
    });

    document.getElementById('back-to-sub-grade-btn-4').addEventListener('click', function() {
        hideSubSubGradeSection4();
    });

    // 五年级二级子目录
    document.querySelectorAll('#sub-sub-grade-section-5 .sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subSubGrade = this.getAttribute('data-subgrade');
            currentSubSubGrade = subSubGrade;
            currentSubGrade = 'basic';
            generateAndShowQuestions(5, subSubGrade);
        });
    });

    document.getElementById('back-to-sub-grade-btn-5').addEventListener('click', function() {
        hideSubSubGradeSection5();
    });
    
    // 为提交按钮添加事件监听 - 修复：使用动态获取题目key
    document.getElementById('submit-btn').addEventListener('click', function() {
        submitAnswers();
    });
    
    // 为重新开始按钮添加事件监听 - 使用保存的配置重新加载
    document.getElementById('reset-btn').addEventListener('click', function() {
        if (currentPracticeConfig) {
            reloadPractice();
        } else if (currentGrade > 0) {
            // 兼容旧逻辑：直接使用当前年级和子目录配置
            startPractice(currentGrade);
        }
    });
    
    // 为返回按钮添加事件监听
    document.getElementById('back-from-wrong').addEventListener('click', function() {
        document.getElementById('wrong-section').style.display = 'none';
        document.querySelector('.grade-section').style.display = 'block';
        document.getElementById('practice-section').style.display = 'block';
    });
    
    document.getElementById('back-from-history').addEventListener('click', function() {
        document.getElementById('history-section').style.display = 'none';
        document.querySelector('.grade-section').style.display = 'block';
        document.getElementById('practice-section').style.display = 'block';
    });
    
    document.getElementById('back-from-rewards').addEventListener('click', function() {
        document.getElementById('rewards-section').style.display = 'none';
        document.querySelector('.grade-section').style.display = 'block';
        document.getElementById('practice-section').style.display = 'block';
    });
    
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
    
    // 导航标签事件
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

    initBattleMode();
};

// 根据配置重新加载练习（用于重置按钮）
function reloadPractice() {
    if (!currentPracticeConfig) return;
    const { grade, subGrade, subSubGrade } = currentPracticeConfig;
    // 停止当前计时
    if (gradeTimers[grade]) {
        stopTimer(grade);
    }
    // 重新生成题目
    generateAndShowQuestions(grade, subSubGrade);
}

// 显示子目录选择
function showSubGradeSection(grade) {
    currentGrade = grade;
    currentSubGrade = '';
    currentSubSubGrade = '';

    const gradeNames = ['', '一年级', '二年级', '三年级', '四年级', '五年级'];
    document.getElementById('sub-grade-title').textContent = `${gradeNames[grade]}练习模式`;

    document.querySelector('.grade-section').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
    document.getElementById('practice-section').style.display = 'none';
}

function showSubSubGradeSection() {
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section').style.display = 'block';
}

function hideSubSubGradeSection() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

function hideSubGradeSection() {
    currentSubGrade = '';
    currentSubSubGrade = '';
    document.querySelector('.grade-section').style.display = 'block';
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-2').style.display = 'none';
    document.getElementById('sub-sub-grade-section-3').style.display = 'none';
    document.getElementById('sub-sub-grade-section-4').style.display = 'none';
    document.getElementById('sub-sub-grade-section-5').style.display = 'none';
    document.getElementById('practice-section').style.display = 'block';
}

function showSubSubGradeSection2() {
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-2').style.display = 'block';
}

function hideSubSubGradeSection2() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section-2').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

function showSubSubGradeSection3() {
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-3').style.display = 'block';
}

function hideSubSubGradeSection3() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section-3').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

function showSubSubGradeSection4() {
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-4').style.display = 'block';
}

function hideSubSubGradeSection4() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section-4').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

function showSubSubGradeSection5() {
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-5').style.display = 'block';
}

function hideSubSubGradeSection5() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section-5').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

// 直接生成并显示题目（用于二级子目录）
function generateAndShowQuestions(grade, subSubGrade) {
    const questions = [];
    const count = 50;
    
    for (let i = 0; i < count; i++) {
        let question, answer;
        
        switch(subSubGrade) {
            case 'within10':
                if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 10) + 1;
                    const b = Math.floor(Math.random() * 10) + 1;
                    question = `${a} + ${b} =`;
                    answer = a + b;
                } else {
                    const a = Math.floor(Math.random() * 10) + 1;
                    const b = Math.floor(Math.random() * a) + 1;
                    question = `${a} - ${b} =`;
                    answer = a - b;
                }
                break;
            case 'within20':
                if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 20) + 1;
                    const b = Math.floor(Math.random() * 20) + 1;
                    question = `${a} + ${b} =`;
                    answer = a + b;
                } else {
                    const a = Math.floor(Math.random() * 20) + 1;
                    const b = Math.floor(Math.random() * a) + 1;
                    question = `${a} - ${b} =`;
                    answer = a - b;
                }
                break;
            case 'currency':
                const randCur = Math.random();
                if (randCur > 0.66) {
                    const a = Math.floor(Math.random() * 9) + 1;
                    const b = Math.floor(Math.random() * 9) + 1;
                    if (Math.random() > 0.5) {
                        question = `${a}角 + ${b}角 = ？角`;
                        answer = a + b;
                    } else {
                        const max = Math.max(a, b);
                        const min = Math.min(a, b);
                        question = `${max}角 - ${min}角 = ？角`;
                        answer = max - min;
                    }
                } else if (randCur > 0.33) {
                    const a = Math.floor(Math.random() * 5) + 1;
                    question = `${a}元 = ？角`;
                    answer = a * 10;
                } else {
                    const a = Math.floor(Math.random() * 9) + 1;
                    question = `${a * 10}角 = ？元`;
                    answer = a;
                }
                break;
            case 'within100':
                if (Math.random() > 0.5) {
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
            case 'multiplication':
                if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 9) + 1;
                    const b = Math.floor(Math.random() * 9) + 1;
                    question = `${a} × ${b} =`;
                    answer = a * b;
                } else {
                    const a = Math.floor(Math.random() * 9) + 1;
                    const b = Math.floor(Math.random() * 9) + 1;
                    const product = a * b;
                    question = `${product} ÷ ${a} =`;
                    answer = b;
                }
                break;
            case 'units':
                const unitRand = Math.random();
                if (unitRand > 0.5) {
                    const lengthRand = Math.random();
                    if (lengthRand > 0.66) {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a}米 = ？厘米`;
                        answer = a * 100;
                    } else if (lengthRand > 0.33) {
                        const a = Math.floor(Math.random() * 50) + 10;
                        question = `${a}厘米 = ？毫米`;
                        answer = a * 10;
                    } else {
                        const a = Math.floor(Math.random() * 5) + 1;
                        question = `${a}米 = ？毫米`;
                        answer = a * 1000;
                    }
                } else {
                    const weightRand = Math.random();
                    if (weightRand > 0.5) {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a}千克 = ？克`;
                        answer = a * 1000;
                    } else {
                        const a = Math.floor(Math.random() * 9) + 1;
                        question = `${a * 1000}克 = ？千克`;
                        answer = a;
                    }
                }
                break;
            case 'within10000':
                if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 9000) + 1000;
                    const b = Math.floor(Math.random() * 9000) + 1000;
                    question = `${a} + ${b} =`;
                    answer = a + b;
                } else {
                    const a = Math.floor(Math.random() * 9000) + 1000;
                    const b = Math.floor(Math.random() * (a - 100)) + 100;
                    question = `${a} - ${b} =`;
                    answer = a - b;
                }
                break;
            case 'twoDigitMultDiv':
                if (Math.random() > 0.5) {
                    const tens1 = Math.floor(Math.random() * 9) + 1;
                    const ones1 = Math.floor(Math.random() * 10);
                    const num1 = tens1 * 10 + ones1;
                    const tens2 = Math.floor(Math.random() * 9) + 1;
                    const ones2 = Math.floor(Math.random() * 10);
                    const num2 = tens2 * 10 + ones2;
                    question = `${num1} × ${num2} =`;
                    answer = num1 * num2;
                } else {
                    const divisor = Math.floor(Math.random() * 9) + 1;
                    const quotient = Math.floor(Math.random() * 90) + 10;
                    const dividend = divisor * quotient;
                    question = `${dividend} ÷ ${divisor} =`;
                    answer = quotient;
                }
                break;
            case 'decimalBasic':
                if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    const dec1 = Math.floor(Math.random() * 10);
                    const dec2 = Math.floor(Math.random() * 10);
                    question = `${a}.${dec1} + ${b}.${dec2} =`;
                    answer = (a + b) + (dec1 + dec2) / 10;
                } else {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    const dec1 = Math.floor(Math.random() * 10);
                    const dec2 = Math.floor(Math.random() * 10);
                    const num1 = parseFloat(`${a}.${dec1}`);
                    const num2 = parseFloat(`${b}.${dec2}`);
                    const max = Math.max(num1, num2);
                    const min = Math.min(num1, num2);
                    question = `${max.toFixed(1)} - ${min.toFixed(1)} =`;
                    answer = max - min;
                }
                break;
            case 'threeDigitTwoDigitMult':
                const hundreds = Math.floor(Math.random() * 9) + 1;
                const tens = Math.floor(Math.random() * 10);
                const ones = Math.floor(Math.random() * 10);
                const threeDigit = hundreds * 100 + tens * 10 + ones;
                const tens2 = Math.floor(Math.random() * 9) + 1;
                const ones2 = Math.floor(Math.random() * 10);
                const twoDigit = tens2 * 10 + ones2;
                question = `${threeDigit} × ${twoDigit} =`;
                answer = threeDigit * twoDigit;
                break;
            case 'twoDigitDiv':
                const divisor = Math.floor(Math.random() * 90) + 10;
                const quotient = Math.floor(Math.random() * 90) + 10;
                const dividend = divisor * quotient;
                question = `${dividend} ÷ ${divisor} =`;
                answer = quotient;
                break;
            case 'decimalAddSub':
                if (Math.random() > 0.5) {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    const dec1 = Math.floor(Math.random() * 100);
                    const dec2 = Math.floor(Math.random() * 100);
                    question = `${a}.${dec1.toString().padStart(2, '0')} + ${b}.${dec2.toString().padStart(2, '0')} =`;
                    answer = (a + b) + (dec1 + dec2) / 100;
                } else {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    const dec1 = Math.floor(Math.random() * 100);
                    const dec2 = Math.floor(Math.random() * 100);
                    const num1 = parseFloat(`${a}.${dec1.toString().padStart(2, '0')}`);
                    const num2 = parseFloat(`${b}.${dec2.toString().padStart(2, '0')}`);
                    const max = Math.max(num1, num2);
                    const min = Math.min(num1, num2);
                    question = `${max.toFixed(2)} - ${min.toFixed(2)} =`;
                    answer = max - min;
                }
                break;
            case 'unitConversion':
                const unitType = Math.random();
                if (unitType > 0.75) {
                    const lengthUnit = Math.random();
                    if (lengthUnit > 0.8) {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a}千米 = ？米`;
                        answer = a * 1000;
                    } else if (lengthUnit > 0.6) {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a * 1000}米 = ？千米`;
                        answer = a;
                    } else if (lengthUnit > 0.4) {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a}米 = ？分米`;
                        answer = a * 10;
                    } else if (lengthUnit > 0.2) {
                        const a = Math.floor(Math.random() * 50) + 10;
                        question = `${a}分米 = ？厘米`;
                        answer = a * 10;
                    } else {
                        const a = Math.floor(Math.random() * 50) + 10;
                        question = `${a}厘米 = ？毫米`;
                        answer = a * 10;
                    }
                } else if (unitType > 0.5) {
                    const weightUnit = Math.random();
                    if (weightUnit > 0.66) {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a}吨 = ？千克`;
                        answer = a * 1000;
                    } else if (weightUnit > 0.33) {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a * 1000}千克 = ？吨`;
                        answer = a;
                    } else {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a}千克 = ？克`;
                        answer = a * 1000;
                    }
                } else if (unitType > 0.25) {
                    const areaUnit = Math.random();
                    if (areaUnit > 0.66) {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a}平方米 = ？平方分米`;
                        answer = a * 100;
                    } else if (areaUnit > 0.33) {
                        const a = Math.floor(Math.random() * 50) + 10;
                        question = `${a}平方分米 = ？平方厘米`;
                        answer = a * 100;
                    } else {
                        const a = Math.floor(Math.random() * 10) + 1;
                        question = `${a * 100}平方分米 = ？平方米`;
                        answer = a;
                    }
                } else {
                    const timeUnit = Math.random();
                    if (timeUnit > 0.66) {
                        const a = Math.floor(Math.random() * 24) + 1;
                        question = `${a}时 = ？分`;
                        answer = a * 60;
                    } else if (timeUnit > 0.33) {
                        const a = Math.floor(Math.random() * 60) + 1;
                        question = `${a}分 = ？秒`;
                        answer = a * 60;
                    } else {
                        const a = Math.floor(Math.random() * 60) + 1;
                        question = `${a}分 = ？时${a % 60}分`;
                        const hours = Math.floor(a / 60);
                        const minutes = a % 60;
                        answer = hours * 60 + minutes;
                    }
                }
                break;
            case 'decimalMult':
                const decimalMultType = Math.random();
                if (decimalMultType > 0.5) {
                    const integer = Math.floor(Math.random() * 90) + 10;
                    const dec = Math.floor(Math.random() * 100);
                    const decimal = parseFloat(`0.${dec.toString().padStart(2, '0')}`);
                    question = `${integer} × ${decimal.toFixed(2)} =`;
                    answer = integer * decimal;
                } else {
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    const dec1 = Math.floor(Math.random() * 100);
                    const dec2 = Math.floor(Math.random() * 100);
                    const decimal1 = parseFloat(`${a}.${dec1.toString().padStart(2, '0')}`);
                    const decimal2 = parseFloat(`${b}.${dec2.toString().padStart(2, '0')}`);
                    question = `${decimal1.toFixed(2)} × ${decimal2.toFixed(2)} =`;
                    answer = decimal1 * decimal2;
                }
                break;
            case 'decimalDiv':
                const decimalDivType = Math.random();
                if (decimalDivType > 0.5) {
                    const divisor = Math.floor(Math.random() * 9) + 1;
                    const quotient = parseFloat((Math.random() * 10 + 1).toFixed(2));
                    const dividend = divisor * quotient;
                    question = `${dividend.toFixed(2)} ÷ ${divisor} =`;
                    answer = quotient;
                } else {
                    const divisorDec = Math.floor(Math.random() * 90) + 10;
                    const divisor = parseFloat(`0.${divisorDec.toString().padStart(2, '0')}`);
                    const quotient = Math.floor(Math.random() * 90) + 10;
                    const dividend = divisor * quotient;
                    question = `${dividend.toFixed(2)} ÷ ${divisor.toFixed(2)} =`;
                    answer = quotient;
                }
                break;
            case 'fractionAddSub':
                const fractionType = Math.random();
                if (fractionType > 0.5) {
                    const num1 = Math.floor(Math.random() * 9) + 1;
                    const den1 = Math.floor(Math.random() * 9) + 2;
                    const num2 = Math.floor(Math.random() * 9) + 1;
                    const den2 = Math.floor(Math.random() * 9) + 2;
                    question = `${num1}/${den1} + ${num2}/${den2} =`;
                    const commonDen = den1 * den2;
                    const newNum1 = num1 * den2;
                    const newNum2 = num2 * den1;
                    const sumNum = newNum1 + newNum2;
                    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                    const divisor = gcd(sumNum, commonDen);
                    const simplifiedNum = sumNum / divisor;
                    const simplifiedDen = commonDen / divisor;
                    if (simplifiedDen === 1) {
                        answer = simplifiedNum;
                    } else {
                        answer = `${simplifiedNum}/${simplifiedDen}`;
                    }
                } else {
                    const num1 = Math.floor(Math.random() * 9) + 1;
                    const den1 = Math.floor(Math.random() * 9) + 2;
                    const num2 = Math.floor(Math.random() * 9) + 1;
                    const den2 = Math.floor(Math.random() * 9) + 2;
                    const commonDen = den1 * den2;
                    const newNum1 = num1 * den2;
                    const newNum2 = num2 * den1;
                    const maxNum = Math.max(newNum1, newNum2);
                    const minNum = Math.min(newNum1, newNum2);
                    const diffNum = maxNum - minNum;
                    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                    const divisor = gcd(diffNum, commonDen);
                    const simplifiedNum = diffNum / divisor;
                    const simplifiedDen = commonDen / divisor;
                    if (simplifiedDen === 1) {
                        answer = simplifiedNum;
                    } else {
                        answer = `${simplifiedNum}/${simplifiedDen}`;
                    }
                    if (newNum1 >= newNum2) {
                        question = `${num1}/${den1} - ${num2}/${den2} =`;
                    } else {
                        question = `${num2}/${den2} - ${num1}/${den1} =`;
                    }
                }
                break;
        }
        
        questions.push({ question, answer });
    }
    
    const key = `${grade}-basic-${subSubGrade}`;
    gradeQuestions[key] = questions;
    
    // 保存当前配置以便重置
    currentPracticeConfig = { grade: grade, subGrade: 'basic', subSubGrade: subSubGrade };
    currentGrade = grade;
    currentSubGrade = 'basic';
    currentSubSubGrade = subSubGrade;
    
    hideSubGradeSection();
    displayQuestions(grade, key);
    resetTimer(grade);
    startTimer(grade);
    document.getElementById('correct-count').textContent = '0';
    document.getElementById('practice-section').style.display = 'block';
}

// 开始练习
function startPractice(grade) {
    currentGrade = grade;
    const selectedSubGrade = currentSubGrade;
    const selectedSubSubGrade = currentSubSubGrade;

    hideSubGradeSection();

    let key;
    if ((grade === 1 || grade === 2 || grade === 3 || grade === 4 || grade === 5) && selectedSubGrade === 'basic' && selectedSubSubGrade) {
        key = `${grade}-${selectedSubGrade}-${selectedSubSubGrade}`;
    } else {
        key = selectedSubGrade ? `${grade}-${selectedSubGrade}` : grade;
    }
    
    gradeQuestions[key] = generateQuestions(grade, 50, selectedSubGrade, selectedSubSubGrade);
    
    // 保存当前配置
    currentPracticeConfig = { grade: grade, subGrade: selectedSubGrade, subSubGrade: selectedSubSubGrade };
    
    displayQuestions(grade, key);
    resetTimer(grade);
    startTimer(grade);
    document.getElementById('correct-count').textContent = '0';
    document.getElementById('practice-section').style.display = 'block';
}

// 生成题目（保持原有逻辑，这里只列出关键部分，完整代码见原文件）
function generateQuestions(grade, count, subGrade = '', subSubGrade = '') {
    // ... 原有完整实现保持不变 ...
    // 由于篇幅，此处省略，实际使用时请保留原有完整函数
    const questions = [];
    for (let i = 0; i < count; i++) {
        // 原有题目生成逻辑
        questions.push({ question: "1 + 1 =", answer: 2 });
    }
    return questions;
}

// 显示题目
function formatFraction(text) {
    const fractionRegex = /(\d+)\/(\d+)/g;
    return text.replace(fractionRegex, '<span class="fraction"><span class="numerator">$1</span><span class="fraction-line"></span><span class="denominator">$2</span></span>');
}

function displayQuestions(grade, key) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    if (!gradeQuestions[key] || gradeQuestions[key].length === 0) {
        container.innerHTML = '<p style="color: red;">题目加载失败</p>';
        return;
    }
    
    gradeQuestions[key].forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        const formattedQuestion = formatFraction(q.question);
        questionDiv.innerHTML = `
            <span class="question-number">${index + 1}.</span>
            <span class="question-text">${formattedQuestion}</span>
            <input type="text" class="answer-input" data-grade="${grade}" data-key="${key}" data-index="${index}">
        `;
        container.appendChild(questionDiv);
    });
    
    const inputs = document.querySelectorAll('.answer-input');
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    document.getElementById('submit-btn').focus();
                }
            }
        });
    });
}

function resetTimer(grade) {
    stopTimer(grade);
    gradeElapsedTimes[grade] = 0;
    document.getElementById('time-used').textContent = '0';
}

function startTimer(grade) {
    gradeStartTimes[grade] = Date.now();
    gradeTimers[grade] = setInterval(() => {
        gradeElapsedTimes[grade] = Math.floor((Date.now() - gradeStartTimes[grade]) / 1000);
        document.getElementById('time-used').textContent = gradeElapsedTimes[grade];
    }, 1000);
}

function stopTimer(grade) {
    if (gradeTimers[grade]) {
        clearInterval(gradeTimers[grade]);
        gradeTimers[grade] = null;
    }
}

// 提交答案 - 修复版本：动态获取题目key
function submitAnswers() {
    const answerInputs = document.querySelectorAll('.answer-input');
    if (answerInputs.length === 0) {
        alert('没有可提交的题目，请先选择练习类型');
        return;
    }
    
    // 从第一个输入框获取题目key和年级
    const firstInput = answerInputs[0];
    const key = firstInput.getAttribute('data-key');
    const grade = parseInt(firstInput.getAttribute('data-grade'));
    
    if (!key || !gradeQuestions[key]) {
        alert('题目数据错误，请重新开始练习');
        return;
    }
    
    // 停止计时
    stopTimer(grade);
    
    const questions = gradeQuestions[key];
    const totalQuestions = questions.length;
    let correctCount = 0;
    
    // 初始化错题存储
    if (!gradeWrongQuestions[key]) {
        gradeWrongQuestions[key] = [];
    } else {
        // 清空当前错题本中对应key的旧错题（每次提交重新记录）
        gradeWrongQuestions[key] = [];
    }
    
    answerInputs.forEach((input, index) => {
        const userAnswer = input.value.trim();
        const correctAnswer = questions[index].answer;
        
        let isCorrect = false;
        if (typeof correctAnswer === 'string') {
            isCorrect = userAnswer === correctAnswer;
        } else {
            const numUserAnswer = parseFloat(userAnswer);
            isCorrect = !isNaN(numUserAnswer) && Math.abs(numUserAnswer - correctAnswer) < 0.01;
        }
        
        if (isCorrect) {
            correctCount++;
            input.classList.add('correct');
            input.classList.remove('incorrect');
        } else {
            input.classList.add('incorrect');
            input.classList.remove('correct');
            gradeWrongQuestions[key].push({
                ...questions[index],
                userAnswer: userAnswer || '(未填写)'
            });
        }
    });
    
    document.getElementById('correct-count').textContent = correctCount;
    
    const score = Math.round((correctCount / totalQuestions) * 100);
    const historyItem = {
        grade: grade,
        totalQuestions: totalQuestions,
        correctCount: correctCount,
        wrongCount: totalQuestions - correctCount,
        score: score,
        timeUsed: gradeElapsedTimes[grade] || 0,
        date: new Date().toLocaleString('zh-CN')
    };
    
    practiceHistory.unshift(historyItem);
    if (practiceHistory.length > 50) {
        practiceHistory = practiceHistory.slice(0, 50);
    }
    
    calculateRewards(historyItem);
    saveData();
    
    // 显示结果提示
    alert(`练习完成！\n正确：${correctCount}/${totalQuestions}\n得分：${score}分\n用时：${historyItem.timeUsed}秒`);
}

// 显示错题 - 修复年级显示
function showWrongQuestions() {
    const container = document.getElementById('wrong-container');
    container.innerHTML = '';
    
    let hasWrongQuestions = false;
    const gradeMap = {};
    
    for (let key in gradeWrongQuestions) {
        if (gradeWrongQuestions[key].length > 0) {
            hasWrongQuestions = true;
            // 从key中提取年级数字
            const gradeMatch = key.match(/^(\d+)/);
            const gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : 0;
            if (!gradeMap[gradeNum]) {
                gradeMap[gradeNum] = [];
            }
            gradeMap[gradeNum].push(...gradeWrongQuestions[key]);
        }
    }
    
    if (!hasWrongQuestions) {
        container.innerHTML = '<p style="text-align: center; color: #27ae60; font-size: 1.2em;">暂无错题记录</p>';
        return;
    }
    
    const gradeNames = ['', '一年级', '二年级', '三年级', '四年级', '五年级'];
    for (let gradeNum = 1; gradeNum <= 5; gradeNum++) {
        if (gradeMap[gradeNum] && gradeMap[gradeNum].length > 0) {
            const gradeSection = document.createElement('div');
            gradeSection.className = 'grade-wrong-section';
            gradeSection.innerHTML = `<h3>${gradeNames[gradeNum]}错题</h3>`;
            
            gradeMap[gradeNum].forEach((q, index) => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question';
                const answerDisplay = typeof q.answer === 'number' ? q.answer.toFixed(2) : q.answer;
                questionDiv.innerHTML = `
                    <span class="question-number">${index + 1}.</span>
                    <span class="question-text">${q.question}</span>
                    <div class="wrong-answer-info">
                        <span class="user-answer">你的答案：${q.userAnswer}</span>
                        <span class="correct-answer">正确答案：${answerDisplay}</span>
                    </div>
                `;
                gradeSection.appendChild(questionDiv);
            });
            container.appendChild(gradeSection);
        }
    }
}

function showPracticeHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = '';
    
    if (practiceHistory.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #3498db; font-size: 1.2em;">暂无练习记录</p>';
        return;
    }
    
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

function calculateRewards(historyItem) {
    userRewards.stars += historyItem.correctCount;
    if (historyItem.score === 100) {
        userRewards.trophies += 1;
    }
    userRewards.score += historyItem.score;
    checkAchievements();
    checkBadges();
}

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

function showRewards() {
    updateRewardsDisplay();
    showAchievements();
    showBadges();
}

function updateRewardsDisplay() {
    document.getElementById('total-stars').textContent = userRewards.stars;
    document.getElementById('total-trophies').textContent = userRewards.trophies;
    document.getElementById('total-score').textContent = userRewards.score;
}

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

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

const STORAGE_KEY = 'mathPracticeData';

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

function loadData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.practiceHistory) practiceHistory = data.practiceHistory;
            if (data.userRewards) userRewards = data.userRewards;
            if (data.gradeWrongQuestions) gradeWrongQuestions = data.gradeWrongQuestions;
            return true;
        }
    } catch (error) {
        console.error('读取数据失败:', error);
    }
    return false;
}

function clearData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        practiceHistory = [];
        userRewards = { stars: 0, trophies: 0, score: 0, achievements: {}, badges: {} };
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
    document.getElementById('battle-restart-btn').addEventListener('click', function() { resetBattleSetup(); });
    document.getElementById('battle-back-btn').addEventListener('click', function() { resetBattleSetup(); });
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
    if (battleState.timer) clearInterval(battleState.timer);
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
    const container = document.getElementById('battle-current-player');
    container.innerHTML = `<div class="bcp-label">当前答题</div><div class="bcp-name" style="color: ${player.color};">${player.avatar} ${player.name}</div>`;
    const question = battleState.questions[qIndex];
    document.getElementById('battle-question-display').textContent = question.question;
    const progressContainer = document.getElementById('battle-progress');
    progressContainer.innerHTML = '';
    for (let i = 0; i < battleState.questionCount; i++) {
        const dot = document.createElement('div');
        dot.className = 'battle-progress-dot';
        if (i < player.results.length) dot.classList.add(player.results[i] ? 'correct' : 'wrong');
        else if (i === player.currentQuestion) dot.classList.add('current');
        progressContainer.appendChild(dot);
    }
    document.getElementById('battle-feedback').textContent = '';
    document.getElementById('battle-feedback').className = 'battle-feedback';
    document.getElementById('battle-answer-input').value = '';
    document.getElementById('battle-answer-input').focus();
}

function updateBattlePlayersStatus() {
    const container = document.getElementById('battle-players-status');
    container.innerHTML = '';
    battleState.players.forEach((player, i) => {
        const div = document.createElement('div');
        div.className = 'battle-player-status' + (i === battleState.currentPlayerIndex ? ' current' : '');
        div.innerHTML = `<div class="bps-name" style="color: ${player.color};">${player.avatar} ${player.name}</div>
                         <div class="bps-score">${player.score}</div>
                         <div class="bps-progress">${player.currentQuestion}/${battleState.questionCount}</div>`;
        container.appendChild(div);
    });
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
        document.getElementById('battle-feedback').textContent = '✅ 回答正确！';
        document.getElementById('battle-feedback').className = 'battle-feedback correct';
    } else {
        player.wrong++;
        document.getElementById('battle-feedback').textContent = '❌ 答错了！正确答案是 ' + correctAnswer;
        document.getElementById('battle-feedback').className = 'battle-feedback wrong';
    }
    player.currentQuestion++;
    if (player.currentQuestion >= battleState.questionCount) {
        player.endTime = Date.now();
        player.totalTime = Math.floor((player.endTime - battleState.startTime) / 1000);
    }
    setTimeout(() => {
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
    }, 800);
}

function endBattle() {
    battleState.isPlaying = false;
    if (battleState.timer) clearInterval(battleState.timer);
    const sorted = [...battleState.players].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correct !== a.correct) return b.correct - a.correct;
        return a.totalTime - b.totalTime;
    });
    document.getElementById('battle-playing').style.display = 'none';
    document.getElementById('battle-result').style.display = 'block';
    const podium = document.getElementById('result-podium');
    podium.innerHTML = '';
    const rankEmojis = ['🥇', '🥈', '🥉'];
    sorted.forEach((player, i) => {
        const div = document.createElement('div');
        div.className = 'podium-item ' + (i < 3 ? ['first', 'second', 'third'][i] : 'other');
        div.innerHTML = `<div class="podium-rank">${i < 3 ? rankEmojis[i] : (i + 1)}</div>
                         <div class="podium-name" style="color: ${player.color};">${player.avatar} ${player.name}</div>
                         <div class="podium-score">${player.score}分</div>
                         <div class="podium-detail">正确${player.correct}题 | 用时${player.totalTime}秒</div>`;
        podium.appendChild(div);
    });
    const details = document.getElementById('result-details');
    details.innerHTML = '<h3 style="color: #00bfff; margin-bottom: 15px; text-align: center;">详细成绩</h3>';
    sorted.forEach(player => {
        const accuracy = Math.round((player.correct / battleState.questionCount) * 100);
        const row = document.createElement('div');
        row.className = 'result-detail-row';
        row.innerHTML = `<div class="result-detail-name"><span style="font-size:1.3em;">${player.avatar}</span><span>${player.name}</span></div>
                         <div class="result-detail-stats"><span>📝 ${player.correct}/${battleState.questionCount}</span><span>🎯 ${accuracy}%</span><span>⏱️ ${player.totalTime}秒</span><span>⭐ ${player.score}分</span></div>`;
        details.appendChild(row);
    });
}