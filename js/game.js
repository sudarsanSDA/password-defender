document.addEventListener('DOMContentLoaded', () => {
    // --- Element Helper ---
    const getEl = (id) => document.getElementById(id);

    // --- Screen & UI Elements ---
    const screens = { intro: getEl('intro-screen'), mainMenu: getEl('main-menu-screen'), game: getEl('game-screen'), levelComplete: getEl('level-complete-screen'), gameOver: getEl('game-over-screen') };
    const passwordInput = getEl('password-input'), defendBtn = getEl('defend-btn'), castleContainer = getEl('castle-container'), shieldsContainer = getEl('shields-container'), gameWorld = getEl('game-world');
    const levelSelectContainer = getEl('level-select-container'), waveDisplay = getEl('wave-display'), starRating = getEl('star-rating');
    const levelTitleDisplay = getEl('level-title-display'), levelInstructionsDisplay = getEl('level-instructions-display'), messageDisplay = getEl('message-display'), levelHighscoreDisplay = getEl('level-highscore-display');
    
    // --- Game Config & State ---
    const WAVES_PER_LEVEL = 3;
    const LEVELS = [
        { title: "Protocol Alpha", instructions: "Use 4+ lowercase letters.", regex: /^[a-z]{4,}$/ },
        { title: "Protocol Beta", instructions: "Add a capital letter (6+ total).", regex: /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/ },
        { title: "Protocol Gamma", instructions: "Include a number (8+ total).", regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/ },
        { title: "Protocol Delta", instructions: "Add a special character (!@#$)", regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$]).{10,}$/ },
        { title: "Citadel Protocol", instructions: "Ultimate defense: 12+ characters.", regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$]).{12,}$/ },
    ];
    let isAttacking = false, currentLevelIndex = 0, currentWave = 0, failedAttempts = 0;
    let unlockedLevel = 1, highScores = [0,0,0,0,0];

    // --- SVG Templates ---
    const HACKER_SVG = () => `<svg viewBox="0 0 100 100"><defs><linearGradient id="h-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A8A"/><stop offset="100%" stop-color="#FF4040"/></linearGradient></defs><g transform="rotate(45 50 50)" style="filter: drop-shadow(0 0 5px var(--c-hacker))"><polygon points="50,0 100,50 50,100 0,50" fill="url(#h-g)"/><polygon points="50,15 85,50 50,85 15,50" fill="#200" opacity="0.5"/><polygon points="50,25 75,50 50,75 25,50" fill="var(--c-hacker)"/></g></svg>`;
    const SHIELD_SVG = (i) => `<svg viewBox="0 0 200 200" style="animation-duration: ${15+i*5}s; transform: scale(${1-i*0.2})"><defs><filter id="shield-glow"><feGaussianBlur stdDeviation="3.5"/></filter></defs><circle cx="100" cy="100" r="${80-i*15}" fill="none" stroke="var(--c-shield)" stroke-width="5" stroke-opacity="0.8" filter="url(#shield-glow)"/><circle cx="100" cy="100" r="${80-i*15}" fill="var(--c-shield)" fill-opacity="${0.15-i*0.05}"/></svg>`;

    // --- Core Game Flow ---
    const init = () => { loadGameState(); createStars(15); showScreen('intro'); };
    const startGame = (levelIndex) => { currentLevelIndex = levelIndex; currentWave = 0; failedAttempts = 0; showScreen('game'); startNextWave(); };
    const startNextWave = () => { resetForWave(); updateGameUI(); isAttacking = false; [defendBtn, passwordInput].forEach(el => el.disabled = false); passwordInput.focus(); };
    
    const runAttackSequence = () => {
        if(isAttacking) return; isAttacking = true;
        [defendBtn, passwordInput].forEach(el => el.disabled = true);
        const isSuccess = LEVELS[currentLevelIndex].regex.test(passwordInput.value);
        if(!isSuccess) failedAttempts++;
        
        displayShields(isSuccess); createHackers(currentLevelIndex + 2);
        setTimeout(() => fireLasers(isSuccess), 2500);
        setTimeout(() => handleAttackOutcome(isSuccess), 2900);
    };

    const handleAttackOutcome = (isSuccess) => {
        if (isSuccess) {
            showMessage("WAVE CLEARED!"); currentWave++; updateGameUI();
            if (currentWave >= WAVES_PER_LEVEL) { setTimeout(completeLevel, 1500); } 
            else { setTimeout(startNextWave, 1500); }
        } else {
            showMessage("PROTOCOL FAILED!", true);
            castleContainer.classList.add('damage'); document.querySelectorAll('.shield').forEach(s => s.classList.add('shatter'));
            setTimeout(() => castleContainer.classList.remove('damage'), 400);
            if (failedAttempts < 3) { setTimeout(startNextWave, 2000); } 
            else { setTimeout(() => showScreen('gameOver'), 1500); }
        }
    };
    
    const completeLevel = () => {
        const stars = Math.max(1, 3 - failedAttempts);
        const score = stars * (currentLevelIndex + 1) * 100;
        if (score > highScores[currentLevelIndex]) highScores[currentLevelIndex] = score;
        if (currentLevelIndex + 2 > unlockedLevel) unlockedLevel = currentLevelIndex + 2;
        saveGameState();
        
        starRating.innerHTML = '<span class="star filled">★</span>'.repeat(stars) + '<span class="star">★</span>'.repeat(3 - stars);
        levelHighscoreDisplay.textContent = highScores[currentLevelIndex];
        getEl('next-level-btn').style.display = currentLevelIndex >= LEVELS.length - 1 ? 'none' : 'block';
        showScreen('levelComplete');
    };

    // --- Screen & UI Management ---
    const showScreen = (screenName) => { Object.values(screens).forEach(s => s.classList.add('hidden')); screens[screenName].classList.remove('hidden'); if(screenName !== 'game') screens[screenName].classList.add('visible'); if (screenName === 'mainMenu') renderMainMenu(); };
    const renderMainMenu = () => {
        levelSelectContainer.innerHTML = '';
        LEVELS.forEach((level, index) => {
            const isUnlocked = index < unlockedLevel;
            const starsAchieved = Math.floor(highScores[index] / ((index + 1) * 100));
            const starHTML = '★'.repeat(starsAchieved) + '☆'.repeat(3 - starsAchieved);
            const btn = document.createElement('button');
            btn.className = `level-btn ${isUnlocked ? 'unlocked' : 'locked'}`;
            btn.innerHTML = `<span class="level-number">${index + 1}</span><span class="level-stars">${highScores[index] > 0 ? starHTML : ''}</span>`;
            if (isUnlocked) btn.onclick = () => startGame(index);
            levelSelectContainer.appendChild(btn);
        });
    };
    const updateGameUI = () => {
        levelTitleDisplay.textContent = LEVELS[currentLevelIndex].title;
        levelInstructionsDisplay.textContent = LEVELS[currentLevelIndex].instructions;
        let waveHTML = '';
        for (let i = 0; i < WAVES_PER_LEVEL; i++) waveHTML += `<div class="wave-dot ${i < currentWave ? 'cleared' : (i === currentWave ? 'active' : '')}"></div>`;
        waveDisplay.innerHTML = waveHTML;
    };
    const showMessage = (text, isError=false) => { messageDisplay.textContent = text; messageDisplay.style.color = isError ? 'var(--c-hacker)' : 'var(--c-shield)'; messageDisplay.classList.add('visible'); setTimeout(() => messageDisplay.classList.remove('visible'), 1500); };
    const resetForWave = () => { document.querySelectorAll('.hacker, .laser-beam, .impact-spark').forEach(el => el.remove()); shieldsContainer.innerHTML = ''; passwordInput.value = ''; };

    // --- Data Persistence ---
    const saveGameState = () => localStorage.setItem('pwdGameState', JSON.stringify({ unlockedLevel, highScores }));
    const loadGameState = () => { const state = JSON.parse(localStorage.getItem('pwdGameState')); if (state) { unlockedLevel = state.unlockedLevel || 1; highScores = state.highScores || [0,0,0,0,0]; } };
    
    // --- VFX & Animations ---
    const fireLasers = (isSuccess) => {
        document.querySelectorAll('.hacker').forEach(hacker => {
            const castleRect = castleContainer.getBoundingClientRect();
            const castleCenter = { x: castleRect.left + castleRect.width / 2, y: castleRect.top + castleRect.height / 2 };
            const hackerRect = hacker.getBoundingClientRect();
            const hackerCenter = { x: hackerRect.left + hackerRect.width / 2, y: hackerRect.top + hackerRect.height / 2 };
            
            const dx = castleCenter.x - hackerCenter.x, dy = castleCenter.y - hackerCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy), angle = Math.atan2(dy, dx) * 180 / Math.PI;

            const laser = document.createElement('div');
            laser.className = 'laser-beam';
            laser.style.cssText = `left: ${hackerCenter.x}px; top: ${hackerCenter.y}px; width: ${distance}px; transform: rotate(${angle}deg);`;
            gameWorld.appendChild(laser); // Add to world layer

            if (!isSuccess) {
                const spark = document.createElement('div');
                spark.className = 'impact-spark';
                spark.style.cssText = `left: ${castleCenter.x}px; top: ${castleCenter.y}px;`;
                gameWorld.appendChild(spark);
                setTimeout(() => spark.remove(), 400);
            }
            setTimeout(() => laser.remove(), 400);
        });
    };
    const displayShields = (success) => { shieldsContainer.innerHTML = ''; if (success) for(let i=0; i<3; i++) { const d = document.createElement('div'); d.className='shield'; d.innerHTML = SHIELD_SVG(i); shieldsContainer.appendChild(d); } };
    const createHackers = (count) => { for(let i=0; i<count; i++) setTimeout(() => { const h=document.createElement('div'); h.className='hacker'; h.style.top=`${10+Math.random()*25}%`; h.style.animationDelay=`${Math.random()*2}s`; h.innerHTML=HACKER_SVG(); gameWorld.appendChild(h); setTimeout(() => h.classList.add('attack'), 50)}, i*250); };
    const createStars = (count) => { for(let i=0; i<count; i++) { const s = document.createElement('div'); s.className='shooting-star'; s.style.left=`${Math.random()*100}%`; s.style.top=`${Math.random()*100}%`; s.style.animationDelay=`${Math.random()*10}s`; getEl('game-background').appendChild(s) } };
    
    // --- Button Event Listeners ---
    getEl('start-btn').onclick = () => showScreen('mainMenu');
    defendBtn.onclick = runAttackSequence;
    getEl('replay-btn').onclick = () => startGame(currentLevelIndex);
    getEl('next-level-btn').onclick = () => startGame(currentLevelIndex + 1);
    document.querySelectorAll('#main-menu-btn-from-win, #main-menu-btn-from-lose').forEach(btn => btn.onclick = () => showScreen('mainMenu'));
    
    init(); // Start the game!
});