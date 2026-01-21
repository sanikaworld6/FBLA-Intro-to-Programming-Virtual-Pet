// ============================================================
// GLOBAL VARIABLES & STATE
// ============================================================

// Pet creation data
let petName = '';
let petType = '';

// Player economy system
let player = {
    money: parseInt(localStorage.getItem('playerMoney')) || 100,
    spent: parseInt(localStorage.getItem('playerSpent')) || 0
};

// Cost for each action (in dollars)
const actionCosts = {
    'clean': 5,
    'feed': 10,
    'vet': 50,
    'play': 0,
    'rest': 0,
    'competition': 0
};

// Pet stat values (0-10 scale)
let pet = {
    rest: 5,        // Used by play action
    health: 5,      // Used by rest/vet actions (displayed as "Rest" need)
    play: 5,        // Play stat
    feed: 5,        // Food stat
    clean: 5        // Cleanliness stat
};

// ============================================================
// STAT DECAY SYSTEM - Stats decrease over time
// ============================================================

// Timer references for stat decay
let healthDecayTimer = null;
let cleanDecayTimer = null;

// Start automatic stat decay on home page
function startStatDecay() {
    // Stop existing timers if any
    if (healthDecayTimer) clearInterval(healthDecayTimer);
    if (cleanDecayTimer) clearInterval(cleanDecayTimer);
    
    // Health & feed decrease every 15 seconds
    healthDecayTimer = setInterval(function() {
        pet.health = Math.max(0, pet.health - 1);
        pet.feed = Math.max(0, pet.feed - 1);
        savePetStats();
        updatePetImageBasedOnStatsHome();
        console.log('Stat decay: Health and Feed decreased');
    }, 15000);
    
    // Clean decreases every 20 seconds
    cleanDecayTimer = setInterval(function() {
        pet.clean = Math.max(0, pet.clean - 1);
        savePetStats();
        updatePetImageBasedOnStatsHome();
        console.log('Stat decay: Clean decreased');
    }, 20000);
}

// Stop all stat decay timers (used when leaving home page)
function stopStatDecay() {
    if (healthDecayTimer) clearInterval(healthDecayTimer);
    if (cleanDecayTimer) clearInterval(cleanDecayTimer);
    healthDecayTimer = null;
    cleanDecayTimer = null;
}

// ============================================================
// STORAGE FUNCTIONS - Save/Load pet data from localStorage
// ============================================================

// Load all pet stats from browser storage
function loadPetStats() {
    const savedRest = localStorage.getItem('petRest');
    const savedHealth = localStorage.getItem('petHealth');
    const savedPlay = localStorage.getItem('petPlay');
    const savedFeed = localStorage.getItem('petFeed');
    const savedClean = localStorage.getItem('petClean');
    
    if (savedRest !== null) pet.rest = parseInt(savedRest);
    if (savedHealth !== null) pet.health = parseInt(savedHealth);
    if (savedPlay !== null) pet.play = parseInt(savedPlay);
    if (savedFeed !== null) pet.feed = parseInt(savedFeed);
    if (savedClean !== null) pet.clean = parseInt(savedClean);
}

// Save all pet stats to browser storage
function savePetStats() {
    localStorage.setItem('petRest', pet.rest);
    localStorage.setItem('petHealth', pet.health);
    localStorage.setItem('petPlay', pet.play);
    localStorage.setItem('petFeed', pet.feed);
    localStorage.setItem('petClean', pet.clean);
}

// Reset pet stats to default values (called when starting a new game)
function resetPetStats() {
    pet.rest = 5;
    pet.health = 5;
    pet.play = 5;
    pet.feed = 5;
    pet.clean = 5;
    savePetStats();
}

// ============================================================
// ACTION SYSTEM - Main gameplay mechanics
// ============================================================

// Execute action: deduct cost, modify stats, update display
function performAction(actionName) {
    const cost = actionCosts[actionName] || 0;
    
    // Check if player can afford this action
    if (player.money < cost) {
        alert(`Not enough money! Cost: $${cost}, Available: $${player.money}`);
        return false;
    }
    
    // Deduct money
    player.money -= cost;
    player.spent += cost;
    
    // Update pet stats based on action type
    switch(actionName) {
        case 'play':
            pet.play = Math.min(10, pet.play + 1);
            pet.rest = Math.max(0, pet.rest - 1);
            pet.clean = Math.max(0, pet.clean - 1);
            break;
        case 'feed':
            pet.feed = Math.min(10, pet.feed + 1);
            break;
        case 'clean':
            pet.clean = Math.min(10, pet.clean + 1);
            break;
        case 'rest':
            pet.health = Math.min(10, pet.health + 1);
            break;
        case 'vet':
            pet.health = Math.min(10, pet.health + 3);
            break;
    }
    
    // Save progress
    localStorage.setItem('playerMoney', player.money);
    localStorage.setItem('playerSpent', player.spent);
    savePetStats();
    updateMoneyDisplay();
    
    console.log(`${actionName} performed. Cost: $${cost}. Money left: $${player.money}`);
    console.log(`Pet stats - Rest: ${pet.rest}, Health: ${pet.health}, Play: ${pet.play}, Feed: ${pet.feed}, Clean: ${pet.clean}`);
    
    // Update pet image and progress bars
    updatePetImageBasedOnStatsAction(actionName);
    updateActionPageProgressBar(actionName);
    
    // Update speech bubble on home page if needed
    const moneyDisplay = document.getElementById('moneyDisplay');
    if (moneyDisplay) {
        updatePetImageBasedOnStatsHome();
    }
    
    return true;
}

// Perform competition with special requirements and rewards
function performCompetition() {
    loadPetStats();
    
    // Check if pet is well-rested (rest > 4 required)
    if (pet.rest <= 4) {
        alert(`Competition failed!\nRequirements:\nRest >4 (current: ${pet.rest})`);
        return false;
    }
    
    // Deduct stats from competition effort
    pet.feed = Math.max(0, pet.feed - 3);
    pet.health = Math.max(0, pet.health - 2);
    pet.clean = Math.max(0, pet.clean - 4);
    
    // Award prize money
    earnMoney(100);
    savePetStats();
    
    // Update visuals
    updatePetImageBasedOnStatsAction('competition');
    updateActionPageProgressBar('competition');
    
    alert(`Competition won! Earned $100\n\nUpdated Stats:\nFeed: ${pet.feed}/10\nRest: ${pet.rest}/10\nHealth: ${pet.health}/10\nClean: ${pet.clean}/10\nPlay: ${pet.play}/10`);
    
    console.log(`Competition won! Stats - Feed: ${pet.feed}, Health: ${pet.health}, Clean: ${pet.clean}`);
    return true;
}

// Add money to player account (used for competition rewards)
function earnMoney(amount) {
    player.money += amount;
    localStorage.setItem('playerMoney', player.money);
    console.log(`Earned $${amount}. Total money: $${player.money}`);
}

// Function to update progress bar on action page based on current stat
function updateActionPageProgressBar(actionName) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (!progressFill || !progressText) return;
    
    let statValue = 0;
    switch(actionName) {
        case 'play':
            statValue = pet.play;
            break;
        case 'rest':
            statValue = pet.health;
            break;
        case 'feed':
            statValue = pet.feed;
            break;
        case 'clean':
            statValue = pet.clean;
            break;
        case 'vet':
            statValue = pet.health;
            break;
        case 'competition':
            statValue = Math.floor((pet.feed + pet.rest + pet.health) / 3);
            break;
    }
    
    const percentage = (statValue / 10) * 100;
    progressFill.style.width = percentage + '%';
    progressText.textContent = statValue + '/10';
}

// Function to update all progress bars on home page
function refreshProgressBars() {
    const fillPercentage = 10; // Each stat point = 10%
    
    const playProgressFill = document.getElementById('playProgressFill');
    const restProgressFill = document.getElementById('restProgressFill');
    const vetProgressFill = document.getElementById('vetProgressFill');
    const cleanProgressFill = document.getElementById('cleanProgressFill');
    const feedProgressFill = document.getElementById('feedProgressFill');
    const competitionProgressFill = document.getElementById('competitionProgressFill');
    
    const playProgressText = document.getElementById('playProgressText');
    const restProgressText = document.getElementById('restProgressText');
    const vetProgressText = document.getElementById('vetProgressText');
    const cleanProgressText = document.getElementById('cleanProgressText');
    const feedProgressText = document.getElementById('feedProgressText');
    const competitionProgressText = document.getElementById('competitionProgressText');
    
    if (playProgressFill) playProgressFill.style.width = (pet.play * fillPercentage) + '%';
    if (playProgressText) playProgressText.textContent = pet.play + '/10';
    
    if (restProgressFill) restProgressFill.style.width = (pet.health * fillPercentage) + '%';
    if (restProgressText) restProgressText.textContent = pet.health + '/10';
    
    if (vetProgressFill) vetProgressFill.style.width = (pet.health * fillPercentage) + '%';
    if (vetProgressText) vetProgressText.textContent = pet.health + '/10';
    
    if (cleanProgressFill) cleanProgressFill.style.width = (pet.clean * fillPercentage) + '%';
    if (cleanProgressText) cleanProgressText.textContent = pet.clean + '/10';
    
    if (feedProgressFill) feedProgressFill.style.width = (pet.feed * fillPercentage) + '%';
    if (feedProgressText) feedProgressText.textContent = pet.feed + '/10';
    
    if (competitionProgressFill) competitionProgressFill.style.width = (pet.feed * fillPercentage) + '%';
    if (competitionProgressText) competitionProgressText.textContent = pet.feed + '/10';
}

// Track which needs to show in speech bubble
let needsList = [];
let lastNeedsList = [];

// Messages for each stat need
const needMessages = {
    'rest': 'I need rest',
    'feed': 'Feed me',
    'play': 'Lets play!',
    'clean': 'Clean me',
    'health': 'Achooo*'
};

// Function to update pet image on HOME page with complex mood logic
function updatePetImageBasedOnStatsHome() {
    const petImage = document.getElementById('petImage');
    const speechBubble = document.getElementById('speechBubble');
    const petType = localStorage.getItem('petType');
    
    if (!petType || !petImage) return;
    
    // Check which stats are below 4 (priority)
    const belowFour = [];
    if (pet.health < 4) belowFour.push('rest');
    if (pet.feed < 4) belowFour.push('feed');
    if (pet.play < 4) belowFour.push('play');
    if (pet.clean < 4) belowFour.push('clean');
    
    // Check which stats are 4-6 (normal range)
    const normalRange = [];
    if (pet.health >= 4 && pet.health <= 6) normalRange.push('rest');
    if (pet.feed >= 4 && pet.feed <= 6) normalRange.push('feed');
    if (pet.play >= 4 && pet.play <= 6) normalRange.push('play');
    if (pet.clean >= 4 && pet.clean <= 6) normalRange.push('clean');
    
    let mood = 'normal'; // default
    needsList = [];
    
    // Priority 1: If any stat is below 4, show sad
    if (belowFour.length > 0) {
        mood = 'sad';
        needsList = belowFour;
    }
    // Priority 2: If all are above 7, show happy
    else if (pet.rest >= 7 && pet.feed >= 7 && pet.play >= 7 && pet.clean >= 7 && pet.health >= 7) {
        mood = 'happy';
        needsList = [];
    }
    // Priority 3: If any are in 4-6 range, show normal
    else if (normalRange.length > 0) {
        mood = 'normal';
        needsList = normalRange;
    }
    
    // Update pet image
    const imagePath = `images/${mood}_${petType}.png`;
    petImage.src = imagePath;
    
    // Update speech bubble
    if (needsList.length > 0) {
        // If the needs list changed or this is first time, pick a random stat from the list
        if (JSON.stringify(needsList) !== JSON.stringify(lastNeedsList)) {
            // Pick a random need from the current list
            let randomIndex = Math.floor(Math.random() * needsList.length);
            speechBubble.textContent = needMessages[needsList[randomIndex]];
            lastNeedsList = [...needsList];
        }
        speechBubble.style.display = 'block';
    } else {
        speechBubble.style.display = 'none';
        lastNeedsList = [];
    }
    
    console.log('Home pet mood:', mood, '| Needs:', needsList);
}

// Function to update pet image on ACTION PAGES (only considers relevant stat)
function updatePetImageBasedOnStatsAction(actionName) {
    const petImage = document.getElementById('petImage');
    const petType = localStorage.getItem('petType');
    
    if (!petType || !petImage) return;
    
    let statValue = 0;
    
    // Get the relevant stat for this action
    switch(actionName) {
        case 'play':
            statValue = pet.play;
            break;
        case 'rest':
            statValue = pet.health;
            break;
        case 'feed':
            statValue = pet.feed;
            break;
        case 'clean':
            statValue = pet.clean;
            break;
        case 'vet':
            statValue = pet.health;
            break;
        case 'competition':
            statValue = pet.feed;
            break;
    }
    
    // Determine mood based only on this stat
    let mood = 'normal';
    if (statValue < 4) {
        mood = 'sad';
    } else if (statValue > 6) {
        mood = 'happy';
    }
    
    // Update pet image
    const imagePath = `images/${mood}_${petType}.png`;
    petImage.src = imagePath;
    
    console.log('Action page mood for', actionName + ':', mood, '| Stat value:', statValue);
}

// Function to update money display on home page
function updateMoneyDisplay() {
    const moneyDisplay = document.getElementById('moneyDisplay');
    
    if (moneyDisplay) {
        moneyDisplay.textContent = `Total Balance: $${player.money}`;
    }
}

// Function that runs when a pet button is clicked
function selectPet(type) {
    // Store the selected pet type
    petType = type;
    
    // Remove 'selected' class from all buttons
    document.getElementById('dogBtn').classList.remove('selected');
    document.getElementById('catBtn').classList.remove('selected');
    document.getElementById('bunnyBtn').classList.remove('selected');
    
    // Add 'selected' class to the clicked button
    if (type === 'dog') {
        document.getElementById('dogBtn').classList.add('selected');
    } else if (type === 'cat') {
        document.getElementById('catBtn').classList.add('selected');
    } else if (type === 'bunny') {
        document.getElementById('bunnyBtn').classList.add('selected');
    }
    
    // Check if we can enable the Next button
    checkIfReady();
}

// Function to check if user filled everything
function checkIfReady() {
    // Get the pet name from input box
    const petNameInput = document.getElementById('petName');
    if (!petNameInput) return;
    
    petName = petNameInput.value.trim();
    
    // Get the next button element
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn) return;
    
    // If name is filled AND pet is selected, enable button
    if (petName.length > 0 && petType !== '') {
        nextBtn.disabled = false;
    } else {
        nextBtn.disabled = true;
    }
}

// Function to go to home page
function goToHome() {
    // Get the pet name one more time
    petName = document.getElementById('petName').value.trim();
    
    // Save data so we can use it on the next page
    localStorage.setItem('petName', petName);
    localStorage.setItem('petType', petType);
    
    // Reset money when starting a new game
    localStorage.setItem('playerMoney', 100);
    localStorage.setItem('playerSpent', 0);
    
    // Reset pet stats
    resetPetStats();
    
    // Go to the home page
    window.location.href = 'Home.html';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if this is the selection page
    const petNameInput = document.getElementById('petName');
    if (petNameInput) {
        // Add event listener to check when user types in name box
        petNameInput.addEventListener('input', checkIfReady);
        
        // Make Next button disabled when page loads
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.disabled = true;
        }
    }

    // Check if this is the home page and update money display
    const moneyDisplay = document.getElementById('moneyDisplay');
    if (moneyDisplay) {
        // Load pet stats from localStorage for home page
        loadPetStats();
        updateMoneyDisplay();
        // Start stat decay on home page
        startStatDecay();
    } else if (healthDecayTimer || cleanDecayTimer) {
        // Stop decay when leaving home page
        stopStatDecay();
    }

    // Initialize pet image on ANY page that has it
    const petImage = document.getElementById('petImage');
    if (petImage) {
        // Load pet stats before using them
        if (!moneyDisplay) loadPetStats();
        
        // Retrieve saved pet type and name from localStorage
        const petType = localStorage.getItem('petType');
        const name = localStorage.getItem('petName');
        
        if (!petType) {
            window.location.href = 'Selection.html';
            return;
        }
        
        // Update pet image based on page type
        if (moneyDisplay) {
            // Home page - complex mood with speech bubbles
            updatePetImageBasedOnStatsHome();
        } else {
            // Action page - determine which action this is
            const pageTitle = document.querySelector('title').textContent;
            let actionName = '';
            if (pageTitle.includes('Clean')) actionName = 'clean';
            else if (pageTitle.includes('Feed')) actionName = 'feed';
            else if (pageTitle.includes('Vet')) actionName = 'vet';
            else if (pageTitle.includes('Play')) actionName = 'play';
            else if (pageTitle.includes('Rest')) actionName = 'rest';
            else if (pageTitle.includes('Competition')) actionName = 'competition';
            
            if (actionName) {
                updatePetImageBasedOnStatsAction(actionName);
            }
        }
        
        petImage.alt = name || petType;
        
        // Handle image load error
        petImage.onerror = function() {
            console.error('Failed to load image:', petImage.src);
            petImage.style.border = '2px solid red';
        };
        
        petImage.onload = function() {
            console.log('Image loaded successfully:', petImage.src);
        };
        
        // Display the pet name on home page only
        const petNameDisplay = document.getElementById('petNameDisplay');
        if (petNameDisplay) {
            petNameDisplay.textContent = name || 'Your Pet';
        }
        
        // Refresh all progress bars on home page only
        if (moneyDisplay) {
            refreshProgressBars();
        }
    }

    // Handle action page button clicks
    const pageTitle = document.querySelector('title').textContent;
    let actionName = '';
    
    if (pageTitle.includes('Clean')) {
        actionName = 'clean';
    } else if (pageTitle.includes('Feed')) {
        actionName = 'feed';
    } else if (pageTitle.includes('Vet')) {
        actionName = 'vet';
    } else if (pageTitle.includes('Play')) {
        actionName = 'play';
    } else if (pageTitle.includes('Rest')) {
        actionName = 'rest';
    } else if (pageTitle.includes('Competition')) {
        actionName = 'competition';
    }
    
    const actionBtn = document.querySelector('.action-title-btn');
    if (actionBtn && actionName) {
        // Update progress bar on page load to show current stat (not 5/10)
        updateActionPageProgressBar(actionName);
        
        actionBtn.addEventListener('click', function() {
            if (actionName === 'competition') {
                // Competition has special requirements
                performCompetition();
            } else {
                // Other actions deduct money and update stats
                performAction(actionName);
            }
        });
    }
});
