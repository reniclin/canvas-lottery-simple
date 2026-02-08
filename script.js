/**
 * Canvas Lottery Simple - Main Logic
 */

const CONFIG = {
    // Game Rules
    MAX_WEIGHT: 999,
    TIMEOUT_ROLLING: 3000, // ms
    TIMEOUT_REVEAL: 3000,  // ms
    SHOWCASE_DURATION: 30, // frames (approx 0.5s at 60fps)

    // Physics
    PHYSICS_INTERVAL: 16, // used for base speed calculation if needed, but we use deltaTime now
    BASE_SPEED: 1.0,
    SPEED_ROLLING: 8.0,
    SPEED_SHOWCASE: 0.5,
    SPEED_REVEAL: 0.2,

    // Particles
    PARTICLE_COUNT: 100,
    PARTICLE_GRAVITY: 0.2,
};

const canvas = document.getElementById('simulation');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

let width, height;

function resizeCanvas() {
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let participants = [];
let balls = [];
let particles = [];
let winnerCount = 0;

// Game States
const STATE = {
    IDLE: 0,
    ROLLING: 1,
    SHOWCASE: 2, // 選中球飛出/放大
    REVEAL: 3    //顯示名字
};
let currentState = STATE.IDLE;
let showcaseBall = null; // store the winning ball object
let showcaseTimer = 0;

const nameInput = document.getElementById('input-name');
const weightInput = document.getElementById('input-weight');
const listEl = document.getElementById('participant-list');
const countEl = document.getElementById('count');
const ballCountEl = document.getElementById('ball-count');
const winnerListEl = document.getElementById('winner-list');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const winnerOverlay = document.getElementById('winner-overlay');

// --- Modals 邏輯 ---

// Confirm Modal (重置)
const confirmModal = document.getElementById('confirm-modal');
const modalCancelBtn = document.getElementById('modal-cancel');
const modalConfirmBtn = document.getElementById('modal-confirm');

// Alert Modal (提示)
const alertModal = document.getElementById('alert-modal');
const alertTitle = document.getElementById('alert-title');
const alertDesc = document.getElementById('alert-desc');
const alertOkBtn = document.getElementById('alert-ok');

// 封裝自訂 Alert 函式
function showCustomAlert(title, message) {
    alertTitle.innerText = title;
    alertDesc.innerText = message;
    alertModal.classList.add('active');
    alertOkBtn.focus(); // 讓焦點跑到按鈕上，方便按 Enter 關閉
}

alertOkBtn.addEventListener('click', () => {
    alertModal.classList.remove('active');
});

// 重置按鈕 -> 開啟 Confirm Modal
resetBtn.addEventListener('click', () => {
    confirmModal.classList.add('active');
});

modalCancelBtn.addEventListener('click', () => {
    confirmModal.classList.remove('active');
});

modalConfirmBtn.addEventListener('click', () => {
    executeReset();
    confirmModal.classList.remove('active');
});

// 點擊遮罩關閉任意 Modal
[confirmModal, alertModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Esc 鍵關閉任意 Modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        confirmModal.classList.remove('active');
        alertModal.classList.remove('active');
    }
});

// --- 主程式邏輯 ---

document.getElementById('add-btn').addEventListener('click', addParticipant);

nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addParticipant(); });
weightInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addParticipant(); });

function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
}

function getSecureRandomIndex(max) {
    if (max <= 0) return 0;
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const randomFloat = array[0] / (0xFFFFFFFF + 1);
    return Math.floor(randomFloat * max);
}

function addParticipant() {
    const name = nameInput.value.trim();
    let weight = parseInt(weightInput.value);

    if (!name || isNaN(weight) || weight < 1) {
        showCustomAlert("輸入錯誤", "請輸入有效的名字和權重");
        return;
    }

    if (weight > CONFIG.MAX_WEIGHT) {
        showCustomAlert("權重過大", `單人權重請勿超過 ${CONFIG.MAX_WEIGHT}`);
        return;
    }

    const id = Date.now() + Math.random();
    const color = getRandomColor();

    const newParticipant = { id, name, weight, color };
    participants.push(newParticipant);

    addBallsForParticipant(newParticipant);
    renderList();

    nameInput.value = '';
    weightInput.value = '1';
    nameInput.focus();
}

function removeParticipant(id) {
    participants = participants.filter(p => p.id !== id);
    balls = balls.filter(b => b.ownerId !== id);
    resizeBalls();
    renderList();
}

function executeReset() {
    participants = [];
    balls = [];
    winnerCount = 0;
    currentState = STATE.IDLE;
    showcaseBall = null;

    listEl.innerHTML = '';
    winnerListEl.innerHTML = '';
    countEl.innerText = '0';
    ballCountEl.innerText = '0';
    nameInput.value = '';
    weightInput.value = '1';

    startBtn.disabled = false;
    startBtn.innerText = "開始抽球 (Start)";

    winnerOverlay.style.opacity = 0;
    winnerOverlay.innerText = "WINNER";
    winnerOverlay.style.transform = "translate(-50%, -50%) scale(0.5)";
}

function renderList() {
    listEl.innerHTML = '';
    countEl.innerText = participants.length;
    ballCountEl.innerText = balls.length;

    participants.forEach(p => {
        const div = document.createElement('div');
        div.className = 'list-item';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'participant-info';

        const colorDot = document.createElement('span');
        colorDot.className = 'color-dot';
        colorDot.style.backgroundColor = p.color;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = p.name;

        const weightSpan = document.createElement('span');
        weightSpan.style.color = '#888';
        weightSpan.style.fontSize = '0.8em';
        weightSpan.textContent = `x${p.weight}`;

        infoDiv.appendChild(colorDot);
        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(weightSpan);

        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.onclick = () => removeParticipant(p.id);

        div.appendChild(infoDiv);
        div.appendChild(deleteBtn);

        listEl.appendChild(div);
    });
}

function addWinnerToList(name, color) {
    winnerCount++;
    const div = document.createElement('div');
    div.className = 'winner-item';
    div.style.borderLeftColor = color;
    // A11y: Let screen readers know about the new winner
    div.setAttribute('role', 'status');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;

    const rankSpan = document.createElement('span');
    rankSpan.className = 'winner-rank';
    rankSpan.textContent = `#${winnerCount}`;

    div.appendChild(nameSpan);
    div.appendChild(rankSpan);

    // 最新獲獎者排在最下方 (1, 2, 3...)
    winnerListEl.appendChild(div);
    winnerListEl.scrollTop = winnerListEl.scrollHeight;
}

function getOptimalRadius() {
    const totalBalls = balls.length;
    if (totalBalls < 50) return 12;
    if (totalBalls < 200) return 10;
    if (totalBalls < 500) return 8;
    if (totalBalls < 1000) return 6;
    return 5;
}

function resizeBalls() {
    const newRadius = getOptimalRadius();
    balls.forEach(ball => ball.radius = newRadius);
}

function addBallsForParticipant(p) {
    for (let i = 0; i < p.weight; i++) {
        balls.push({
            x: Math.random() * (width - 20) + 10,
            y: Math.random() * (height - 20) + 10,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            radius: 10,
            color: p.color,
            ownerId: p.id,
            ownerName: p.name
        });
    }
    resizeBalls();
}

function updatePhysics(deltaTime) {
    // Normalize speed: 60fps ~ 16.6ms
    // If deltaTime is 16.6ms, timeScale should be 1.0
    const timeScale = deltaTime / 16.6;

    // Speed multiplier based on state
    let stateSpeed = CONFIG.BASE_SPEED;
    if (currentState === STATE.ROLLING) stateSpeed = CONFIG.SPEED_ROLLING; // Faster rolling
    if (currentState === STATE.SHOWCASE) stateSpeed = CONFIG.SPEED_SHOWCASE; // Slow down background
    if (currentState === STATE.REVEAL) stateSpeed = CONFIG.SPEED_REVEAL; // Very slow background

    const moveStep = stateSpeed * timeScale;

    balls.forEach(ball => {
        // If in SHOWCASE state, handle the winning ball separately
        if (currentState === STATE.SHOWCASE && ball === showcaseBall) {
            // Interpolate position to center
            const targetX = width / 2;
            const targetY = height / 2;
            ball.x += (targetX - ball.x) * 0.1 * timeScale;
            ball.y += (targetY - ball.y) * 0.1 * timeScale;

            // Interpolate size
            const targetRadius = Math.min(width, height) / 4;
            ball.radius += (targetRadius - ball.radius) * 0.1 * timeScale;

            // Keep velocity 0 to prevent drift
            ball.vx = 0;
            ball.vy = 0;
            return;
        }

        // Normal physics for other balls
        ball.x += ball.vx * moveStep;
        ball.y += ball.vy * moveStep;

        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx *= -1;
        } else if (ball.x + ball.radius > width) {
            ball.x = width - ball.radius;
            ball.vx *= -1;
        }

        if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.vy *= -1;
        } else if (ball.y + ball.radius > height) {
            ball.y = height - ball.radius;
            ball.vy *= -1;
        }
    });

    // Transition logic for SHOWCASE -> REVEAL
    if (currentState === STATE.SHOWCASE && showcaseBall) {
        showcaseTimer += 1 * timeScale;
        if (showcaseTimer > CONFIG.SHOWCASE_DURATION) {
            currentState = STATE.REVEAL;
            revealWinner();
            createParticles(width / 2, height / 2); // Spawn confetti
        }
    }

    // Update particles - Reverse loop for safe removal
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;
        p.vy += CONFIG.PARTICLE_GRAVITY * timeScale; // gravity
        p.life -= 1 * timeScale;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function createParticles(x, y) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 100 + Math.random() * 50,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            size: Math.random() * 5 + 2
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw other balls first (background)
    balls.forEach(ball => {
        if (ball === showcaseBall) return; // Draw winner last

        ctx.globalAlpha = (currentState === STATE.SHOWCASE || currentState === STATE.REVEAL) ? 0.2 : 1.0;

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();

        if (ball.radius > 6) { // shine effect
            ctx.beginPath();
            ctx.arc(ball.x - ball.radius / 3, ball.y - ball.radius / 3, ball.radius / 3, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.fill();
        }
    });

    ctx.globalAlpha = 1.0; // Reset alpha

    // Draw winning ball on top
    if (showcaseBall) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "rgba(0,0,0,0.5)";

        ctx.beginPath();
        ctx.arc(showcaseBall.x, showcaseBall.y, showcaseBall.radius, 0, Math.PI * 2);
        ctx.fillStyle = showcaseBall.color;
        ctx.fill();

        // Shine
        ctx.beginPath();
        ctx.arc(showcaseBall.x - showcaseBall.radius / 3, showcaseBall.y - showcaseBall.radius / 3, showcaseBall.radius / 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fill();

        ctx.shadowBlur = 0; // Reset shadow
    }

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    if (balls.length === 0 && participants.length === 0) {
        ctx.fillStyle = "#ccc";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("等待加入...", width / 2, height / 2);
    } else if (balls.length === 0 && participants.length > 0 && currentState === STATE.IDLE) {
        ctx.fillStyle = "#ccc";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("球已抽完", width / 2, height / 2);
    }
}

// Game Loop with requestAnimationFrame
let lastTime = 0;
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    updatePhysics(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Start Loop
requestAnimationFrame(gameLoop);


startBtn.addEventListener('click', () => {
    if (balls.length === 0) {
        showCustomAlert("無法開始", "箱子裡沒有球了！");
        return;
    }

    if (currentState !== STATE.IDLE) return;

    currentState = STATE.ROLLING;
    startBtn.disabled = true;
    startBtn.innerText = "滾動中...";
    winnerOverlay.style.opacity = 0;
    showcaseBall = null;

    setTimeout(() => {
        selectWinner();
    }, CONFIG.TIMEOUT_ROLLING);
});

function selectWinner() {
    const winningBallIndex = getSecureRandomIndex(balls.length);
    showcaseBall = balls[winningBallIndex];

    // Bring winning ball to front artificially by moving to end of array (optional, but render handles it)
    // Start showcase animation
    currentState = STATE.SHOWCASE;
    showcaseTimer = 0;
}

function revealWinner() {
    const winnerName = showcaseBall.ownerName;
    const winnerColor = showcaseBall.color;
    const winnerId = showcaseBall.ownerId;

    // Show Overlay
    winnerOverlay.innerText = winnerName;
    winnerOverlay.style.color = winnerColor;
    winnerOverlay.style.textShadow = `3px 3px 0 #fff, -3px -3px 0 #fff, 3px -3px 0 #fff, -3px 3px 0 #fff`;
    winnerOverlay.style.opacity = 1;
    winnerOverlay.style.transform = "translate(-50%, -50%) scale(1.5)"; // Zoom in text

    addWinnerToList(winnerName, winnerColor);

    // Wait then cleanup
    setTimeout(() => {
        // Remove winning ball and all other balls of same owner
        balls = balls.filter(b => b.ownerId !== winnerId);
        removeParticipant(winnerId);

        resizeBalls();

        currentState = STATE.IDLE;
        showcaseBall = null;
        startBtn.disabled = false;
        startBtn.innerText = "開始抽球 (Start)";

        winnerOverlay.style.opacity = 0; // Hide overlay
        winnerOverlay.style.transform = "translate(-50%, -50%) scale(0.5)"; // Reset scale
    }, CONFIG.TIMEOUT_REVEAL);
}

// --- iOS Safari Zoom Prevention ---
// Safari ignores user-scalable=no, so we must use JS events.
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

document.addEventListener('gesturechange', function (e) {
    e.preventDefault();
});

document.addEventListener('gestureend', function (e) {
    e.preventDefault();
});
