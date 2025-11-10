/**
 * WY MovieBox - Main JavaScript Logic
 * - MP4 support, 'type', and 'id' fields have been removed from JSON.
 * - 'id' is now dynamically generated (action-0, drama-1, etc.).
 * - Video playing relies solely on the iframe player.
 */

// Global state variables
let videos = {};
let translations = {};
let favorites = [];
let currentPlayingMovie = null; 
let currentSettings = {};

// User ID fallback
let userId = localStorage.getItem('localUserId') || crypto.randomUUID();
if (localStorage.getItem('localUserId') === null) {
    localStorage.setItem('localUserId', userId);
}

// Default settings
const defaultSettings = {
    language: 'myanmar',
    theme: 'dark',
    name: '',
    email: ''
};


// -------------------------------------------------------------------------
// 1. DATA FETCHING AND INITIALIZATION
// -------------------------------------------------------------------------

/**
 * Fetches movie data and translations from the JSON file.
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
        console.error("Failed to load JSON data. Ensure the 'videos_photos.json' file exists.", e);
        showCustomAlert("Error", "JSON ဒေတာကို ဖတ်ယူနိုင်ခြင်း မရှိပါ။");
    }
}

/**
 * Automatically generates a unique ID for each video.
 */
function generateVideoIds() {
    for (const category in videos) {
        if (Array.isArray(videos[category])) {
            videos[category].forEach((movie, index) => {
                // Creates a unique ID like "action-0", "drama-1", etc.
                movie.id = `${category}-${index}`; 
            });
        }
    }
}

/**
 * Loads user state and initializes the app.
 */
window.initializeApp = async function() {
    await loadDataFromJSON();
    
    // Update userId based on Firebase (if available)
    if (window.auth && window.auth.currentUser) {
        userId = window.auth.currentUser.uid;
        document.getElementById('user-id-display') && (document.getElementById('user-id-display').textContent = userId);
    } 

    generateVideoIds();

    // Load Settings
    const storedSettings = localStorage.getItem('userSettings');
    try {
        if (storedSettings) {
            currentSettings = { ...defaultSettings, ...JSON.parse(storedSettings) };
        } else {
            currentSettings = { ...defaultSettings };
        }
    } catch (e) {
        currentSettings = { ...defaultSettings };
    }
    
    // Load Favorites
    const storedFavorites = localStorage.getItem('favorites');
    try {
        if (storedFavorites) {
            favorites = JSON.parse(storedFavorites);
            if (!Array.isArray(favorites)) favorites = [];
        } else {
            favorites = [];
        }
    } catch (e) {
        favorites = [];
    }
    
    // Apply settings and render default view
    applySettings();
    const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
    if (homeBtn) {
        changeNav(homeBtn);
    }
}


// -------------------------------------------------------------------------
// 2. LOCAL STORAGE AND FAVORITES HANDLING
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
        changeNav(document.querySelector('.nav-btn[data-nav="home"]'));
        showCustomAlert(translations[currentSettings.language].saveSettings, "ဆက်တင်များကို အောင်မြင်စွာ သိမ်းဆည်းလိုက်ပါပြီ။");
    } catch (e) {
        showCustomAlert("Error", "ဆက်တင်များ သိမ်းဆည်းရာတွင် အမှားဖြစ်ပွားပါသည်။");
    }
}

/**
 * Saves the current favorites array to localStorage.
 */
function saveFavoritesToLocalStorage() {
    try {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (e) {
        console.error("Error saving favorites:", e);
    }
}

/**
 * Toggles the favorite status of the currently playing movie.
 */
window.toggleFavorite = function() {
    const t = translations[currentSettings.language] || translations.english;

    if (!currentPlayingMovie) {
        showCustomAlert("Favorite", t.selectMovieForFavorite);
        return;
    }

    const movieId = currentPlayingMovie.id;
    const index = favorites.indexOf(movieId);

    if (index > -1) {
        favorites.splice(index, 1);
        showCustomAlert("Favorite", `${currentPlayingMovie.title} ကို အနှစ်သက်ဆုံးမှ ဖယ်ရှားလိုက်ပါပြီ။`);
    } else {
        favorites.push(movieId);
        showCustomAlert("Favorite", `${currentPlayingMovie.title} ကို အနှစ်သက်ဆုံး စာရင်းထဲ ထည့်လိုက်ပါပြီ။`);
    }

    saveFavoritesToLocalStorage();
    updateFavoriteButtonState(movieId);

    // Re-render favorites view if active
    const activeNavBtn = document.querySelector('.nav-btn.text-primary');
    if (activeNavBtn && activeNavBtn.dataset.nav === 'favorites') {
        displayFavorites();
    }
}

/**
 * Updates the visual state of the favorite button.
 */
function updateFavoriteButtonState(movieId) {
    const favoriteBtn = document.getElementById('favorite-btn');
    const isFav = movieId ? favorites.includes(movieId) : false; 
    
    const fillPath = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';
    const outlinePath = 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z';
    
    favoriteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" 
             fill="${isFav ? 'currentColor' : 'none'}" 
             stroke="${isFav ? 'none' : 'currentColor'}" 
             stroke-width="${isFav ? '0' : '2'}" 
             stroke-linecap="round" stroke-linejoin="round">
             <path d="${isFav ? fillPath : outlinePath}"/>
        </svg>
    `;
    favoriteBtn.classList.toggle('text-red-500', isFav);
    favoriteBtn.classList.toggle('text-gray-400', !isFav);
}


// -------------------------------------------------------------------------
// 3. UI AND VIEW MANAGEMENT (Theme/Language/Navigation)
// -------------------------------------------------------------------------

/**
 * Applies the current settings (theme and language) to the UI.
 */
function applySettings() {
    const { theme, language } = currentSettings;
    const isLight = theme === 'light';

    // Apply Theme (using custom CSS classes defined in style.css)
    const bodyRoot = document.getElementById('body-root');
    const headerSticky = document.getElementById('header-sticky');
    const navBar = document.getElementById('nav-bar');
    
    bodyRoot.classList.toggle('bg-gray-100', isLight);
    bodyRoot.classList.toggle('text-gray-900', isLight);
    bodyRoot.classList.toggle('bg-darkbg', !isLight);
    bodyRoot.classList.toggle('text-white', !isLight);
    
    headerSticky.classList.toggle('bg-white', isLight);
    headerSticky.classList.toggle('border-gray-200', isLight);
    headerSticky.classList.toggle('bg-darkbg', !isLight);
    headerSticky.classList.toggle('border-gray-700', !isLight);

    navBar.classList.toggle('bg-white', isLight);
    navBar.classList.toggle('border-gray-200', isLight);
    navBar.classList.toggle('shadow-gray-400/80', isLight);
    navBar.classList.toggle('bg-midbg', !isLight);
    navBar.classList.toggle('border-gray-700', !isLight);
    navBar.classList.toggle('shadow-black/80', !isLight);

    // Apply Language
    applyLanguage(language);
    
    // Re-render the current view
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
 * Translates all UI elements.
 */
function applyLanguage(language) {
    const t = translations[language] || translations.english;
    const isLight = currentSettings.theme === 'light';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    document.getElementById('main-title').textContent = t.title;
    
    document.querySelectorAll('.menu-btn').forEach(btn => {
        const categoryKey = btn.getAttribute('data-category');
        if (t[categoryKey]) {
            btn.textContent = t[categoryKey];
        }
        if (!btn.classList.contains('active-category')) {
             btn.classList.remove('bg-gray-800', 'text-white', 'bg-gray-200', 'text-gray-800', 'hover:bg-gray-700', 'hover:bg-gray-300');
             btn.classList.add(isLight ? 'bg-gray-200' : 'bg-gray-800', isLight ? 'text-gray-800' : 'text-white');
             btn.classList.add(isLight ? 'hover:bg-gray-300' : 'hover:bg-gray-700');
        }
    });

    const currentTitleEl = document.getElementById('current-movie-title');
    if (!currentPlayingMovie) {
        currentTitleEl.textContent = t.selectMovie;
    } else {
        currentTitleEl.textContent = `${t.nowPlaying}: ${currentPlayingMovie.title}`;
    }
    
    updateFavoriteButtonState(currentPlayingMovie ? currentPlayingMovie.id : null);
}


/**
 * Changes the main view based on bottom navigation.
 */
window.changeNav = function(btn) {
    const nav = btn.dataset.nav;
    const navBtns = document.querySelectorAll('.nav-btn');
    const menuBar = document.getElementById('menu-bar');
    const playerContainer = document.getElementById('player-container');
    const headerSticky = document.getElementById('header-sticky');
    const moviesContainer = document.getElementById('movies');

    navBtns.forEach(b => {
        b.classList.remove('text-primary', 'font-bold');
        b.classList.add('text-gray-400', 'hover:text-white');
    });

    btn.classList.add('text-primary', 'font-bold');
    btn.classList.remove('text-gray-400', 'hover:text-white');

    moviesContainer.innerHTML = '';

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
 */
window.showCategory = function(category, clickedButton) {
    const moviesContainer = document.getElementById('movies');
    moviesContainer.innerHTML = '';
    
    const t = translations[currentSettings.language] || translations.english;
    const isLight = currentSettings.theme === 'light';

    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active-category', 'bg-primary', 'text-black');
        btn.classList.add(isLight ? 'bg-gray-200' : 'bg-gray-800', isLight ? 'text-gray-800' : 'text-white');
        btn.classList.add(isLight ? 'hover:bg-gray-300' : 'hover:bg-gray-700');
    });

    if (clickedButton) {
        clickedButton.classList.remove('bg-gray-800', 'text-white', 'bg-gray-200', 'text-gray-800', 'hover:bg-gray-700', 'hover:bg-gray-300');
        clickedButton.classList.add('active-category', 'bg-primary', 'text-black');
    }

    const categoryVideos = videos[category] || [];
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
// 5. HELPER AND VIDEO FUNCTIONS
// -------------------------------------------------------------------------

/**
 * Creates the HTML element for a single movie card.
 */
function createMovieCard(movie) {
    const movieId = movie.id; 
    const isFav = favorites.includes(movieId);
    const t = translations[currentSettings.language] || translations.english;
    const card = document.createElement('div');
    const bgColorClass = currentSettings.theme === 'light' ? 'bg-white' : 'bg-gray-800';
    
    card.className = `movie-card-bg ${bgColorClass} rounded-xl shadow-lg hover:shadow-primary/50 transition duration-300 transform hover:scale-[1.03] overflow-hidden cursor-pointer w-36 sm:w-40 flex flex-col`;
    card.setAttribute('data-movie-id', movieId);

    card.innerHTML = `
        <div class="relative w-full h-auto">
            <img src="${movie.thumb}" alt="${movie.title}" onerror="this.onerror=null;this.src='https://placehold.co/110x165/1a1a1a/cccccc?text=Error'" class="w-full h-full object-cover rounded-t-xl" style="height: 165px;">
            ${isFav ? `<div class="absolute top-2 left-2 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>` : ''}
        </div>
        <div class="p-3 flex flex-col justify-between flex-grow">
            <p class="text-sm font-medium leading-tight mb-1 truncate">${movie.title}</p>
            <button onclick="window.playVideo(event, '${movieId}')" class="mt-2 text-xs font-semibold text-primary hover:text-black hover:bg-primary transition duration-200 py-1 px-2 rounded-full border border-primary">
                ${t.nowPlaying}
            </button>
        </div>
    `;
    return card;
}

/**
 * Finds a movie object using its dynamically generated ID.
 */
function findMovieById(id) {
    for (const category in videos) {
        const movie = videos[category].find(m => m.id === id); 
        if (movie) return movie;
    }
    return null;
}

/**
 * Plays the selected video using ONLY the <iframe> player.
 */
window.playVideo = function(event, movieId) {
    event.stopPropagation();

    const movie = findMovieById(movieId);
    const iframePlayer = document.getElementById('iframePlayer');
    const titleEl = document.getElementById('current-movie-title');
    const t = translations[currentSettings.language] || translations.english;
    
    if (movie) {
        currentPlayingMovie = movie; 
        
        // Since MP4 logic is removed, we directly use the src for iframe
        iframePlayer.src = movie.src; 

        titleEl.textContent = `${t.nowPlaying}: ${movie.title}`;
        updateFavoriteButtonState(movie.id);
    } else {
        showCustomAlert("Error", "ရုပ်ရှင်ရှာမတွေ့ပါ။");
    }
}

/**
 * Toggles fullscreen mode for the video player container.
 */
window.toggleFullScreen = function() {
    const playerContainer = document.getElementById('player-container');
    const iframePlayer = document.getElementById('iframePlayer');
    const activePlayer = iframePlayer; 

    if (!document.fullscreenElement) {
        playerContainer.requestFullscreen().then(() => {
            playerContainer.classList.remove('rounded-xl', 'shadow-2xl', 'shadow-primary/30');
            activePlayer.classList.remove('rounded-xl');
            activePlayer.style.objectFit = 'contain';
        }).catch(err => {
            showCustomAlert("Fullscreen Error", "ဖန်သားပြင်အပြည့်ပြသရာတွင် အမှားဖြစ်ပွားပါသည်။");
        });
    } else {
        document.exitFullscreen().then(() => {
            playerContainer.classList.add('rounded-xl', 'shadow-2xl', 'shadow-primary/30');
            activePlayer.classList.add('rounded-xl');
            activePlayer.style.objectFit = 'cover';
        });
    }
}

/**
 * Displays a custom modal alert.
 */
window.showCustomAlert = function(title, message) {
    const modal = document.getElementById('custom-alert-modal');
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Closes the custom modal alert.
 */
window.closeCustomAlert = function() {
    const modal = document.getElementById('custom-alert-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Initial application load (ensures initializeApp runs)
if (typeof window.initializeApp === 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        if (!window.db) { 
            window.initializeApp();
        }
    });
}
