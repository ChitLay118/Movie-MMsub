/**
 * WY MovieBox - Main JavaScript Logic
 * This script handles data fetching, state management, UI rendering,
 * and user interactions (navigation, video playing, favorites, settings).
 */

// Global state variables
let videos = {};
let translations = {};
let favorites = [];
let currentPlayingMovie = null;
let currentSettings = {};
let userId = localStorage.getItem('localUserId') || crypto.randomUUID();

// Default settings
const defaultSettings = {
    language: 'myanmar',
    theme: 'dark',
    name: '',
    email: ''
};

// Ensure UUID is saved
if (localStorage.getItem('localUserId') === null) {
    localStorage.setItem('localUserId', userId);
}


// -------------------------------------------------------------------------
// 1. DATA FETCHING AND INITIALIZATION
// -------------------------------------------------------------------------

/**
 * Fetches movie data and translations from the JSON file.
 * @returns {Promise<void>}
 */
async function loadDataFromJSON() {
    try {
        const response = await fetch('videos_photos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        videos = data.videos || {};
        translations = data.translations || {};
        console.log("Data loaded successfully from JSON.");
    } catch (e) {
        console.error("Failed to load JSON data. Ensure the 'videos_photos.json' file exists and the path is correct.", e);
        // Fallback or exit if essential data is missing
    }
}

/**
 * Loads user state from Local Storage and initializes the app.
 */
function initializeApp() {
    // 1. Load Settings
    const storedSettings = localStorage.getItem('userSettings');
    try {
        if (storedSettings) {
            currentSettings = { ...defaultSettings, ...JSON.parse(storedSettings) };
        } else {
            currentSettings = { ...defaultSettings };
        }
    } catch (e) {
        console.error("Error parsing settings from localStorage, using defaults.", e);
        currentSettings = { ...defaultSettings };
    }
    
    // 2. Load Favorites
    const storedFavorites = localStorage.getItem('favorites');
    try {
        if (storedFavorites) {
            favorites = JSON.parse(storedFavorites);
            if (!Array.isArray(favorites)) favorites = [];
        } else {
            favorites = [];
        }
    } catch (e) {
        console.error("Error parsing favorites from localStorage, resetting.", e);
        favorites = [];
    }
    
    // 3. Apply settings (theme/language) and render default view (Home/Action)
    applySettings();
    const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
    if (homeBtn) {
        changeNav(homeBtn);
    }
}

// -------------------------------------------------------------------------
// 2. LOCAL STORAGE HANDLING
// -------------------------------------------------------------------------

/**
 * Saves current user settings to localStorage.
 */
window.saveSettings = function() {
    const name = document.getElementById('setting-name').value;
    const email = document.getElementById('setting-email').value;
    const theme = document.getElementById('setting-theme').value;
    const language = document.getElementById('setting-language').value;

    const newSettings = { name, email, theme, language };
    
    try {
        localStorage.setItem('userSettings', JSON.stringify(newSettings));
        currentSettings = { ...currentSettings, ...newSettings };
        applySettings();
        // Go back to the home view after saving
        changeNav(document.querySelector('.nav-btn[data-nav="home"]'));
    } catch (e) {
        console.error("Error saving settings to localStorage:", e);
    }
}

/**
 * Saves the current favorites array to localStorage.
 */
function saveFavoritesToLocalStorage() {
    try {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (e) {
        console.error("Error saving favorites to localStorage:", e);
    }
}


// -------------------------------------------------------------------------
// 3. UI AND VIEW MANAGEMENT (Theme/Language/Navigation)
// -------------------------------------------------------------------------

/**
 * Applies the current settings (theme and language) to the UI.
 */
function applySettings() {
    const { theme, language } = currentSettings;

    // 1. Apply Theme
    const bodyRoot = document.getElementById('body-root');
    const headerSticky = document.getElementById('header-sticky');
    const navBar = document.getElementById('nav-bar');
    const themeElements = [bodyRoot, headerSticky, navBar];
    const isLight = theme === 'light';

    themeElements.forEach(el => {
        if (el === bodyRoot) {
            el.classList.toggle('bg-gray-100', isLight);
            el.classList.toggle('text-gray-900', isLight);
            el.classList.toggle('bg-darkbg', !isLight);
            el.classList.toggle('text-white', !isLight);
        } else if (el === headerSticky) {
            el.classList.toggle('bg-white', isLight);
            el.classList.toggle('shadow-gray-300/80', isLight);
            el.classList.toggle('bg-darkbg', !isLight);
            el.classList.toggle('shadow-darkbg/80', !isLight);
        } else if (el === navBar) {
            el.classList.toggle('bg-white', isLight);
            el.classList.toggle('border-gray-200', isLight);
            el.classList.toggle('shadow-gray-400/80', isLight);
            el.classList.toggle('bg-midbg', !isLight);
            el.classList.toggle('border-gray-700', !isLight);
            el.classList.toggle('shadow-black/80', !isLight);
        }
    });

    // 2. Apply Language
    applyLanguage(language);
    
    // 3. Re-render the current view to ensure card backgrounds are correct
    const activeNavBtn = document.querySelector('.nav-btn.text-primary');
    if (activeNavBtn) {
        const nav = activeNavBtn.dataset.nav;
        if (nav === 'home') {
            const activeCategoryBtn = document.querySelector('.menu-btn.active-category');
            if (activeCategoryBtn) {
                 showCategory(activeCategoryBtn.dataset.category, activeCategoryBtn);
            }
        } else if (nav === 'trending') {
            displayTrending();
        } else if (nav === 'favorites') {
            displayFavorites();
        } else if (nav === 'profile') {
            displayProfileSettings();
        }
    }
}

/**
 * Translates all UI elements marked with data-i18n attribute.
 * @param {string} language - 'myanmar' or 'english'
 */
function applyLanguage(language) {
    const t = translations[language] || translations.english;
    
    // 1. Translate elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // 2. Update fixed titles/texts
    document.getElementById('main-title').textContent = t.title;
    
    // 3. Update the category menu buttons text
    document.querySelectorAll('.menu-btn').forEach(btn => {
        const categoryKey = btn.getAttribute('data-category');
        if (t[categoryKey]) {
            btn.textContent = t[categoryKey];
        }
    });

    // 4. Update the current movie title text
    const currentTitleEl = document.getElementById('current-movie-title');
    if (!currentPlayingMovie) {
        currentTitleEl.textContent = t.selectMovie;
    } else {
        const originalTitle = currentPlayingMovie.title;
        currentTitleEl.textContent = `${t.nowPlaying}: ${originalTitle}`;
    }
}


/**
 * Changes the main view based on bottom navigation.
 * @param {HTMLElement} btn - The clicked navigation button.
 */
window.changeNav = function(btn) {
    const nav = btn.dataset.nav;
    const navBtns = document.querySelectorAll('.nav-btn');
    const menuBar = document.getElementById('menu-bar');
    const playerContainer = document.getElementById('player-container');
    const headerSticky = document.getElementById('header-sticky');
    const moviesContainer = document.getElementById('movies');

    // Reset all nav buttons
    navBtns.forEach(b => {
        b.classList.remove('text-primary', 'font-bold');
        b.classList.add('text-gray-400', 'hover:text-white');
    });

    // Activate the clicked button
    btn.classList.add('text-primary', 'font-bold');
    btn.classList.remove('text-gray-400', 'hover:text-white');

    // Clear movie container content
    moviesContainer.innerHTML = '';

    // Switch view
    switch (nav) {
        case 'home':
            menuBar.classList.remove('hidden');
            playerContainer.classList.remove('hidden');
            headerSticky.classList.add('sticky');
            
            const activeCategoryBtn = document.querySelector('.menu-btn.active-category') || document.querySelector('.menu-btn[data-category="action"]');
            
            if (activeCategoryBtn) {
                showCategory(activeCategoryBtn.dataset.category, activeCategoryBtn);
            }
            break;

        case 'trending':
            menuBar.classList.add('hidden');
            playerContainer.classList.remove('hidden');
            headerSticky.classList.add('sticky');
            displayTrending();
            break;

        case 'favorites':
            menuBar.classList.add('hidden');
            playerContainer.classList.remove('hidden');
            headerSticky.classList.add('sticky');
            displayFavorites();
            break;

        case 'profile':
            menuBar.classList.add('hidden');
            playerContainer.classList.add('hidden');
            headerSticky.classList.remove('sticky'); 
            displayProfileSettings();
            break;
    }
}


// -------------------------------------------------------------------------
// 4. RENDERING LOGIC (Category/Trending/Favorites/Profile)
// -------------------------------------------------------------------------

/**
 * Renders the movie list for a specific category.
 * (Rest of the rendering functions remain the same)
 */
window.showCategory = function(category, clickedButton) {
    const moviesContainer = document.getElementById('movies');
    moviesContainer.innerHTML = '';
    
    const t = translations[currentSettings.language] || translations.english;
    currentSettings.category = category;

    // Update active category button styles
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active-category', 'bg-primary', 'text-black');
        btn.classList.add(currentSettings.theme === 'light' ? 'bg-gray-200' : 'bg-gray-800', currentSettings.theme === 'light' ? 'text-gray-800' : 'text-white');
        btn.classList.remove('hover:bg-gray-700', 'hover:bg-gray-300'); // Clean up old hover class
        btn.classList.add(currentSettings.theme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-gray-700');
    });

    if (clickedButton) {
        clickedButton.classList.remove('bg-gray-800', 'text-white', 'bg-gray-200', 'text-gray-800', 'hover:bg-gray-700', 'hover:bg-gray-300');
        clickedButton.classList.add('active-category', 'bg-primary', 'text-black');
    }

    const categoryVideos = videos[category] || [];

    // Add category title header
    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white">${t.selectCategory}: ${t[category]}</h2>`;

    if (categoryVideos.length === 0) {
        moviesContainer.innerHTML += `<p class="text-gray-500 mt-5 text-center text-lg w-full">${t.noContent}</p>`;
        return;
    }

    categoryVideos.forEach(movie => {
        moviesContainer.appendChild(createMovieCard(movie));
    });
}

function displayTrending() {
    const moviesContainer = document.getElementById('movies');
    moviesContainer.innerHTML = '';
    
    const t = translations[currentSettings.language] || translations.english;
    
    let allMovies = [];
    for (const category in videos) {
        allMovies = allMovies.concat(videos[category]);
    }

    const trendingMovies = allMovies.slice(-10); 
    
    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white">${t.trendingHeader}</h2>`;
    
    if (trendingMovies.length === 0) {
        moviesContainer.innerHTML += `<p class="text-gray-500 mt-5 text-center text-lg w-full">${t.noContent}</p>`;
        return;
    }
    
    trendingMovies.forEach(movie => {
        moviesContainer.appendChild(createMovieCard(movie));
    });
}

function displayFavorites() {
    const moviesContainer = document.getElementById('movies');
    moviesContainer.innerHTML = '';
    
    const t = translations[currentSettings.language] || translations.english;

    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white">${t.favoritesHeader}</h2>`;

    if (favorites.length === 0) {
        moviesContainer.innerHTML += `<p class="text-gray-500 mt-5 text-center text-lg w-full">${t.noFavorites}</p>`;
        return;
    }

    favorites.forEach(movieId => {
        const movie = findMovieById(movieId);
        if (movie) {
            moviesContainer.appendChild(createMovieCard(movie));
        }
    });
}

function displayProfileSettings() {
    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.english;
    
    const themeOptions = [
        { value: 'dark', text: t.themeDark },
        { value: 'light', text: t.themeLight }
    ];
    const languageOptions = [
        { value: 'myanmar', text: t.langMyanmar },
        { value: 'english', text: t.langEnglish }
    ];

    const bgColorClass = currentSettings.theme === 'light' ? 'bg-white text-gray-900 border-gray-200' : 'bg-midbg text-white border-gray-700';
    const inputBgClass = currentSettings.theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-gray-700 text-white';
    const idBgClass = currentSettings.theme === 'light' ? 'bg-gray-200 text-gray-700' : 'bg-gray-800 text-gray-400';


    moviesContainer.innerHTML = `
        <div class="w-full max-w-md mx-auto p-6 rounded-xl shadow-2xl border ${bgColorClass}">
            <h2 class="text-2xl font-bold mb-6 text-primary text-center">${t.settingsTitle}</h2>
            
            <form id="settings-form" onsubmit="event.preventDefault(); saveSettings();">
                
                <div class="mb-4">
                    <label for="setting-name" class="block text-sm font-medium mb-1">${t.settingsName}</label>
                    <input type="text" id="setting-name" value="${currentSettings.name || ''}" class="w-full px-4 py-2 rounded-lg ${inputBgClass} focus:ring-primary focus:border-primary border-none transition duration-150" placeholder="${t.settingsName}">
                </div>

                <div class="mb-6">
                    <label for="setting-email" class="block text-sm font-medium mb-1">${t.settingsEmail}</label>
                    <input type="email" id="setting-email" value="${currentSettings.email || ''}" class="w-full px-4 py-2 rounded-lg ${inputBgClass} focus:ring-primary focus:border-primary border-none transition duration-150" placeholder="${t.settingsEmail}">
                </div>

                <div class="mb-4">
                    <label for="setting-theme" class="block text-sm font-medium mb-1">${t.settingsTheme}</label>
                    <select id="setting-theme" class="w-full px-4 py-2 rounded-lg appearance-none ${inputBgClass} focus:ring-primary focus:border-primary transition duration-150">
                        ${themeOptions.map(option => `
                            <option value="${option.value}" ${currentSettings.theme === option.value ? 'selected' : ''}>${option.text}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="mb-6">
                    <label for="setting-language" class="block text-sm font-medium mb-1">${t.settingsLanguage}</label>
                    <select id="setting-language" class="w-full px-4 py-2 rounded-lg appearance-none ${inputBgClass} focus:ring-primary focus:border-primary transition duration-150">
                        ${languageOptions.map(option => `
                            <option value="${option.value}" ${currentSettings.language === option.value ? 'selected' : ''}>${option.text}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="mb-6 p-3 text-xs rounded-lg ${idBgClass}">
                    <span class="font-bold">User ID:</span> 
                    <span id="user-id-display">${userId}</span>
                </div>
                
                <button type="submit" class="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-opacity-90 transition duration-300 shadow-lg shadow-primary/50">
                    ${t.saveSettings}
                </button>
            </form>
        </div>
    `;
}

// -------------------------------------------------------------------------
// 5. HELPER FUNCTIONS
// -------------------------------------------------------------------------

function createMovieCard(movie) {
    // (createMovieCard function remains the same)
    const isFav = favorites.includes(movie.id);
    const t = translations[currentSettings.language] || translations.english;
    const card = document.createElement('div');
    const bgColorClass = currentSettings.theme === 'light' ? 'bg-white' : 'bg-gray-800';
    
    card.className = `movie-card-bg ${bgColorClass} rounded-xl shadow-lg hover:shadow-primary/50 transition duration-300 transform hover:scale-[1.03] overflow-hidden cursor-pointer w-36 sm:w-40 flex flex-col`;
    card.setAttribute('data-movie-id', movie.id);

    card.innerHTML = `
        <div class="relative w-full h-auto">
            <img src="${movie.thumb}" alt="${movie.title}" onerror="this.onerror=null;this.src='https://placehold.co/110x165/1a1a1a/cccccc?text=Error'" class="w-full h-full object-cover rounded-t-xl" style="height: 165px;">
            ${isFav ? `<div class="absolute top-2 left-2 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>` : ''}
        </div>
        <div class="p-3 flex flex-col justify-between flex-grow">
            <p class="text-sm font-medium leading-tight mb-1 truncate">${movie.title}</p>
            <button onclick="window.playVideo(event, '${movie.id}')" class="mt-2 text-xs font-semibold text-primary hover:text-white hover:bg-primary transition duration-200 py-1 px-2 rounded-full border border-primary">
                ${t.nowPlaying}
            </button>
        </div>
    `;
    return card;
}

function findMovieById(id) {
    for (const category in videos) {
        const movie = videos[category].find(m => m.id === id);
        if (movie) return movie;
    }
    return null;
}

/**
 * Plays the selected video, switching between <video> and <iframe> based on link type.
 * @param {Event} event 
 * @param {string} movieId 
 */
window.playVideo = function(event, movieId) {
    event.stopPropagation();

    const movie = findMovieById(movieId);
    const videoPlayer = document.getElementById('player');
    const iframePlayer = document.getElementById('iframePlayer');
    const source = document.getElementById('videoSource');
    const titleEl = document.getElementById('current-movie-title');
    const t = translations[currentSettings.language] || translations.english;
    
    if (movie) {
        currentPlayingMovie = movie; 
        
        if (movie.type === 'iframe') {
            // Use iframe player
            videoPlayer.pause();
            source.src = '';
            videoPlayer.classList.add('hidden');
            iframePlayer.classList.remove('hidden');
            iframePlayer.src = movie.src; // Set iframe source
            console.log("Playing via Iframe:", movie.src);
        } else {
            // Use HTML5 video player (default for mp4/stream)
            iframePlayer.src = ''; // Clear iframe source
            iframePlayer.classList.add('hidden');
            videoPlayer.classList.remove('hidden');
            
            source.src = movie.src;
            videoPlayer.load();
            videoPlayer.play().catch(error => {
                console.error("Autoplay failed:", error);
            }); 
            console.log("Playing via HTML5 Video:", movie.src);
        }

        titleEl.textContent = `${t.nowPlaying}: ${movie.title}`;
        updateFavoriteButtonState(movie.id);
    } else {
        console.error("Movie not found:", movieId);
    }
}

/**
 * Toggles fullscreen mode for the video player container.
 */
window.toggleFullScreen = function() {
    const playerContainer = document.getElementById('player-container');
    const videoPlayer = document.getElementById('player');
    const iframePlayer = document.getElementById('iframePlayer');
    const activePlayer = videoPlayer.classList.contains('hidden') ? iframePlayer : videoPlayer;
    
    // Note: Fullscreen for the iframe's content depends on the external site's allowance
    // But we can maximize the container itself.

    if (!document.fullscreenElement) {
        playerContainer.requestFullscreen().then(() => {
            // Apply styles to the active player and container
            playerContainer.classList.remove('rounded-xl', 'shadow-2xl', 'shadow-primary/30');
            // Make the active player fill the screen
            activePlayer.style.objectFit = 'contain';
            activePlayer.classList.remove('rounded-xl');
        }).catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen().then(() => {
            // Restore original styles
            playerContainer.classList.add('rounded-xl', 'shadow-2xl', 'shadow-primary/30');
            activePlayer.style.objectFit = 'contain'; // Restore default object-fit
            activePlayer.classList.add('rounded-xl');
        });
    }
}

window.toggleFavorite = function() {
    const favBtn = document.getElementById('favorite-btn');
    const t = translations[currentSettings.language] || translations.english;
    
    if (!currentPlayingMovie) {
        favBtn.classList.add('text-yellow-500', 'shake-error');
        setTimeout(() => {
            favBtn.classList.remove('text-yellow-500', 'shake-error');
        }, 500);
        return;
    }

    const movieId = currentPlayingMovie.id;
    const isFavorite = favorites.includes(movieId);
    
    if (!isFavorite) {
        favorites.push(movieId);
    } else {
        favorites = favorites.filter(id => id !== movieId);
    }

    saveFavoritesToLocalStorage();
    updateFavoriteButtonState(movieId, !isFavorite);
    
    const activeNavBtn = document.querySelector('.nav-btn.text-primary');
    if (activeNavBtn && activeNavBtn.dataset.nav === 'favorites') {
        displayFavorites();
    }
}

function updateFavoriteButtonState(movieId, explicitState = null) {
    if (!movieId) return;
    
    const isFav = explicitState !== null ? explicitState : favorites.includes(movieId);
    const favBtn = document.getElementById('favorite-btn');

    if (isFav) {
        favBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        `;
    } else {
        favBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        `;
    }
}


// -------------------------------------------------------------------------
// 6. INITIALIZATION
// -------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load data first
    await loadDataFromJSON(); 
    // 2. Initialize the rest of the app once data is available
    initializeApp();
});
