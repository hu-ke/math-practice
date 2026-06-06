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
                // 如果是二年级基础练习，显示二级子目录
                showSubSubGradeSection2();
            } else if (currentGrade === 3 && subGrade === 'basic') {
                // 如果是三年级基础练习，显示三级子目录
                showSubSubGradeSection3();
            } else if (currentGrade === 4 && subGrade === 'basic') {
                // 如果是四年级基础练习，显示四级子目录
                showSubSubGradeSection4();
            } else if (currentGrade === 5 && subGrade === 'basic') {
                // 如果是五年级基础练习，显示五级子目录
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
            console.log('二级子目录选择:', subSubGrade);
            
            // 直接生成并显示对应类型的题目
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
            console.log('二年级二级子目录选择:', subSubGrade);
            
            // 直接生成并显示对应类型的题目
            generateAndShowQuestions(2, subSubGrade);
        });
    });

    // 为二年级返回子目录按钮添加事件监听
    document.getElementById('back-to-sub-grade-btn-2').addEventListener('click', function() {
        hideSubSubGradeSection2();
    });

    // 为三年级二级子目录按钮添加事件监听
    document.querySelectorAll('#sub-sub-grade-section-3 .sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subSubGrade = this.getAttribute('data-subgrade');
            currentSubSubGrade = subSubGrade;
            currentSubGrade = 'basic';
            console.log('三年级二级子目录选择:', subSubGrade);
            
            // 直接生成并显示对应类型的题目
            generateAndShowQuestions(3, subSubGrade);
        });
    });

    // 为三年级返回子目录按钮添加事件监听
    document.getElementById('back-to-sub-grade-btn-3').addEventListener('click', function() {
        hideSubSubGradeSection3();
    });

    // 为四年级二级子目录按钮添加事件监听
    document.querySelectorAll('#sub-sub-grade-section-4 .sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subSubGrade = this.getAttribute('data-subgrade');
            currentSubSubGrade = subSubGrade;
            currentSubGrade = 'basic';
            console.log('四年级二级子目录选择:', subSubGrade);
            
            // 直接生成并显示对应类型的题目
            generateAndShowQuestions(4, subSubGrade);
        });
    });

    // 为四年级返回子目录按钮添加事件监听
    document.getElementById('back-to-sub-grade-btn-4').addEventListener('click', function() {
        hideSubSubGradeSection4();
    });

    // 为五年级二级子目录按钮添加事件监听
    document.querySelectorAll('#sub-sub-grade-section-5 .sub-grade-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subSubGrade = this.getAttribute('data-subgrade');
            currentSubSubGrade = subSubGrade;
            currentSubGrade = 'basic';
            console.log('五年级二级子目录选择:', subSubGrade);
            
            // 直接生成并显示对应类型的题目
            generateAndShowQuestions(5, subSubGrade);
        });
    });

    // 为五年级返回子目录按钮添加事件监听
    document.getElementById('back-to-sub-grade-btn-5').addEventListener('click', function() {
        hideSubSubGradeSection5();
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

// 显示子目录选择
function showSubGradeSection(grade) {
    currentGrade = grade;
    currentSubGrade = '';
    currentSubSubGrade = '';

    // 更新标题
    const gradeNames = ['', '一年级', '二年级', '三年级', '四年级', '五年级'];
    document.getElementById('sub-grade-title').textContent = `${gradeNames[grade]}练习模式`;

    document.querySelector('.grade-section').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
    document.getElementById('practice-section').style.display = 'none';
}

// 显示二级子目录选择（一年级基础练习）
function showSubSubGradeSection() {
    console.log('显示二级子目录选择');
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section').style.display = 'block';
}

// 隐藏二级子目录选择
function hideSubSubGradeSection() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section').style.display = 'none';
}

// 隐藏子目录选择
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

// 显示二年级二级子目录选择
function showSubSubGradeSection2() {
    console.log('显示二年级二级子目录选择');
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-2').style.display = 'block';
}

// 隐藏二年级二级子目录选择
function hideSubSubGradeSection2() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section-2').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

// 显示三年级二级子目录选择
function showSubSubGradeSection3() {
    console.log('显示三年级二级子目录选择');
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-3').style.display = 'block';
}

// 隐藏三年级二级子目录选择
function hideSubSubGradeSection3() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section-3').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

// 显示四年级二级子目录选择
function showSubSubGradeSection4() {
    console.log('显示四年级二级子目录选择');
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-4').style.display = 'block';
}

// 隐藏四年级二级子目录选择
function hideSubSubGradeSection4() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section-4').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

// 显示五年级二级子目录选择
function showSubSubGradeSection5() {
    console.log('显示五年级二级子目录选择');
    document.getElementById('sub-grade-section').style.display = 'none';
    document.getElementById('sub-sub-grade-section-5').style.display = 'block';
}

// 隐藏五年级二级子目录选择
function hideSubSubGradeSection5() {
    currentSubSubGrade = '';
    document.getElementById('sub-sub-grade-section-5').style.display = 'none';
    document.getElementById('sub-grade-section').style.display = 'block';
}

// 直接生成并显示题目（用于二级子目录）
function generateAndShowQuestions(grade, subSubGrade) {
    console.log('=== generateAndShowQuestions ===');
    console.log('grade:', grade, 'subSubGrade:', subSubGrade);
    
    const questions = [];
    const count = 50;
    
    for (let i = 0; i < count; i++) {
        let question, answer;
        
        switch(subSubGrade) {
            case 'within10':
                // 10以内加减法
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
                // 20以内加减法
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
                // 元角分练习
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
                // 100以内加减法
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
                // 表内乘除法
                if (Math.random() > 0.5) {
                    // 表内乘法（1-9）
                    const a = Math.floor(Math.random() * 9) + 1;
                    const b = Math.floor(Math.random() * 9) + 1;
                    question = `${a} × ${b} =`;
                    answer = a * b;
                } else {
                    // 表内除法
                    const a = Math.floor(Math.random() * 9) + 1;
                    const b = Math.floor(Math.random() * 9) + 1;
                    const product = a * b;
                    question = `${product} ÷ ${a} =`;
                    answer = b;
                }
                break;
                
            case 'units':
                // 长度重量单位换算
                const unitRand = Math.random();
                if (unitRand > 0.5) {
                    // 长度单位换算（米、厘米、毫米）
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
                    // 重量单位换算（千克、克）
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
                // 万以内加减法
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
                // 两位数乘除法
                if (Math.random() > 0.5) {
                    // 两位数乘法
                    const tens1 = Math.floor(Math.random() * 9) + 1;
                    const ones1 = Math.floor(Math.random() * 10);
                    const num1 = tens1 * 10 + ones1;
                    const tens2 = Math.floor(Math.random() * 9) + 1;
                    const ones2 = Math.floor(Math.random() * 10);
                    const num2 = tens2 * 10 + ones2;
                    question = `${num1} × ${num2} =`;
                    answer = num1 * num2;
                } else {
                    // 一位数除法（能整除）
                    const divisor = Math.floor(Math.random() * 9) + 1;
                    const quotient = Math.floor(Math.random() * 90) + 10;
                    const dividend = divisor * quotient;
                    question = `${dividend} ÷ ${divisor} =`;
                    answer = quotient;
                }
                break;
                
            case 'decimalBasic':
                // 简单的小数加减
                if (Math.random() > 0.5) {
                    // 小数加法
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    const dec1 = Math.floor(Math.random() * 10);
                    const dec2 = Math.floor(Math.random() * 10);
                    question = `${a}.${dec1} + ${b}.${dec2} =`;
                    answer = (a + b) + (dec1 + dec2) / 10;
                } else {
                    // 小数减法（确保结果不为负数）
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
                // 三位数乘两位数乘法
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
                // 两位数除法（能整除）
                const divisor = Math.floor(Math.random() * 90) + 10;
                const quotient = Math.floor(Math.random() * 90) + 10;
                const dividend = divisor * quotient;
                question = `${dividend} ÷ ${divisor} =`;
                answer = quotient;
                break;
                
            case 'decimalAddSub':
                // 小数加减法（两位小数）
                if (Math.random() > 0.5) {
                    // 小数加法
                    const a = Math.floor(Math.random() * 90) + 10;
                    const b = Math.floor(Math.random() * 90) + 10;
                    const dec1 = Math.floor(Math.random() * 100);
                    const dec2 = Math.floor(Math.random() * 100);
                    question = `${a}.${dec1.toString().padStart(2, '0')} + ${b}.${dec2.toString().padStart(2, '0')} =`;
                    answer = (a + b) + (dec1 + dec2) / 100;
                } else {
                    // 小数减法（确保结果不为负数）
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
                // 度量单位换算
                const unitType = Math.random();
                if (unitType > 0.75) {
                    // 长度单位换算（千米、米、分米、厘米、毫米）
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
                    // 重量单位换算（吨、千克、克）
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
                    // 面积单位换算（平方米、平方分米、平方厘米）
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
                    // 时间单位换算（时、分、秒）
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
                // 小数乘法
                const decimalMultType = Math.random();
                if (decimalMultType > 0.5) {
                    // 小数乘整数
                    const integer = Math.floor(Math.random() * 90) + 10;
                    const dec = Math.floor(Math.random() * 100);
                    const decimal = parseFloat(`0.${dec.toString().padStart(2, '0')}`);
                    question = `${integer} × ${decimal.toFixed(2)} =`;
                    answer = integer * decimal;
                } else {
                    // 小数乘小数
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
                // 小数除法
                const decimalDivType = Math.random();
                if (decimalDivType > 0.5) {
                    // 小数除以整数
                    const divisor = Math.floor(Math.random() * 9) + 1;
                    const quotient = parseFloat((Math.random() * 10 + 1).toFixed(2));
                    const dividend = divisor * quotient;
                    question = `${dividend.toFixed(2)} ÷ ${divisor} =`;
                    answer = quotient;
                } else {
                    // 小数除以小数（能整除）
                    const divisorDec = Math.floor(Math.random() * 90) + 10;
                    const divisor = parseFloat(`0.${divisorDec.toString().padStart(2, '0')}`);
                    const quotient = Math.floor(Math.random() * 90) + 10;
                    const dividend = divisor * quotient;
                    question = `${dividend.toFixed(2)} ÷ ${divisor.toFixed(2)} =`;
                    answer = quotient;
                }
                break;
                
            case 'fractionAddSub':
                // 分数加减法
                const fractionType = Math.random();
                if (fractionType > 0.5) {
                    // 分数加法
                    const num1 = Math.floor(Math.random() * 9) + 1;
                    const den1 = Math.floor(Math.random() * 9) + 2;
                    const num2 = Math.floor(Math.random() * 9) + 1;
                    const den2 = Math.floor(Math.random() * 9) + 2;
                    question = `${num1}/${den1} + ${num2}/${den2} =`;
                    const commonDen = den1 * den2;
                    const newNum1 = num1 * den2;
                    const newNum2 = num2 * den1;
                    const sumNum = newNum1 + newNum2;
                    // 简化分数
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
                    // 分数减法（确保结果不为负数）
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
                    // 简化分数
                    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                    const divisor = gcd(diffNum, commonDen);
                    const simplifiedNum = diffNum / divisor;
                    const simplifiedDen = commonDen / divisor;
                    if (simplifiedDen === 1) {
                        answer = simplifiedNum;
                    } else {
                        answer = `${simplifiedNum}/${simplifiedDen}`;
                    }
                    // 根据大小调整题目显示顺序
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
    
    console.log('生成题目数量:', questions.length);
    if (questions.length > 0) {
        console.log('第一题:', questions[0].question, '答案:', questions[0].answer);
    }
    
    // 隐藏子目录选择区域
    hideSubGradeSection();
    
    // 保存题目
    const key = `${grade}-basic-${subSubGrade}`;
    gradeQuestions[key] = questions;
    
    // 显示题目
    displayQuestions(grade, key);
    
    // 重置计时器
    resetTimer(grade);
    
    // 开始计时
    startTimer(grade);
    
    // 重置正确数
    document.getElementById('correct-count').textContent = '0';
    
    // 显示练习区域
    document.getElementById('practice-section').style.display = 'block';
}

// 开始练习
function startPractice(grade) {
    currentGrade = grade;

    // 先保存当前子目录选择（在隐藏前保存）
    const selectedSubGrade = currentSubGrade;
    const selectedSubSubGrade = currentSubSubGrade;

    console.log('=== startPractice 开始 ===');
    console.log('grade:', grade);
    console.log('currentSubGrade:', currentSubGrade, 'selectedSubGrade:', selectedSubGrade);
    console.log('currentSubSubGrade:', currentSubSubGrade, 'selectedSubSubGrade:', selectedSubSubGrade);

    // 隐藏子目录选择区域
    hideSubGradeSection();

    // 生成题目（根据子目录选择）
    let key;
    if ((grade === 1 || grade === 2 || grade === 3 || grade === 4 || grade === 5) && selectedSubGrade === 'basic' && selectedSubSubGrade) {
        // 一年级、二年级、三年级、四年级或五年级基础练习使用二级子目录
        key = `${grade}-${selectedSubGrade}-${selectedSubSubGrade}`;
        console.log('使用二级子目录 key:', key);
    } else {
        // 其他情况使用一级子目录
        key = selectedSubGrade ? `${grade}-${selectedSubGrade}` : grade;
        console.log('使用一级子目录 key:', key);
    }
    
    // 强制重新生成题目，避免缓存问题
    console.log('调用 generateQuestions:', grade, 50, selectedSubGrade, selectedSubSubGrade);
    gradeQuestions[key] = generateQuestions(grade, 50, selectedSubGrade, selectedSubSubGrade);
    console.log('题目生成成功，数量:', gradeQuestions[key].length);
    if (gradeQuestions[key].length > 0) {
        console.log('第一题:', gradeQuestions[key][0].question, '答案:', gradeQuestions[key][0].answer);
    }

    // 显示题目
    displayQuestions(grade, key);

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
function generateQuestions(grade, count, subGrade = '', subSubGrade = '') {
    const questions = [];
    
    for (let i = 0; i < count; i++) {
        let question, answer;
        
        switch (grade) {
            case 1: // 一年级：根据子目录选择不同难度
                if (subGrade === 'basic') {
                    // 基础练习：根据二级子目录选择
                    if (subSubGrade === 'within10') {
                        // 10以内加减法
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
                    } else if (subSubGrade === 'within20') {
                        // 20以内加减法
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
                    } else if (subSubGrade === 'currency') {
                        // 元角分练习
                        const rand = Math.random();
                        if (rand > 0.66) {
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
                        } else if (rand > 0.33) {
                            const a = Math.floor(Math.random() * 5) + 1;
                            question = `${a}元 = ？角`;
                            answer = a * 10;
                        } else {
                            const a = Math.floor(Math.random() * 9) + 1;
                            question = `${a * 10}角 = ？元`;
                            answer = a;
                        }
                    } else {
                        // 默认：20以内加减法
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
                    }
                } else if (subGrade === 'comprehensive') {
                    // 综合练习：20以内加减法 + 人民币练习
                    if (Math.random() > 0.5) {
                        // 20以内加减法
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
                    } else {
                        // 人民币练习
                        const rand = Math.random();
                        if (rand > 0.66) {
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
                        } else if (rand > 0.33) {
                            const a = Math.floor(Math.random() * 5) + 1;
                            question = `${a}元 = ？角`;
                            answer = a * 10;
                        } else {
                            const a = Math.floor(Math.random() * 9) + 1;
                            question = `${a * 10}角 = ？元`;
                            answer = a;
                        }
                    }
                } else {
                    // 默认：混合练习
                    if (Math.random() > 0.6) {
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
                    } else {
                        const rand = Math.random();
                        if (rand > 0.66) {
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
                        } else if (rand > 0.33) {
                            const a = Math.floor(Math.random() * 5) + 1;
                            question = `${a}元 = ？角`;
                            answer = a * 10;
                        } else {
                            const a = Math.floor(Math.random() * 9) + 1;
                            question = `${a * 10}角 = ？元`;
                            answer = a;
                        }
                    }
                }
                break;
                
            case 2: // 二年级：根据子目录选择不同难度
                if (subGrade === 'basic') {
                    // 基础练习：根据二级子目录选择
                    if (subSubGrade === 'within100') {
                        // 100以内加减法
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
                    } else if (subSubGrade === 'multiplication') {
                        // 表内乘除法
                        if (Math.random() > 0.5) {
                            // 表内乘法（1-9）
                            const a = Math.floor(Math.random() * 9) + 1;
                            const b = Math.floor(Math.random() * 9) + 1;
                            question = `${a} × ${b} =`;
                            answer = a * b;
                        } else {
                            // 表内除法
                            const a = Math.floor(Math.random() * 9) + 1;
                            const b = Math.floor(Math.random() * 9) + 1;
                            const product = a * b;
                            question = `${product} ÷ ${a} =`;
                            answer = b;
                        }
                    } else if (subSubGrade === 'units') {
                        // 长度重量单位换算
                        const unitRand = Math.random();
                        if (unitRand > 0.5) {
                            // 长度单位换算（米、厘米、毫米）
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
                            // 重量单位换算（千克、克）
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
                    } else {
                        // 默认：混合练习（100以内加减法、表内乘除法）
                        const rand = Math.random();
                        if (rand > 0.5) {
                            // 100以内加减法
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
                        } else if (rand > 0.25) {
                            // 表内乘法（1-9）
                            const a = Math.floor(Math.random() * 9) + 1;
                            const b = Math.floor(Math.random() * 9) + 1;
                            question = `${a} × ${b} =`;
                            answer = a * b;
                        } else {
                            // 表内除法
                            const a = Math.floor(Math.random() * 9) + 1;
                            const b = Math.floor(Math.random() * 9) + 1;
                            const product = a * b;
                            question = `${product} ÷ ${a} =`;
                            answer = b;
                        }
                    }
                } else if (subGrade === 'comprehensive') {
                    // 综合练习：100以内加减法、连加连减、两位数乘一位数、表内除法、长度单位换算
                    const rand = Math.random();
                    if (rand > 0.4) {
                        // 100以内加减法
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
                    } else if (rand > 0.25) {
                        // 连加连减（两步运算）
                        const a = Math.floor(Math.random() * 50) + 10;
                        const b = Math.floor(Math.random() * 50) + 10;
                        const c = Math.floor(Math.random() * Math.min(a, b)) + 1;
                        if (Math.random() > 0.5) {
                            question = `${a} + ${b} - ${c} =`;
                            answer = a + b - c;
                        } else {
                            question = `${a} - ${b} - ${c} =`;
                            answer = a - b - c;
                        }
                    } else if (rand > 0.15) {
                        // 两位数乘一位数
                        const tens = Math.floor(Math.random() * 9) + 1;
                        const ones = Math.floor(Math.random() * 10);
                        const twoDigit = tens * 10 + ones;
                        const single = Math.floor(Math.random() * 9) + 1;
                        question = `${twoDigit} × ${single} =`;
                        answer = twoDigit * single;
                    } else if (rand > 0.05) {
                        // 表内除法
                        const a = Math.floor(Math.random() * 9) + 1;
                        const b = Math.floor(Math.random() * 9) + 1;
                        const product = a * b;
                        question = `${product} ÷ ${a} =`;
                        answer = b;
                    } else {
                        // 长度单位换算（米、厘米、毫米）
                        const unitRand = Math.random();
                        if (unitRand > 0.66) {
                            const a = Math.floor(Math.random() * 10) + 1;
                            question = `${a}米 = ？厘米`;
                            answer = a * 100;
                        } else if (unitRand > 0.33) {
                            const a = Math.floor(Math.random() * 50) + 10;
                            question = `${a}厘米 = ？毫米`;
                            answer = a * 10;
                        } else {
                            const a = Math.floor(Math.random() * 5) + 1;
                            question = `${a}米 = ？毫米`;
                            answer = a * 1000;
                        }
                    }
                } else {
                    // 默认：混合练习
                    if (Math.random() > 0.6) {
                        const a = Math.floor(Math.random() * 12) + 1;
                        const b = Math.floor(Math.random() * 12) + 1;
                        question = `${a} × ${b} =`;
                        answer = a * b;
                    } else if (Math.random() > 0.4) {
                        const a = Math.floor(Math.random() * 190) + 10;
                        const b = Math.floor(Math.random() * 190) + 10;
                        question = `${a} + ${b} =`;
                        answer = a + b;
                    } else {
                        const a = Math.floor(Math.random() * 190) + 10;
                        const b = Math.floor(Math.random() * a) + 1;
                        question = `${a} - ${b} =`;
                        answer = a - b;
                    }
                }
                break;
                
            case 3: // 三年级：根据子目录选择不同难度
                if (subGrade === 'basic') {
                    // 基础练习：根据二级子目录选择
                    if (subSubGrade === 'within10000') {
                        // 万以内加减法
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
                    } else if (subSubGrade === 'twoDigitMultDiv') {
                        // 两位数乘除法
                        if (Math.random() > 0.5) {
                            // 两位数乘法
                            const tens1 = Math.floor(Math.random() * 9) + 1;
                            const ones1 = Math.floor(Math.random() * 10);
                            const num1 = tens1 * 10 + ones1;
                            const tens2 = Math.floor(Math.random() * 9) + 1;
                            const ones2 = Math.floor(Math.random() * 10);
                            const num2 = tens2 * 10 + ones2;
                            question = `${num1} × ${num2} =`;
                            answer = num1 * num2;
                        } else {
                            // 一位数除法（能整除）
                            const divisor = Math.floor(Math.random() * 9) + 1;
                            const quotient = Math.floor(Math.random() * 90) + 10;
                            const dividend = divisor * quotient;
                            question = `${dividend} ÷ ${divisor} =`;
                            answer = quotient;
                        }
                    } else if (subSubGrade === 'decimalBasic') {
                        // 简单的小数加减
                        if (Math.random() > 0.5) {
                            // 小数加法
                            const a = Math.floor(Math.random() * 90) + 10;
                            const b = Math.floor(Math.random() * 90) + 10;
                            const dec1 = Math.floor(Math.random() * 10);
                            const dec2 = Math.floor(Math.random() * 10);
                            question = `${a}.${dec1} + ${b}.${dec2} =`;
                            answer = (a + b) + (dec1 + dec2) / 10;
                        } else {
                            // 小数减法（确保结果不为负数）
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
                    } else {
                        // 默认：混合练习（三位数乘一位数、千以内加减法、三位数除1位数）
                        const rand = Math.random();
                        if (rand > 0.5) {
                            // 千以内加减法
                            if (Math.random() > 0.5) {
                                const a = Math.floor(Math.random() * 900) + 100;
                                const b = Math.floor(Math.random() * 900) + 100;
                                question = `${a} + ${b} =`;
                                answer = a + b;
                            } else {
                                const a = Math.floor(Math.random() * 900) + 100;
                                const b = Math.floor(Math.random() * (a - 100)) + 100;
                                question = `${a} - ${b} =`;
                                answer = a - b;
                            }
                        } else if (rand > 0.25) {
                            // 三位数乘一位数
                            const a = Math.floor(Math.random() * 900) + 100;
                            const b = Math.floor(Math.random() * 9) + 1;
                            question = `${a} × ${b} =`;
                            answer = a * b;
                        } else {
                            // 三位数除1位数
                            const b = Math.floor(Math.random() * 9) + 1;
                            answer = Math.floor(Math.random() * 100) + 10;
                            const a = b * answer;
                            question = `${a} ÷ ${b} =`;
                        }
                    }
                } else if (subGrade === 'comprehensive') {
                    // 综合练习：千以内加减法、三位数乘一位数、三位数除1位数、混合运算、简单小数加法
                    const rand = Math.random();
                    if (rand > 0.4) {
                        // 千以内加减法
                        if (Math.random() > 0.5) {
                            const a = Math.floor(Math.random() * 900) + 100;
                            const b = Math.floor(Math.random() * 900) + 100;
                            question = `${a} + ${b} =`;
                            answer = a + b;
                        } else {
                            const a = Math.floor(Math.random() * 900) + 100;
                            const b = Math.floor(Math.random() * (a - 100)) + 100;
                            question = `${a} - ${b} =`;
                            answer = a - b;
                        }
                    } else if (rand > 0.25) {
                        // 三位数乘一位数或三位数除1位数
                        if (Math.random() > 0.5) {
                            const a = Math.floor(Math.random() * 900) + 100;
                            const b = Math.floor(Math.random() * 9) + 1;
                            question = `${a} × ${b} =`;
                            answer = a * b;
                        } else {
                            const b = Math.floor(Math.random() * 9) + 1;
                            answer = Math.floor(Math.random() * 100) + 10;
                            const a = b * answer;
                            question = `${a} ÷ ${b} =`;
                        }
                    } else if (rand > 0.1) {
                        // 混合运算（加减乘除两步）
                        const a = Math.floor(Math.random() * 90) + 10;
                        const b = Math.floor(Math.random() * 9) + 1;
                        const c = Math.floor(Math.random() * 9) + 1;
                        if (Math.random() > 0.5) {
                            question = `${a} × ${b} + ${c} =`;
                            answer = a * b + c;
                        } else {
                            question = `${a} + ${b} × ${c} =`;
                            answer = a + b * c;
                        }
                    } else {
                        // 简单小数加法（一位小数）
                        const a = Math.floor(Math.random() * 90) + 10;
                        const b = Math.floor(Math.random() * 90) + 10;
                        const dec1 = Math.floor(Math.random() * 10);
                        const dec2 = Math.floor(Math.random() * 10);
                        question = `${a}.${dec1} + ${b}.${dec2} =`;
                        answer = (a + b) + (dec1 + dec2) / 10;
                    }
                } else {
                    // 默认：混合练习
                    if (Math.random() > 0.5) {
                        const b = Math.floor(Math.random() * 50) + 10;
                        answer = Math.floor(Math.random() * 9) + 1;
                        const a = b * answer;
                        question = `${a} ÷ ${b} =`;
                    } else if (Math.random() > 0.4) {
                        const a = Math.floor(Math.random() * 90) + 10;
                        const b = Math.floor(Math.random() * 9) + 1;
                        question = `${a} × ${b} =`;
                        answer = a * b;
                    } else if (Math.random() > 0.25) {
                        const a = Math.floor(Math.random() * 900) + 100;
                        const b = Math.floor(Math.random() * 900) + 100;
                        question = `${a} + ${b} =`;
                        answer = a + b;
                    } else {
                        const a = Math.floor(Math.random() * 900) + 100;
                        const b = Math.floor(Math.random() * (a - 100)) + 100;
                        question = `${a} - ${b} =`;
                        answer = a - b;
                    }
                }
                break;
                
            case 4: // 四年级：根据子目录选择不同难度
                if (subGrade === 'basic') {
                    // 基础练习：根据二级子目录选择
                    if (subSubGrade === 'threeDigitTwoDigitMult') {
                        // 三位数乘两位数乘法
                        const hundreds = Math.floor(Math.random() * 9) + 1;
                        const tens = Math.floor(Math.random() * 10);
                        const ones = Math.floor(Math.random() * 10);
                        const threeDigit = hundreds * 100 + tens * 10 + ones;
                        const tens2 = Math.floor(Math.random() * 9) + 1;
                        const ones2 = Math.floor(Math.random() * 10);
                        const twoDigit = tens2 * 10 + ones2;
                        question = `${threeDigit} × ${twoDigit} =`;
                        answer = threeDigit * twoDigit;
                    } else if (subSubGrade === 'twoDigitDiv') {
                        // 两位数除法（能整除）
                        const divisor = Math.floor(Math.random() * 90) + 10;
                        const quotient = Math.floor(Math.random() * 90) + 10;
                        const dividend = divisor * quotient;
                        question = `${dividend} ÷ ${divisor} =`;
                        answer = quotient;
                    } else if (subSubGrade === 'decimalAddSub') {
                        // 小数加减法（两位小数）
                        if (Math.random() > 0.5) {
                            // 小数加法
                            const a = Math.floor(Math.random() * 90) + 10;
                            const b = Math.floor(Math.random() * 90) + 10;
                            const dec1 = Math.floor(Math.random() * 100);
                            const dec2 = Math.floor(Math.random() * 100);
                            question = `${a}.${dec1.toString().padStart(2, '0')} + ${b}.${dec2.toString().padStart(2, '0')} =`;
                            answer = (a + b) + (dec1 + dec2) / 100;
                        } else {
                            // 小数减法（确保结果不为负数）
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
                    } else if (subSubGrade === 'unitConversion') {
                        // 度量单位换算
                        const unitType = Math.random();
                        if (unitType > 0.75) {
                            // 长度单位换算（千米、米、分米、厘米、毫米）
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
                            // 重量单位换算（吨、千克、克）
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
                            // 面积单位换算（平方米、平方分米、平方厘米）
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
                            // 时间单位换算（时、分、秒）
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
                    } else {
                        // 默认：混合练习（除数2位数的除法、三位数乘一位数、小数加减法）
                        const rand = Math.random();
                        if (rand > 0.5) {
                            // 小数加减法（一位小数）
                            const a = Math.floor(Math.random() * 90) + 10;
                            const b = Math.floor(Math.random() * 90) + 10;
                            const dec1 = Math.floor(Math.random() * 10);
                            const dec2 = Math.floor(Math.random() * 10);
                            if (Math.random() > 0.5) {
                                question = `${a}.${dec1} + ${b}.${dec2} =`;
                                answer = (a + b) + (dec1 + dec2) / 10;
                            } else {
                                const num1 = parseFloat(`${a}.${dec1}`);
                                const num2 = parseFloat(`${b}.${dec2}`);
                                const max = Math.max(num1, num2);
                                const min = Math.min(num1, num2);
                                question = `${max.toFixed(1)} - ${min.toFixed(1)} =`;
                                answer = max - min;
                            }
                        } else if (rand > 0.25) {
                            // 三位数乘一位数
                            const a = Math.floor(Math.random() * 900) + 100;
                            const b = Math.floor(Math.random() * 9) + 1;
                            question = `${a} × ${b} =`;
                            answer = a * b;
                        } else {
                            // 除数2位数的除法
                            const b = Math.floor(Math.random() * 90) + 10;
                            answer = Math.floor(Math.random() * 9) + 1;
                            const a = b * answer;
                            question = `${a} ÷ ${b} =`;
                        }
                    }
                } else if (subGrade === 'comprehensive') {
                    // 综合练习：80%除加除减混合和连乘连除，20%其他类型题目
                    if (Math.random() > 0.2) {
                        // 80%：除加除减混合运算和连乘连除
                        if (Math.random() > 0.5) {
                            // 除加除减混合运算
                            const a = Math.floor(Math.random() * 90) + 10;
                            const b = Math.floor(Math.random() * 9) + 1;
                            if (Math.random() > 0.5) {
                                const c = Math.floor(Math.random() * 90) + 10;
                                question = `${a * b} ÷ ${a} + ${c} =`;
                                answer = b + c;
                            } else {
                                // 确保结果不为负数
                                const c = Math.floor(Math.random() * b) + 1;
                                question = `${a * b} ÷ ${a} - ${c} =`;
                                answer = b - c;
                            }
                        } else {
                            // 连乘连除
                            const a = Math.floor(Math.random() * 9) + 2;
                            const b = Math.floor(Math.random() * 9) + 2;
                            const c = Math.floor(Math.random() * 9) + 2;
                            if (Math.random() > 0.5) {
                                question = `${a} × ${b} × ${c} =`;
                                answer = a * b * c;
                            } else {
                                question = `${a * b * c} ÷ ${a} ÷ ${b} =`;
                                answer = c;
                            }
                        }
                    } else {
                        // 20%：其他类型题目（小数加减法、三位数乘两位数、两位数除法）
                        const otherType = Math.random();
                        if (otherType > 0.66) {
                            // 小数加减法（两位小数）
                            if (Math.random() > 0.5) {
                                // 小数加法
                                const a = Math.floor(Math.random() * 90) + 10;
                                const b = Math.floor(Math.random() * 90) + 10;
                                const dec1 = Math.floor(Math.random() * 100);
                                const dec2 = Math.floor(Math.random() * 100);
                                question = `${a}.${dec1.toString().padStart(2, '0')} + ${b}.${dec2.toString().padStart(2, '0')} =`;
                                answer = (a + b) + (dec1 + dec2) / 100;
                            } else {
                                // 小数减法（确保结果不为负数）
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
                        } else if (otherType > 0.33) {
                            // 三位数乘两位数乘法
                            const hundreds = Math.floor(Math.random() * 9) + 1;
                            const tens = Math.floor(Math.random() * 10);
                            const ones = Math.floor(Math.random() * 10);
                            const threeDigit = hundreds * 100 + tens * 10 + ones;
                            const tens2 = Math.floor(Math.random() * 9) + 1;
                            const ones2 = Math.floor(Math.random() * 10);
                            const twoDigit = tens2 * 10 + ones2;
                            question = `${threeDigit} × ${twoDigit} =`;
                            answer = threeDigit * twoDigit;
                        } else {
                            // 两位数除法（能整除）
                            const divisor = Math.floor(Math.random() * 90) + 10;
                            const quotient = Math.floor(Math.random() * 90) + 10;
                            const dividend = divisor * quotient;
                            question = `${dividend} ÷ ${divisor} =`;
                            answer = quotient;
                        }
                    }
                } else {
                    // 默认：混合练习
                    if (Math.random() > 0.6) {
                        const a = (Math.random() * 100).toFixed(2);
                        const b = (Math.random() * 100).toFixed(2);
                        if (Math.random() > 0.5) {
                            question = `${a} + ${b} =`;
                            answer = parseFloat(a) + parseFloat(b);
                        } else {
                            const max = Math.max(parseFloat(a), parseFloat(b));
                            const min = Math.min(parseFloat(a), parseFloat(b));
                            question = `${max} - ${min} =`;
                            answer = max - min;
                        }
                    } else if (Math.random() > 0.4) {
                        const a = Math.floor(Math.random() * 900) + 100;
                        const b = Math.floor(Math.random() * 90) + 10;
                        question = `${a} × ${b} =`;
                        answer = a * b;
                    } else {
                        const b = Math.floor(Math.random() * 90) + 10;
                        answer = Math.floor(Math.random() * 9) + 1;
                        const a = b * answer;
                        question = `${a} ÷ ${b} =`;
                    }
                }
                break;
                
            case 5: // 五年级：根据子目录选择不同难度
                if (subGrade === 'basic') {
                    // 基础练习：根据二级子目录选择
                    if (subSubGrade === 'decimalMult') {
                        // 小数乘法
                        const decimalMultType = Math.random();
                        if (decimalMultType > 0.5) {
                            // 小数乘整数
                            const integer = Math.floor(Math.random() * 90) + 10;
                            const dec = Math.floor(Math.random() * 100);
                            const decimal = parseFloat(`0.${dec.toString().padStart(2, '0')}`);
                            question = `${integer} × ${decimal.toFixed(2)} =`;
                            answer = integer * decimal;
                        } else {
                            // 小数乘小数
                            const a = Math.floor(Math.random() * 90) + 10;
                            const b = Math.floor(Math.random() * 90) + 10;
                            const dec1 = Math.floor(Math.random() * 100);
                            const dec2 = Math.floor(Math.random() * 100);
                            const decimal1 = parseFloat(`${a}.${dec1.toString().padStart(2, '0')}`);
                            const decimal2 = parseFloat(`${b}.${dec2.toString().padStart(2, '0')}`);
                            question = `${decimal1.toFixed(2)} × ${decimal2.toFixed(2)} =`;
                            answer = decimal1 * decimal2;
                        }
                    } else if (subSubGrade === 'decimalDiv') {
                        // 小数除法
                        const decimalDivType = Math.random();
                        if (decimalDivType > 0.5) {
                            // 小数除以整数
                            const divisor = Math.floor(Math.random() * 9) + 1;
                            const quotient = parseFloat((Math.random() * 10 + 1).toFixed(2));
                            const dividend = divisor * quotient;
                            question = `${dividend.toFixed(2)} ÷ ${divisor} =`;
                            answer = quotient;
                        } else {
                            // 小数除以小数（能整除）
                            const divisorDec = Math.floor(Math.random() * 90) + 10;
                            const divisor = parseFloat(`0.${divisorDec.toString().padStart(2, '0')}`);
                            const quotient = Math.floor(Math.random() * 90) + 10;
                            const dividend = divisor * quotient;
                            question = `${dividend.toFixed(2)} ÷ ${divisor.toFixed(2)} =`;
                            answer = quotient;
                        }
                    } else if (subSubGrade === 'fractionAddSub') {
                        // 分数加减法
                        const fractionType = Math.random();
                        if (fractionType > 0.5) {
                            // 分数加法
                            const num1 = Math.floor(Math.random() * 9) + 1;
                            const den1 = Math.floor(Math.random() * 9) + 2;
                            const num2 = Math.floor(Math.random() * 9) + 1;
                            const den2 = Math.floor(Math.random() * 9) + 2;
                            question = `${num1}/${den1} + ${num2}/${den2} =`;
                            const commonDen = den1 * den2;
                            const newNum1 = num1 * den2;
                            const newNum2 = num2 * den1;
                            const sumNum = newNum1 + newNum2;
                            // 简化分数
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
                            // 分数减法（确保结果不为负数）
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
                            // 简化分数
                            const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                            const divisor = gcd(diffNum, commonDen);
                            const simplifiedNum = diffNum / divisor;
                            const simplifiedDen = commonDen / divisor;
                            if (simplifiedDen === 1) {
                                answer = simplifiedNum;
                            } else {
                                answer = `${simplifiedNum}/${simplifiedDen}`;
                            }
                            // 根据大小调整题目显示顺序
                            if (newNum1 >= newNum2) {
                                question = `${num1}/${den1} - ${num2}/${den2} =`;
                            } else {
                                question = `${num2}/${den2} - ${num1}/${den1} =`;
                            }
                        }
                    } else {
                        // 默认：一位小数加减乘除法
                        const rand = Math.random();
                        if (rand > 0.5) {
                            // 一位小数加减法
                            const a = Math.floor(Math.random() * 90) + 10;
                            const b = Math.floor(Math.random() * 90) + 10;
                            const dec1 = Math.floor(Math.random() * 10);
                            const dec2 = Math.floor(Math.random() * 10);
                            if (Math.random() > 0.5) {
                                question = `${a}.${dec1} + ${b}.${dec2} =`;
                                answer = (a + b) + (dec1 + dec2) / 10;
                            } else {
                                const num1 = parseFloat(`${a}.${dec1}`);
                                const num2 = parseFloat(`${b}.${dec2}`);
                                const max = Math.max(num1, num2);
                                const min = Math.min(num1, num2);
                                question = `${max.toFixed(1)} - ${min.toFixed(1)} =`;
                                answer = max - min;
                            }
                        } else if (rand > 0.25) {
                            // 一位小数乘法
                            const a = Math.floor(Math.random() * 9) + 1;
                            const b = Math.floor(Math.random() * 9) + 1;
                            const dec1 = Math.floor(Math.random() * 10);
                            const dec2 = Math.floor(Math.random() * 10);
                            const num1 = parseFloat(`${a}.${dec1}`);
                            const num2 = parseFloat(`${b}.${dec2}`);
                            question = `${num1.toFixed(1)} × ${num2.toFixed(1)} =`;
                            answer = num1 * num2;
                        } else {
                            // 一位小数除法（结果为整数或一位小数）
                            const a = Math.floor(Math.random() * 9) + 1;
                            const b = Math.floor(Math.random() * 9) + 1;
                            const dec = Math.floor(Math.random() * 10);
                            const num1 = parseFloat(`${a}.${dec}`);
                            question = `${(num1 * b).toFixed(1)} ÷ ${num1.toFixed(1)} =`;
                            answer = b;
                        }
                    }
                } else if (subGrade === 'comprehensive') {
                    // 综合练习：小数混合运算、分数的加减运算
                    if (Math.random() > 0.5) {
                        // 小数的混合运算
                        const a = (Math.random() * 10).toFixed(1);
                        const b = (Math.random() * 10).toFixed(1);
                        const c = (Math.random() * 10).toFixed(1);
                        if (Math.random() > 0.5) {
                            question = `${a} × ${b} + ${c} =`;
                            answer = parseFloat(a) * parseFloat(b) + parseFloat(c);
                        } else {
                            question = `${a} × ${b} - ${c} =`;
                            answer = parseFloat(a) * parseFloat(b) - parseFloat(c);
                        }
                    } else {
                        // 分数的加减运算（同分母）
                        const denominator = Math.floor(Math.random() * 19) + 2;
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
                    }
                } else {
                    // 默认：混合练习
                    if (Math.random() > 0.6) {
                        const denominator = Math.floor(Math.random() * 19) + 2;
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
                    } else if (Math.random() > 0.4) {
                        const a = (Math.random() * 100).toFixed(2);
                        const b = (Math.random() * 100).toFixed(2);
                        question = `${a} × ${b} =`;
                        answer = parseFloat(a) * parseFloat(b);
                    } else {
                        const b = (Math.random() * 90 + 10).toFixed(2);
                        answer = (Math.random() * 9 + 1).toFixed(2);
                        const a = (parseFloat(b) * parseFloat(answer)).toFixed(2);
                        question = `${a} ÷ ${b} =`;
                    }
                }
                break;
        }
        
        questions.push({ question, answer: parseFloat(answer.toFixed(4)) });
    }
    
    return questions;
}

// 显示题目
function formatFraction(text) {
    // 将 "a/b" 格式的分数转换为竖式分数显示
    const fractionRegex = /(\d+)\/(\d+)/g;
    return text.replace(fractionRegex, '<span class="fraction"><span class="numerator">$1</span><span class="fraction-line"></span><span class="denominator">$2</span></span>');
}

function displayQuestions(grade, key = grade) {
    const container = document.getElementById('questions-container');
    console.log('displayQuestions key:', key);
    console.log('gradeQuestions[key]:', gradeQuestions[key]);
    console.log('container:', container);
    container.innerHTML = '';
    
    if (!gradeQuestions[key] || gradeQuestions[key].length === 0) {
        console.error('题目数组为空或不存在');
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
    
    // 获取题目key（支持一年级子目录）
    const key = grade === 1 && currentSubGrade ? `${grade}-${currentSubGrade}` : grade;
    
    // 检查答案
    let correctCount = 0;
    const answerInputs = document.querySelectorAll('.answer-input');
    const totalQuestions = gradeQuestions[key].length;
    
    // 初始化错题存储
    if (!gradeWrongQuestions[key]) {
        gradeWrongQuestions[key] = [];
    }
    
    answerInputs.forEach((input, index) => {
        const userAnswer = input.value.trim();
        const correctAnswer = gradeQuestions[key][index].answer;
        
        let isCorrect = false;
        if (typeof correctAnswer === 'string') {
            // 比较大小题：答案是字符串（">"、"<"、"="）
            isCorrect = userAnswer === correctAnswer;
        } else {
            // 数字题
            const numUserAnswer = parseFloat(userAnswer);
            isCorrect = Math.abs(numUserAnswer - correctAnswer) < 0.01;
        }
        
        if (isCorrect) {
            correctCount++;
            input.classList.add('correct');
            input.classList.remove('incorrect');
        } else {
            input.classList.add('incorrect');
            input.classList.remove('correct');
            
            // 记录错题
            const question = gradeQuestions[key][index];
            gradeWrongQuestions[key].push({
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