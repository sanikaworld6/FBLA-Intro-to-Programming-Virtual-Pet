// ============================================================
// VIRTUAL PET SIMULATOR - MAIN GAME SCRIPT
// ============================================================
// This script manages the entire Virtual Pet Simulator game
// It handles game state, pet actions, UI updates, and the competition mini-game
// All game data is stored in localStorage under 'petGameState'

// ============================================================
// SECTION 1: CENTRALIZED GAME STATE SYSTEM
// ============================================================
// All game data is stored in a single object in localStorage
// This prevents data conflicts and ensures consistency across pages

// Store the player's pet name and selected pet type
let petName = '';          // Player's chosen name for their pet
let petType = '';          // Selected pet type: 'dog', 'cat', or 'bunny'

// Default game state structure - used when game is first started
// All stat values are on a 0-10 scale, money is in dollars
const DEFAULT_GAME_STATE = {
    hunger: 5,             // Pet's hunger level (lower = hungrier)
    energy: 5,             // Pet's energy level (lower = more tired)
    happiness: 5,          // Pet's happiness level (lower = sadder)
    health: 5,             // Pet's health level (lower = sicker)
    cleanliness: 5,        // Pet's cleanliness level (lower = dirtier)
    play: 5,               // Pet's play stat (currently unused but available)
    money: 100             // Player's total money balance
};

// ============================================================
// SECTION 2: GAME STATE HELPER FUNCTIONS
// ============================================================
// These functions manage reading, writing, and validating game data

/**
 * getGameState() - Retrieve the current game state from localStorage
 * Returns the parsed JSON object from localStorage, or default values if not found
 * Includes error handling in case the stored data is corrupted
 */
function getGameState() {
    // Try to get the stored game state from localStorage
    const stored = localStorage.getItem('petGameState');
    
    // If data exists, parse it and return it
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            // If JSON parsing fails, log error and return defaults
            console.error('Failed to parse petGameState:', e);
            return { ...DEFAULT_GAME_STATE };
        }
    }
    
    // If nothing is stored, return a copy of default values
    return { ...DEFAULT_GAME_STATE };
}

/**
 * saveGameState(state) - Save the game state to localStorage
 * Takes the current game state object and stores it as JSON
 * Includes error handling for save failures
 */
function saveGameState(state) {
    try {
        // Convert state object to JSON string and store it
        localStorage.setItem('petGameState', JSON.stringify(state));
        console.log('Game state saved:', state);
    } catch (e) {
        // Log error if save fails (e.g., localStorage full)
        console.error('Failed to save game state:', e);
    }
}

/**
 * clampStat(value) - Ensure stat values stay between 0 and 10
 * This prevents stats from going below 0 or above 10
 */
function clampStat(value) {
    // Math.max ensures value doesn't go below 0
    // Math.min ensures value doesn't go above 10
    return Math.max(0, Math.min(10, value));
}

/**
 * initializeGameState() - Set up the game state on first load
 * Retrieves current state and saves it to ensure it exists in localStorage
 */
function initializeGameState() {
    // Get current state (either from storage or defaults)
    let state = getGameState();
    // Save it to ensure it's properly stored
    saveGameState(state);
}

/**
 * restartGame() - Reset the entire game and return to pet selection
 * This function allows the player to start a new game from scratch
 */
function restartGame() {
    // Ask player to confirm before restarting (they will lose progress)
    if (!confirm('Are you sure you want to restart the game? Your current progress will be lost.')) {
        return;
    }
    
    // Create a fresh game state with all default values
    const defaultState = {
        hunger: 5,
        energy: 5,
        happiness: 5,
        health: 5,
        cleanliness: 5,
        play: 5,
        money: 100
    };
    
    // Save the reset state to localStorage
    localStorage.setItem('petGameState', JSON.stringify(defaultState));
    console.log('Game state has been reset to defaults.');
    
    // Remove the saved pet name and type so player sees selection screen
    localStorage.removeItem('petName');
    localStorage.removeItem('petType');
    console.log('Pet name and type have been cleared.');
    
    // Redirect to the pet selection page to start fresh
    console.log('Redirecting to Selection.html');
    window.location.href = 'Selection.html';
}

// ============================================================
// SECTION 3: LEGACY COMPATIBILITY LAYER
// ============================================================
// These objects allow old code to work with the new centralized system
// When you read/write to pet.feed or player.money, they sync with petGameState

/**
 * player object - Manages player's money
 * Uses getter/setter functions to sync with petGameState.money
 * Ensures money never goes below 0
 */
let player = {
    // Get player's current money from game state
    get money() {
        return getGameState().money;
    },
    
    // Set player's money and save to game state
    set money(value) {
        const state = getGameState();
        // Ensure money doesn't go negative
        state.money = Math.max(0, value);
        saveGameState(state);
    },
    
    // Track total amount spent this session (for statistics)
    spent: 0
};

/**
 * pet object - Manages all pet stats
 * Maps old stat names (feed, rest, clean, etc.) to new names (hunger, energy, cleanliness)
 * All getters/setters automatically sync with petGameState
 */
let pet = {
    // Get/set rest stat (syncs with state.energy)
    get rest() {
        return getGameState().energy;
    },
    set rest(value) {
        const state = getGameState();
        state.energy = clampStat(value);
        saveGameState(state);
    },
    
    // Get/set health stat (syncs with state.health)
    get health() {
        return getGameState().health;
    },
    set health(value) {
        const state = getGameState();
        state.health = clampStat(value);
        saveGameState(state);
    },
    
    // Get/set play stat (syncs with state.play)
    get play() {
        return getGameState().play;
    },
    set play(value) {
        const state = getGameState();
        state.play = clampStat(value);
        saveGameState(state);
    },
    
    // Get/set feed stat (syncs with state.hunger)
    get feed() {
        return getGameState().hunger;
    },
    set feed(value) {
        const state = getGameState();
        state.hunger = clampStat(value);
        saveGameState(state);
    },
    
    // Get/set clean stat (syncs with state.cleanliness)
    get clean() {
        return getGameState().cleanliness;
    },
    set clean(value) {
        const state = getGameState();
        state.cleanliness = clampStat(value);
        saveGameState(state);
    }
};

// ============================================================
// SECTION 4: STAT DECAY SYSTEM
// ============================================================
// Stats automatically decrease over time when player is on Home page
// This creates urgency and prevents the pet from staying perfect forever

// Timer IDs for the decay intervals
let healthDecayTimer = null;   // Timer for health/hunger decay
let cleanDecayTimer = null;    // Timer for cleanliness decay

/**
 * startStatDecay() - Start automatic stat degradation
 * Called when player is on Home page
 * Runs decay timers that decrease stats every X seconds
 */
function startStatDecay() {
    // Clear any existing timers to avoid duplicates
    if (healthDecayTimer) clearInterval(healthDecayTimer);
    if (cleanDecayTimer) clearInterval(cleanDecayTimer);
    
    // Health & hunger decrease every 15 seconds (900,000 milliseconds)
    healthDecayTimer = setInterval(function() {
        const state = getGameState();
        // Decrease both health and hunger by 1 point
        state.health = clampStat(state.health - 1);
        state.hunger = clampStat(state.hunger - 1);
        saveGameState(state);
        // Update the pet's image based on new stats
        updatePetImageBasedOnStatsHome();
        console.log('Stat decay: Health and Hunger decreased');
    }, 15000);
    
    // Cleanliness decreases every 20 seconds (20,000 milliseconds)
    cleanDecayTimer = setInterval(function() {
        const state = getGameState();
        // Decrease cleanliness by 1 point
        state.cleanliness = clampStat(state.cleanliness - 1);
        saveGameState(state);
        // Update the pet's image based on new stats
        updatePetImageBasedOnStatsHome();
        console.log('Stat decay: Cleanliness decreased');
    }, 20000);
}

/**
 * stopStatDecay() - Stop the automatic stat degradation
 * Called when player leaves Home page (goes to action page)
 * Prevents stats from decaying while player is performing actions
 */
function stopStatDecay() {
    // Clear both decay timers
    if (healthDecayTimer) clearInterval(healthDecayTimer);
    if (cleanDecayTimer) clearInterval(cleanDecayTimer);
    // Set timer references to null
    healthDecayTimer = null;
    cleanDecayTimer = null;
}

// ============================================================
// SECTION 5: ACTION SYSTEM - Main Gameplay Mechanics
// ============================================================
// This section handles all player actions: Feed, Play, Rest, Clean, Vet

/**
 * performAction(actionName) - Execute a player action
 * Checks if player can afford it, modifies stats, updates display
 */
function performAction(actionName) {
    // Get current game state
    const state = getGameState();
    
    // Define how much each action costs
    const actionCosts = {
        'play': 0,      // Free action
        'feed': 10,     // Costs $10
        'clean': 5,     // Costs $5
        'rest': 0,      // Free action
        'vet': 50       // Costs $50
    };
    
    // Get the cost for this specific action (0 if not defined)
    const cost = actionCosts[actionName] || 0;
    
    // Check if player has enough money to perform this action
    if (state.money < cost) {
        alert(`Not enough money! Cost: $${cost}, Available: $${state.money}`);
        return false;
    }
    
    // Deduct the cost from player's money
    state.money -= cost;
    
    // Modify stats based on which action is being performed
    switch(actionName) {
        case 'play':
            // Play action: increase happiness (+1), decrease cleanliness (-2)
            state.happiness = clampStat(state.happiness + 1);
            state.cleanliness = clampStat(state.cleanliness - 2);
            break;
            
        case 'feed':
            // Feed action: increase hunger (lower value = hungry, so more is better)
            state.hunger = clampStat(state.hunger + 1);
            break;
            
        case 'clean':
            // Clean action: increase cleanliness
            state.cleanliness = clampStat(state.cleanliness + 1);
            break;
            
        case 'rest':
            // Rest action: increase both energy and health
            state.energy = clampStat(state.energy + 1);
            state.health = clampStat(state.health + 1);
            break;
            
        case 'vet':
            // Vet action: significantly increase health (+3)
            state.health = clampStat(state.health + 3);
            break;
    }
    
    // Save the updated game state
    saveGameState(state);
    // Update money display on home page
    updateMoneyDisplay();
    
    // Log action details for debugging
    console.log(`${actionName} performed. Cost: $${cost}. Money left: $${state.money}`);
    console.log(`Pet stats - Hunger: ${state.hunger}, Energy: ${state.energy}, Happiness: ${state.happiness}, Health: ${state.health}, Cleanliness: ${state.cleanliness}`);
    
    // Update pet image based on new stats
    updatePetImageBasedOnStatsAction(actionName);
    // Update progress bar on action page
    updateActionPageProgressBar(actionName);
    
    // If on home page, update it as well
    const moneyDisplay = document.getElementById('moneyDisplay');
    if (moneyDisplay) {
        updatePetImageBasedOnStatsHome();
    }
    
    // Action was successful
    return true;
}

// ============================================================
// SECTION 6: UI UPDATE FUNCTIONS
// ============================================================
// These functions update the visual displays to show current stats

/**
 * updateActionPageProgressBar(actionName) - Update progress bar on action pages
 * Shows how high the relevant stat is before and after the action
 */
function updateActionPageProgressBar(actionName) {
    // Get DOM elements for the progress bar
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    // If elements don't exist on this page, return early
    if (!progressFill || !progressText) return;
    
    // Get current game state
    const state = getGameState();
    let statValue = 0;
    
    // Get the stat value that corresponds to this action
    switch(actionName) {
        case 'play':
            statValue = state.happiness;
            break;
        case 'rest':
            statValue = state.health;
            break;
        case 'feed':
            statValue = state.hunger;
            break;
        case 'clean':
            statValue = state.cleanliness;
            break;
        case 'vet':
            statValue = state.health;
            break;
        case 'competition':
            // Competition uses average of three important stats
            statValue = Math.floor((state.hunger + state.energy + state.health) / 3);
            break;
    }
    
    // Calculate percentage (stat/10 * 100) for progress bar width
    const percentage = (statValue / 10) * 100;
    // Update the visual width of the progress bar
    progressFill.style.width = percentage + '%';
    // Update the text showing current value
    progressText.textContent = statValue + '/10';
}

/**
 * refreshProgressBars() - Update all progress bars on Home page
 * Called when Home page loads and whenever a stat changes
 */
function refreshProgressBars() {
    // Get current game state
    const state = getGameState();
    // Each stat point = 10% width (0-10 scale = 0-100%)
    const fillPercentage = 10;
    
    // === PLAY PROGRESS BAR ===
    const playFill = document.getElementById('playProgressFill');
    const playText = document.getElementById('playProgressText');
    if (playFill) playFill.style.width = (state.happiness * fillPercentage) + '%';
    if (playText) playText.textContent = state.happiness + '/10';
    
    // === REST PROGRESS BAR (shows health) ===
    const restFill = document.getElementById('restProgressFill');
    const restText = document.getElementById('restProgressText');
    if (restFill) restFill.style.width = (state.health * fillPercentage) + '%';
    if (restText) restText.textContent = state.health + '/10';
    
    // === VET PROGRESS BAR (also shows health) ===
    const vetFill = document.getElementById('vetProgressFill');
    const vetText = document.getElementById('vetProgressText');
    if (vetFill) vetFill.style.width = (state.health * fillPercentage) + '%';
    if (vetText) vetText.textContent = state.health + '/10';
    
    // === CLEAN PROGRESS BAR ===
    const cleanFill = document.getElementById('cleanProgressFill');
    const cleanText = document.getElementById('cleanProgressText');
    if (cleanFill) cleanFill.style.width = (state.cleanliness * fillPercentage) + '%';
    if (cleanText) cleanText.textContent = state.cleanliness + '/10';
    
    // === FEED PROGRESS BAR ===
    const feedFill = document.getElementById('feedProgressFill');
    const feedText = document.getElementById('feedProgressText');
    if (feedFill) feedFill.style.width = (state.hunger * fillPercentage) + '%';
    if (feedText) feedText.textContent = state.hunger + '/10';
    
    // === COMPETITION PROGRESS BAR ===
    const competitionFill = document.getElementById('competitionProgressFill');
    const competitionText = document.getElementById('competitionProgressText');
    if (competitionFill) competitionFill.style.width = (state.hunger * fillPercentage) + '%';
    if (competitionText) competitionText.textContent = state.hunger + '/10';
}

/**
 * updateMoneyDisplay() - Update the money counter on Home page
 * Shows current total balance in top-right corner
 */
function updateMoneyDisplay() {
    // Find the element that displays money
    const moneyDisplay = document.getElementById('moneyDisplay');
    
    if (moneyDisplay) {
        // Get current game state to get current money amount
        const state = getGameState();
        // Update the displayed text with current balance
        moneyDisplay.textContent = `Total Balance: $${state.money}`;
    }
}

// ============================================================
// SECTION 7: PET IMAGE & MOOD SYSTEM
// ============================================================
// The pet's image changes based on its stats (sad/normal/happy mood)
// Speech bubbles appear to indicate what the pet needs

// Track which stats need attention (for speech bubble)
let needsList = [];
let lastNeedsList = [];

// Messages the pet says based on what it needs
const needMessages = {
    'energy': 'I need rest',      // Pet needs energy
    'hunger': 'Feed me',           // Pet is hungry
    'happiness': 'Lets play!',     // Pet is bored
    'cleanliness': 'Clean me',     // Pet is dirty
    'health': 'Achooo*'            // Pet is sick
};

/**
 * updatePetImageBasedOnStatsHome() - Update pet mood on Home page
 * Determines mood (sad/normal/happy) and displays appropriate image
 * Also shows speech bubble with needs
 */
function updatePetImageBasedOnStatsHome() {
    // Get DOM elements for pet and speech bubble
    const petImage = document.getElementById('petImage');
    const speechBubble = document.getElementById('speechBubble');
    const petType = localStorage.getItem('petType');
    
    // Can't update if pet type unknown or image element missing
    if (!petType || !petImage) return;
    
    // Get current game state
    const state = getGameState();
    
    // Check which stats are below 4 (critical/sad)
    const belowFour = [];
    if (state.health < 4) belowFour.push('energy');
    if (state.hunger < 4) belowFour.push('hunger');
    if (state.happiness < 4) belowFour.push('happiness');
    if (state.cleanliness < 4) belowFour.push('cleanliness');
    
    // Check which stats are 4-6 (normal range)
    const normalRange = [];
    if (state.health >= 4 && state.health <= 6) normalRange.push('energy');
    if (state.hunger >= 4 && state.hunger <= 6) normalRange.push('hunger');
    if (state.happiness >= 4 && state.happiness <= 6) normalRange.push('happiness');
    if (state.cleanliness >= 4 && state.cleanliness <= 6) normalRange.push('cleanliness');
    
    // Start with 'normal' mood and empty needs list
    let mood = 'normal';
    needsList = [];
    
    // PRIORITY 1: If any stat below 4, show sad pet
    if (belowFour.length > 0) {
        mood = 'sad';
        needsList = belowFour;
    }
    // PRIORITY 2: If ALL stats above 7, show happy pet
    else if (state.energy >= 7 && state.hunger >= 7 && state.happiness >= 7 && state.cleanliness >= 7 && state.health >= 7) {
        mood = 'happy';
        needsList = [];
    }
    // PRIORITY 3: If any stats in 4-6 range, show normal pet
    else if (normalRange.length > 0) {
        mood = 'normal';
        needsList = normalRange;
    }
    
    // Set the image path: images/{mood}_{petType}.png
    const imagePath = `images/${mood}_${petType}.png`;
    petImage.src = imagePath;
    
    // Update speech bubble based on needs
    if (needsList.length > 0) {
        // Only update speech bubble if needs changed
        if (JSON.stringify(needsList) !== JSON.stringify(lastNeedsList)) {
            // Pick a random stat from the needs list to display
            let randomIndex = Math.floor(Math.random() * needsList.length);
            speechBubble.textContent = needMessages[needsList[randomIndex]];
            lastNeedsList = [...needsList];
        }
        // Show the speech bubble
        speechBubble.style.display = 'block';
    } else {
        // Hide speech bubble if no needs
        speechBubble.style.display = 'none';
        lastNeedsList = [];
    }
    
    // Log mood change for debugging
    console.log('Home pet mood:', mood, '| Needs:', needsList);
}

/**
 * updatePetImageBasedOnStatsAction(actionName) - Update pet mood on action pages
 * Determines mood based on the stat affected by this action
 */
function updatePetImageBasedOnStatsAction(actionName) {
    // Get DOM elements
    const petImage = document.getElementById('petImage');
    const petType = localStorage.getItem('petType');
    
    // Can't update if pet type unknown or image element missing
    if (!petType || !petImage) return;
    
    // Get current game state
    const state = getGameState();
    let statValue = 0;
    
    // Get the stat value affected by this action
    switch(actionName) {
        case 'play':
            statValue = state.happiness;
            break;
        case 'rest':
            statValue = state.health;
            break;
        case 'feed':
            statValue = state.hunger;
            break;
        case 'clean':
            statValue = state.cleanliness;
            break;
        case 'vet':
            statValue = state.health;
            break;
        case 'competition':
            statValue = state.hunger;
            break;
    }
    
    // Determine mood based on stat value
    let mood = 'normal';
    if (statValue < 4) {
        mood = 'sad';           // Low stat = sad pet
    } else if (statValue > 6) {
        mood = 'happy';         // High stat = happy pet
    }
    
    // Set the image path: images/{mood}_{petType}.png
    const imagePath = `images/${mood}_${petType}.png`;
    petImage.src = imagePath;
    
    // Log mood for debugging
    console.log('Action page mood for', actionName + ':', mood, '| Stat value:', statValue);
}

// ============================================================
// SECTION 8: PET SELECTION
// ============================================================
// Functions for the Selection.html page where player chooses pet and name

/**
 * selectPet(type) - Handle pet selection button click
 * Marks the selected pet type and highlights the button
 */
function selectPet(type) {
    // Store the selected pet type
    petType = type;
    
    // Remove 'selected' class from all pet buttons
    document.getElementById('dogBtn')?.classList.remove('selected');
    document.getElementById('catBtn')?.classList.remove('selected');
    document.getElementById('bunnyBtn')?.classList.remove('selected');
    
    // Add 'selected' class to the clicked button
    if (type === 'dog') document.getElementById('dogBtn')?.classList.add('selected');
    else if (type === 'cat') document.getElementById('catBtn')?.classList.add('selected');
    else if (type === 'bunny') document.getElementById('bunnyBtn')?.classList.add('selected');
    
    // Check if player can proceed to next screen
    checkIfReady();
}

/**
 * checkIfReady() - Check if player has entered name and selected pet
 * Enables Next button only when both conditions are met
 */
function checkIfReady() {
    // Get the pet name input field
    const petNameInput = document.getElementById('petName');
    if (!petNameInput) return;
    
    // Get the current pet name (trim whitespace)
    petName = petNameInput.value.trim();
    // Get the Next button
    const nextBtn = document.getElementById('nextBtn');
    
    // Enable Next button only if name is not empty AND pet is selected
    if (nextBtn) {
        nextBtn.disabled = !(petName.length > 0 && petType !== '');
    }
}

/**
 * goToHome() - Proceed from pet selection to Home page
 * Saves pet name and type, initializes game state, redirects to Home
 */
function goToHome() {
    // Get pet name from input field one more time
    petName = document.getElementById('petName')?.value.trim() || '';
    
    // Save pet name and type to localStorage for later use
    localStorage.setItem('petName', petName);
    localStorage.setItem('petType', petType);
    
    // Initialize game state with default values
    initializeGameState();
    
    // Navigate to the Home page
    window.location.href = 'Home.html';
}

// ============================================================
// SECTION 9: PAGE INITIALIZATION
// ============================================================
// This code runs when any page first loads

document.addEventListener('DOMContentLoaded', function() {
    // Initialize game state (creates default if not exists)
    initializeGameState();
    
    // ===== SELECTION PAGE SETUP =====
    const petNameInput = document.getElementById('petName');
    if (petNameInput) {
        // Listen for player typing in name field
        petNameInput.addEventListener('input', checkIfReady);
        // Make Next button disabled initially
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.disabled = true;
    }
    
    // ===== HOME PAGE SETUP =====
    const moneyDisplay = document.getElementById('moneyDisplay');
    if (moneyDisplay) {
        // Update money display
        updateMoneyDisplay();
        // Start stat decay on home page
        startStatDecay();
    } else {
        // Stop stat decay when leaving home page
        stopStatDecay();
    }
    
    // ===== PET IMAGE SETUP (all pages with pet image) =====
    const petImage = document.getElementById('petImage');
    if (petImage) {
        // Get the saved pet type and name
        const petType = localStorage.getItem('petType');
        const name = localStorage.getItem('petName');
        
        // If no pet type saved, user must select one first
        if (!petType) {
            window.location.href = 'Selection.html';
            return;
        }
        
        // Update pet image based on which page this is
        if (moneyDisplay) {
            // Home page - use complex mood logic with speech bubble
            updatePetImageBasedOnStatsHome();
        } else {
            // Action page - determine which action this is from page title
            const pageTitle = document.querySelector('title')?.textContent || '';
            let actionName = '';
            
            // Identify which page this is by the page title
            if (pageTitle.includes('Clean')) actionName = 'clean';
            else if (pageTitle.includes('Feed')) actionName = 'feed';
            else if (pageTitle.includes('Vet')) actionName = 'vet';
            else if (pageTitle.includes('Play')) actionName = 'play';
            else if (pageTitle.includes('Rest')) actionName = 'rest';
            else if (pageTitle.includes('Competition')) actionName = 'competition';
            
            // Update pet image for this action
            if (actionName) {
                updatePetImageBasedOnStatsAction(actionName);
            }
        }
        
        // Set alternate text for image (if image fails to load)
        petImage.alt = name || petType;
        
        // Handle image load errors
        petImage.onerror = function() {
            console.error('Failed to load image:', petImage.src);
            // Show red border to indicate missing image
            petImage.style.border = '2px solid red';
        };
        
        // Log when image loads successfully
        petImage.onload = function() {
            console.log('Image loaded successfully:', petImage.src);
        };
        
        // Display pet name on home page
        const petNameDisplay = document.getElementById('petNameDisplay');
        if (petNameDisplay) {
            petNameDisplay.textContent = name || 'Your Pet';
        }
        
        // Refresh progress bars on home page
        if (moneyDisplay) {
            refreshProgressBars();
        }
    }
    
    // ===== ACTION BUTTON SETUP =====
    // Get current page title to identify which action page this is
    const pageTitle = document.querySelector('title')?.textContent || '';
    let actionName = '';
    
    // Identify which page this is
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
        // Competition page is handled separately, skip generic action button setup
        return;
    }
    
    // Set up action button click handler
    const actionBtn = document.querySelector('.action-title-btn');
    if (actionBtn && actionName) {
        // Update progress bar to show current value
        updateActionPageProgressBar(actionName);
        
        // Listen for button click and perform the action
        actionBtn.addEventListener('click', function() {
            performAction(actionName);
        });
    }
});

// ============================================================
// SECTION 10: COMPETITION MINI-GAME (FLAPPY BIRD STYLE)
// ============================================================
// This section handles the competition mini-game mechanics

// Game state variables for the mini-game
let gameData = {
    isGameRunning: false,       // Is the game currently active?
    isGameOver: false,          // Has the player lost?
    score: 0,                   // Number of obstacles passed
    money: 0,                   // Money earned this game ($10 per obstacle)
    petX: 0,                    // Pet's X position on screen
    petY: 0,                    // Pet's Y position on screen
    petVelocityY: 0,            // How fast pet is moving down (affected by gravity)
    petWidth: 40,               // Pet sprite width in pixels
    petHeight: 40,              // Pet sprite height in pixels
    gravity: 0.2,               // How strong gravity is (higher = faster falling)
    jumpPower: -3,             // How high pet jumps (negative = upward)
    obstacles: [],              // Array of obstacles on screen
    obstacleGap: 150,           // Space between top and bottom obstacles
    obstacleWidth: 50,          // Width of each obstacle
    obstacleSpeed: 4,           // How fast obstacles move left
    frameCount: 0               // Used to create obstacles at intervals
};

// Get canvas element and 2D drawing context for the game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
// Store the pet image for the game
let gamePetImage = null;

/**
 * initializeCompetitionPage() - Set up the competition page
 * Called when Competition.html loads
 */
function initializeCompetitionPage() {
    // Check if this page is actually the competition page
    const pageTitle = document.querySelector('title');
    if (!pageTitle || !pageTitle.textContent.includes('Competition')) return;
    
    // Get the saved pet type and name
    const petType = localStorage.getItem('petType');
    const petName = localStorage.getItem('petName');
    
    // If no pet type, force user to selection screen
    if (!petType) {
        window.location.href = 'Selection.html';
        return;
    }
    
    // Update the pet image on the competition page
    const petImage = document.getElementById('petImage');
    if (petImage) {
        // Set image based on pet's current stats
        updatePetImageBasedOnStatsAction('competition');
        petImage.alt = petName || petType;
        
        // Handle image load errors
        petImage.onerror = function() {
            console.error('Failed to load image:', petImage.src);
            petImage.style.border = '2px solid red';
        };
    }
    
    // Set up Compete button to start the game
    const competeBtn = document.getElementById('competeBtn');
    if (competeBtn) {
        competeBtn.addEventListener('click', onCompeteButtonClicked);
    }
    
    // Set up game over buttons
    const playAgainBtn = document.getElementById('playAgainBtn');
    const returnHomeBtn = document.getElementById('returnHomeBtn');
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', onPlayAgainClicked);
    }
    if (returnHomeBtn) {
        returnHomeBtn.addEventListener('click', onReturnHomeClicked);
    }
}

/**
 * checkCompetitionRequirements() - Verify pet stats are high enough
 * Requirements: hunger > 6, energy > 6, health > 6
 * Returns true if all requirements met, false otherwise
 */
function checkCompetitionRequirements() {
    // Get current game state
    const state = getGameState();
    
    // Check each requirement
    const hungerOk = state.hunger > 6;  // Pet must not be hungry
    const energyOk = state.energy > 6;  // Pet must be well-rested
    const healthOk = state.health > 6;  // Pet must be healthy
    
    // If any requirement not met, show alert and return false
    if (!hungerOk || !energyOk || !healthOk) {
        alert("Your pet is not ready for competition! Improve hunger, energy, and health first.");
        return false;
    }
    
    // All requirements met
    return true;
}

/**
 * onCompeteButtonClicked() - Handle Compete button click
 * Checks requirements and starts the game if ready
 */
function onCompeteButtonClicked() {
    // Check if pet meets requirements
    if (!checkCompetitionRequirements()) return;
    
    // Hide the pre-game screen and show the game canvas
    const preGameState = document.getElementById('preGameState');
    const gameStateDiv = document.getElementById('gameState');
    const homeBtn = document.getElementById('homeBtn');
    
    if (preGameState) preGameState.style.display = 'none';
    if (gameStateDiv) gameStateDiv.style.display = 'flex';
    if (homeBtn) homeBtn.style.display = 'block';
    
    // Start the game
    startGame();
}

/**
 * startGame() - Initialize and begin the mini-game
 * Sets up game variables and starts the animation loop
 */
function startGame() {
    // Initialize game state variables
    gameData.isGameRunning = true;          // Game is now running
    gameData.isGameOver = false;            // Player hasn't lost yet
    gameData.score = 0;                     // Reset score to 0
    gameData.money = 0;                     // Reset money earned to 0
    gameData.petY = canvas.height / 2 - 20; // Start pet in middle of screen
    gameData.petVelocityY = 0;              // Pet starts stationary
    gameData.obstacles = [];                // Clear any old obstacles
    gameData.frameCount = 0;                // Reset frame counter
    
    // Get pet type to load correct image
    const petType = localStorage.getItem('petType');
    // Get current game state for stat-based mood
    const state = getGameState();
    
    // Determine which pet image to show based on average stats
    let imageSrc = 'images/normal_' + petType + '.png';
    const avgStat = (state.hunger + state.energy + state.health + state.happiness + state.cleanliness) / 5;
    
    // Show happy pet if average stat is high
    if (avgStat >= 8) {
        imageSrc = 'images/happy_' + petType + '.png';
    }
    // Show sad pet if average stat is low
    else if (avgStat <= 3) {
        imageSrc = 'images/sad_' + petType + '.png';
    }
    
    // Load the pet image for the game
    gamePetImage = new Image();
    gamePetImage.src = imageSrc;
    gamePetImage.onload = () => console.log('Pet image loaded:', imageSrc);
    gamePetImage.onerror = () => console.error('Failed to load pet image:', imageSrc);
    
    // Start the animation loop (runs ~60 times per second)
    requestAnimationFrame(gameLoop);
    
    // Set up keyboard and mouse controls
    document.addEventListener('keydown', onGameKeyDown);
    document.addEventListener('click', onGameClick);
    if (canvas) canvas.addEventListener('click', onGameClick);
}

/**
 * onGameKeyDown(event) - Handle spacebar press during game
 * Spacebar makes pet jump
 */
function onGameKeyDown(event) {
    // Only handle spacebar during active game
    if (gameData.isGameRunning && event.code === 'Space') {
        // Prevent default spacebar behavior (page scroll)
        event.preventDefault();
        // Make pet jump (negative velocity = upward)
        gameData.petVelocityY = gameData.jumpPower;
    }
}

/**
 * onGameClick(event) - Handle mouse click during game
 * Click makes pet jump
 */
function onGameClick(event) {
    // Only allow jump if game is running and not game over
    if (gameData.isGameRunning && !gameData.isGameOver) {
        // Make pet jump
        gameData.petVelocityY = gameData.jumpPower;
    }
}

/**
 * gameLoop() - Main animation loop
 * Runs ~60 times per second, updates game and draws screen
 */
function gameLoop() {
    // Stop loop if game not running
    if (!gameData.isGameRunning) return;
    
    // Update game logic (physics, collision, scoring)
    updateGame();
    // Draw everything on the canvas
    drawGame();
    
    // Continue looping if game not over
    if (!gameData.isGameOver) {
        requestAnimationFrame(gameLoop);
    } else {
        // When game ends, show results
        endGame();
    }
}

/**
 * updateGame() - Update game physics and logic
 * Handles gravity, collisions, obstacles, scoring
 */
function updateGame() {
    // Apply gravity (accelerates pet downward)
    gameData.petVelocityY += gameData.gravity;
    // Apply velocity (move pet based on current falling speed)
    gameData.petY += gameData.petVelocityY;
    
    // Check if pet hit the ground (bottom of screen)
    if (gameData.petY + gameData.petHeight >= canvas.height) {
        gameData.isGameOver = true;
        return;
    }
    
    // Check if pet hit the ceiling (top of screen)
    if (gameData.petY < 0) {
        gameData.petY = 0;             // Keep pet at top
        gameData.petVelocityY = 0;     // Stop upward motion
    }
    
    // Update each obstacle on screen
    for (let i = gameData.obstacles.length - 1; i >= 0; i--) {
        // Move obstacle left
        gameData.obstacles[i].x -= gameData.obstacleSpeed;
        
        // Check if pet collided with this obstacle
        if (checkCollisionWithObstacle(gameData.obstacles[i])) {
            gameData.isGameOver = true;
            return;
        }
        
        // Check if pet successfully passed this obstacle
        if (!gameData.obstacles[i].passed && gameData.petX > gameData.obstacles[i].x + gameData.obstacleWidth) {
            gameData.obstacles[i].passed = true;    // Mark as passed
            gameData.score += 1;                     // Increase score
            gameData.money += 10;                    // Award $10
        }
        
        // Remove obstacles that went off-screen
        if (gameData.obstacles[i].x + gameData.obstacleWidth < 0) {
            gameData.obstacles.splice(i, 1);
        }
    }
    
    // Create new obstacles at regular intervals
    gameData.frameCount++;
    if (gameData.frameCount > 100) {
        // Random gap position (not too high, not too low)
        const gapStart = Math.random() * (canvas.height - gameData.obstacleGap - 100) + 50;
        
        // Add new obstacle
        gameData.obstacles.push({
            x: canvas.width,                      // Starts at right edge
            topHeight: gapStart,                  // Height of top pipe
            bottomY: gapStart + gameData.obstacleGap, // Start of bottom pipe
            passed: false                         // Not passed yet
        });
        
        // Reset frame counter
        gameData.frameCount = 0;
    }
    
    // Update score display on canvas
    const scoreDisplay = document.getElementById('gameScore');
    if (scoreDisplay) scoreDisplay.textContent = gameData.score;
}

/**
 * drawGame() - Draw everything on the canvas
 * Called every frame to update the visual display
 */
function drawGame() {
    // Clear the canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground line at bottom
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 2);
    ctx.lineTo(canvas.width, canvas.height - 2);
    ctx.stroke();
    
    // Draw the pet sprite
    gameData.petX = 100;  // Pet stays at left side of screen
    if (gamePetImage && gamePetImage.complete) {
        // Draw the pet image if loaded
        ctx.drawImage(gamePetImage, gameData.petX, gameData.petY, gameData.petWidth, gameData.petHeight);
    } else {
        // Draw red rectangle as fallback if image not loaded
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(gameData.petX, gameData.petY, gameData.petWidth, gameData.petHeight);
    }
    
    // Draw all obstacles
    ctx.fillStyle = '#228B22';  // Green color
    for (let obstacle of gameData.obstacles) {
        // Draw top obstacle
        ctx.fillRect(obstacle.x, 0, gameData.obstacleWidth, obstacle.topHeight);
        
        // Draw bottom obstacle
        ctx.fillRect(obstacle.x, obstacle.bottomY, gameData.obstacleWidth, canvas.height - obstacle.bottomY);
    }
}

/**
 * checkCollisionWithObstacle(obstacle) - Check if pet hit an obstacle
 * Returns true if collision detected, false otherwise
 */
function checkCollisionWithObstacle(obstacle) {
    // Get pet's boundaries (left, right, top, bottom)
    const petRight = gameData.petX + gameData.petWidth;
    const petBottom = gameData.petY + gameData.petHeight;
    const obstacleRight = obstacle.x + gameData.obstacleWidth;
    
    // Check if pet overlaps horizontally with obstacle
    if (petRight > obstacle.x && gameData.petX < obstacleRight) {
        // Check if pet overlaps vertically (hit top or bottom pipe)
        if (gameData.petY < obstacle.topHeight || petBottom > obstacle.bottomY) {
            return true;  // Collision detected
        }
    }
    
    return false;  // No collision
}

/**
 * endGame() - Handle game over
 * Deduct stats, add money, show results
 */
function endGame() {
    // Stop the game
    gameData.isGameRunning = false;
    gameData.isGameOver = true;
    
    // Remove all event listeners
    document.removeEventListener('keydown', onGameKeyDown);
    document.removeEventListener('click', onGameClick);
    if (canvas) canvas.removeEventListener('click', onGameClick);
    
    // Get current game state
    const state = getGameState();
    
    // Deduct stats due to exertion from competition
    state.energy = clampStat(state.energy - 3);      // Energy -3
    state.hunger = clampStat(state.hunger - 2);      // Hunger -2
    state.cleanliness = clampStat(state.cleanliness - 2); // Cleanliness -2
    
    // Add winnings from the game
    state.money += gameData.money;
    
    // Save the updated game state
    saveGameState(state);
    
    // Hide game canvas and show game over screen
    const gameStateDiv = document.getElementById('gameState');
    const gameOverState = document.getElementById('gameOverState');
    const homeBtn = document.getElementById('homeBtn');
    
    if (gameStateDiv) gameStateDiv.style.display = 'none';
    if (gameOverState) gameOverState.style.display = 'flex';
    if (homeBtn) homeBtn.style.display = 'block';
    
    // Display final score and earnings
    const finalScoreDisplay = document.getElementById('finalScore');
    const moneyEarnedDisplay = document.getElementById('moneyEarned');
    
    if (finalScoreDisplay) finalScoreDisplay.textContent = `Final Score: ${gameData.score}`;
    if (moneyEarnedDisplay) moneyEarnedDisplay.textContent = `Money Earned: $${gameData.money}`;
}

/**
 * onPlayAgainClicked() - Handle Play Again button click
 * Checks requirements again before allowing another game
 */
function onPlayAgainClicked() {
    // Check if pet still meets requirements
    if (!checkCompetitionRequirements()) return;
    
    // Hide game over screen and show game canvas
    const gameOverState = document.getElementById('gameOverState');
    const gameStateDiv = document.getElementById('gameState');
    
    if (gameOverState) gameOverState.style.display = 'none';
    if (gameStateDiv) gameStateDiv.style.display = 'flex';
    
    // Start a new game
    startGame();
}

/**
 * onReturnHomeClicked() - Handle Return Home button click
 * Takes player back to the Home page
 */
function onReturnHomeClicked() {
    window.location.href = 'Home.html';
}

// Initialize competition page when it loads
document.addEventListener('DOMContentLoaded', initializeCompetitionPage);
