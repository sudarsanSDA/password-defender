document.addEventListener('DOMContentLoaded', () => {
    const getEl = (id) => document.getElementById(id);
    // --- Screens ---
    const gameContainer = getEl('game-container'), introScreen = getEl('intro-screen'), mainMenuScreen = getEl('main-menu-screen'), gameScreen = getEl('game-screen'), levelCompleteScreen = getEl('level-complete-screen'), gameOverScreen = getEl('game-over-screen');
    // --- Buttons ---
    const startBtn = getEl('start-btn'), defendBtn = getEl('defend-btn'), replayBtn = getEl('replay-btn'), nextLevelBtn = getEl('next-level-btn');
    // --- Dynamic Displays ---
    const passwordInput = getEl('password-input'), levelSelectContainer = getEl('level-select-container'), castleContainer = getEl('castle-container'), shieldsContainer = getEl('shields-container'), gameBackground = getEl('game-background');
    const levelTitleDisplay = getEl('level-title-display'), waveDisplay = getEl('wave-display'), levelInstructionsDisplay = getEl('level-instructions-display'), messageDisplay = getEl('message-display');
    const starRating = getEl('star-rating'), levelHighscoreDisplay = getEl('level-highscore-display'), finalScore = getEl('final-score');
    
    // --- Game Config ---
    const WAVES_PER_LEVEL = 3;
    const LEVELS = [
        { title: "Protocol Alpha", instructions: "Use 4+ lowercase letters.", regex: /^[a-z]{4,}$/ },
        { title: "Protocol Beta", instructions: "Add a capital letter (6+ total).", regex: /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/ },
        { title: "Protocol Gamma", instructions: "Include a number (8+ total).", regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/ },
        { title: "Protocol Delta", instructions: "Add a special character (!@#$)", regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$]).{10,}$/ },
        { title: "Citadel Protocol", instructions: "Ultimate defense: 12+ characters.", regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$]).{12,}$/ },
    ];
    // --- Game State ---
    let isAttacking = false, currentLevelIndex = 0, currentWave = 0, attemptsThisLevel = 0;
    let unlockedLevel = 1, highScores = [0,0,0,0,0];

    // --- Core Game Flow ---
    const init = () => { loadGameState(); createStars(15); showScreen('intro'); };
    const startGame = (levelIndex) => {
        currentLevelIndex = levelIndex; currentWave = 0; attemptsThisLevel = 0;
        showScreen('game');
        startNextWave();
    };
    const startNextWave = () => {
        resetForWave(); updateGameUI();
        isAttacking = false; [defendBtn, passwordInput].forEach(el => el.disabled = false); passwordInput.focus();
    };
    const runAttackSequence = () => {
        if(isAttacking) return; isAttacking = true;
        [defendBtn, passwordInput].forEach(el => el.disabled = true);
        const isSuccess = LEVELS[currentLevelIndex].regex.test(passwordInput.value);
        attemptsThisLevel += isSuccess ? 0 : 1;
        
        displayShields(isSuccess); createHackers(currentLevelIndex + 2);
        setTimeout(() => fireLasers(isSuccess), 2500);
        setTimeout(() => handleAttackOutcome(isSuccess), 2800);
    };
    const handleAttackOutcome = (isSuccess) => {
        if (isSuccess) {
            showMessage("WAVE CLEARED!"); currentWave++; updateGameUI();
            if (currentWave >= WAVES_PER_LEVEL) { setTimeout(completeLevel, 1500); } 
            else { setTimeout(startNextWave, 1500); }
        } else {
            showMessage("RETRY WAVE!", true); setTimeout(startNextWave, 2000);
        }
    };
    const completeLevel = () => {
        const stars = Math.max(1, 3 - attemptsThisLevel);
        const score = stars * (currentLevelIndex + 1) * 100;
        if (score > highScores[currentLevelIndex]) { highScores[currentLevelIndex] = score; }
        if (currentLevelIndex + 2 > unlockedLevel) { unlockedLevel = currentLevelIndex + 2; }
        saveGameState();
        
        starRating.innerHTML = '★'.repeat(stars) + '<span class="star">☆</span>'.repeat(3-stars);
        levelHighscoreDisplay.textContent = highScores[currentLevelIndex];
        nextLevelBtn.style.display = currentLevelIndex >= LEVELS.length - 1 ? 'none' : 'block';
        showScreen('level-complete');
    };

    // --- Screen Management ---
    const showScreen = (screenName) => {
        [introScreen, mainMenuScreen, gameScreen, levelCompleteScreen, gameOverScreen].forEach(s => s.classList.add('hidden', 'overlay'));
        gameScreen.classList.add('hidden'); // Ensure game is hidden if it's not the target
        
        const screenToShow = getEl(`${screenName}-screen`);
        if (screenToShow.classList.contains('overlay')) {
             screenToShow.classList.remove('hidden'); screenToShow.classList.add('visible');
        } else {
             screenToShow.classList.remove('hidden');
        }

        if (screenName === 'main-menu') renderMainMenu();
    };
    const renderMainMenu = () => {
        levelSelectContainer.innerHTML = '';
        LEVELS.forEach((level, index) => {
            const isUnlocked = index < unlockedLevel;
            const stars = highScores[index] > 0 ? '★'.repeat(Math.max(1, 3 - Math.floor(highScores[index] / ((index + 1) * 100) / 100))) : '';
            const btn = document.createElement('button');
            btn.className = `level-btn ${isUnlocked ? 'unlocked' : 'locked'}`;
            btn.innerHTML = `<span class="level-number">${index + 1}</span><span class="level-stars">${stars}</span>`;
            if (isUnlocked) btn.onclick = () => startGame(index);
            levelSelectContainer.appendChild(btn);
        });
    };
    
    // --- UI & State Updates ---
    const updateGameUI = () => {
        levelTitleDisplay.textContent = `Protocol: ${LEVELS[currentLevelIndex].title}`;
        levelInstructionsDisplay.textContent = LEVELS[currentLevelIndex].instructions;
        let waveHTML = '';
        for (let i = 0; i < WAVES_PER_LEVEL; i++) {
            let state = i < currentWave ? 'cleared' : (i === currentWave ? 'active' : '');
            waveHTML += `<div class="wave-dot ${state}"></div>`;
        }
        waveDisplay.innerHTML = waveHTML;
    };
    const showMessage = (text, isError=false) => { messageDisplay.textContent = text; if(isError) messageDisplay.style.color = 'var(--c-hacker)'; else messageDisplay.style.color = 'var(--c-shield)'; messageDisplay.classList.add('visible'); setTimeout(()=>messageDisplay.classList.remove('visible'), 1500); };
    const resetForWave = () => { document.querySelectorAll('.hacker').forEach(h => h.remove()); shieldsContainer.innerHTML = ''; passwordInput.value = ''; };

    // --- Data Persistence ---
    const saveGameState = () => { localStorage.setItem('pwdGameState', JSON.stringify({ unlockedLevel, highScores })); };
    const loadGameState = () => { const state = JSON.parse(localStorage.getItem('pwdGameState')); if (state) { unlockedLevel = state.unlockedLevel || 1; highScores = state.highScores || [0,0,0,0,0]; } };
    
    // --- Event Listeners ---
    startBtn.onclick = () => showScreen('main-menu');
    defendBtn.onclick = runAttackSequence;
    replayBtn.onclick = () => startGame(currentLevelIndex);
    nextLevelBtn.onclick = () => startGame(currentLevelIndex + 1);
    document.querySelectorAll('#main-menu-btn-from-win, #main-menu-btn-from-lose').forEach(btn => btn.onclick = () => showScreen('main-menu'));
    
    // --- Visual Effects (No logic changes) ---
    const fireLasers=(s)=>{const h=document.querySelectorAll('.hacker'),c=castleContainer.getBoundingClientRect(),cc={x:c.left+c.width/2,y:c.top+c.height/2};h.forEach(k=>{const r=k.getBoundingClientRect(),hc={x:r.left+r.width/2,y:r.top+r.height/2},dx=cc.x-hc.x,dy=cc.y-hc.y,d=Math.sqrt(dx*dx+dy*dy),a=Math.atan2(dy,dx)*180/Math.PI,l=document.createElement('div');l.className='laser-beam';l.style.left=`${hc.x}px`;l.style.top=`${hc.y-1}px`;l.style.width=`${d}px`;l.style.transform=`rotate(${a}deg)`;gameContainer.appendChild(l);if(!s){const p=document.createElement('div');p.className='impact-spark';p.style.left=`${cc.x}px`;p.style.top=`${cc.y}px`;gameContainer.appendChild(p);setTimeout(()=>p.remove(),300)}setTimeout(()=>l.remove(),300)})};const displayShields=(s)=>{if(!s)return;shieldsContainer.innerHTML='';for(let i=0;i<3;i++){const d=document.createElement('div');d.className='shield';d.innerHTML=SHIELD_SVG(i);shieldsContainer.appendChild(d)}};const createHackers=(c)=>{for(let i=0;i<c;i++)setTimeout(()=>{const h=document.createElement('div');h.className='hacker';h.style.top=`${10+Math.random()*25}%`;h.style.animationDelay=`${Math.random()*2}s`;h.innerHTML=HACKER_SVG();gameContainer.appendChild(h);setTimeout(()=>h.classList.add('attack'),50)},i*250)};const createStars=(c)=>{for(let i=0;i<c;i++){const s=document.createElement('div');s.className='shooting-star';s.style.left=`${Math.random()*100}%`;s.style.top=`${Math.random()*100}%`;s.style.animationDelay=`${Math.random()*10}s`;gameBackground.appendChild(s)}};const HACKER_SVG = () => `<svg viewBox="0 0 100 100"><defs><linearGradient id="h-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A8A"/><stop offset="100%" stop-color="#FF4040"/></linearGradient></defs><g transform="rotate(45 50 50)" style="filter: drop-shadow(0 0 5px var(--c-hacker))"><polygon points="50,0 100,50 50,100 0,50" fill="url(#h-g)"/><polygon points="50,15 85,50 50,85 15,50" fill="#200" opacity="0.5"/><polygon points="50,25 75,50 50,75 25,50" fill="var(--c-hacker)"/></g></svg>`;const SHIELD_SVG = (i) => `<svg viewBox="0 0 200 200" style="animation-duration: ${15+i*5}s; transform: scale(${1-i*0.2})"><defs><filter id="shield-glow"><feGaussianBlur stdDeviation="3.5"/></filter></defs><circle cx="100" cy="100" r="${80-i*15}" fill="none" stroke="var(--c-shield)" stroke-width="5" stroke-opacity="0.8" filter="url(#shield-glow)"/><circle cx="100" cy="100" r="${80-i*15}" fill="var(--c-shield)" fill-opacity="${0.15-i*0.05}"/></svg>`;

    init(); // Start the game!
});