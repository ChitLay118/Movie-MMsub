/**
 * WY MovieBox - Main JavaScript Logic (v3.4 - ModApp opens in External Browser)
 * * Key features:
 * - **ModApp External Open:** ModApp navigation button opens the URL directly in the phone's default browser.
 */

// Global state variables
let videos = {};
let translations = {};
let favorites = [];
let currentPlayingMovie = null; 
let currentSettings = {};

const defaultSettings = {
    language: 'myanmar',
    theme: 'dark', // 'dark' or 'light'
};

const ADULT_WEBVIEW_URL = 'https://allkar.vercel.app/';
const MODAPP_WEBVIEW_URL = 'https://myanmar-tv.vercel.app/'; 


// -------------------------------------------------------------------------
// 1. DATA FETCHING AND INITIALIZATION
// -------------------------------------------------------------------------

async function loadDataFromJSON() {
    try {
        const response = await fetch('videos_photos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        videos = data.videos || {};
        translations = data.translations || {};
        console.log("Data loaded successfully from JSON. (v3.4)");
    } catch (e) {
        console.error("Failed to load JSON data. Content will be empty.", e);
        const t = translations.myanmar || { Error: "Error", jsonError: "ရုပ်ရှင်ဒေတာများ ဖတ်ယူနိုင်ခြင်း မရှိပါ (JSON Error)။" };
        showCustomAlert(t.Error, t.jsonError);
    }
}

function generateVideoIds() {
    let idCounter = 1;
    for (const category in videos) {
        videos[category] = videos[category].map(movie => {
            if (!movie.id) {
                movie.id = 'v' + idCounter++;
            }
            return movie;
        });
    }
}

function enableButtons() {
    const navBar = document.getElementById('nav-bar');
    const menuBar = document.getElementById('menu-bar');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
    
    navBar.classList.remove('pointer-events-none', 'opacity-50');
    menuBar.classList.remove('pointer-events-none', 'opacity-50');
}

window.initializeApp = async function() {
    
    // 1. Load Data
    await loadDataFromJSON(); 
    generateVideoIds(); 

    // 2. Load Local State (Settings/Favorites)
    const storedSettings = localStorage.getItem('userSettings');
    const storedFavorites = localStorage.getItem('favorites');
    
    try {
        currentSettings = storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : { ...defaultSettings };
    } catch (e) {
        currentSettings = { ...defaultSettings };
    }
    
    try {
        favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
        if (!Array.isArray(favorites)) favorites = [];
    } catch (e) {
        favorites = [];
    }
    
    // 3. Apply Settings (Theme and Language)
    applySettings();
    
    // 4. Enable Buttons
    enableButtons(); 
    
    const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
    if (homeBtn) {
        changeNav(homeBtn); 
    } else {
         console.error("Home navigation button not found.");
    }
}


// -------------------------------------------------------------------------
// 2. LOCAL STORAGE AND FAVORITES HANDLING
// -------------------------------------------------------------------------

function saveFavorites() {
    try {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (e) { /* Error */ }
}

window.toggleFavorite = function() {
    if (!currentPlayingMovie || !currentPlayingMovie.id) return;

    const movieId = currentPlayingMovie.id;
    const index = favorites.indexOf(movieId);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(movieId);
    }

    saveFavorites();
    updateFavoriteButtonState(movieId);
    
    const activeNav = document.querySelector('.nav-btn.text-primary')?.dataset.nav;
    if (activeNav === 'favorites') {
        displayFavorites();
    }
}

function updateFavoriteButtonState(movieId) {
    const favoriteBtn = document.getElementById('favorite-btn');
    if (!favoriteBtn) return;

    if (favorites.includes(movieId)) {
        favoriteBtn.classList.add('text-red-500');
        favoriteBtn.classList.remove('text-gray-500');
    } else {
        favoriteBtn.classList.add('text-gray-500');
        favoriteBtn.classList.remove('text-red-500');
    }
}


// -------------------------------------------------------------------------
// 3. UI AND VIEW MANAGEMENT (Navigation Logic)
// -------------------------------------------------------------------------

function applySettings() {
    const lang = currentSettings.language;
    const body = document.getElementById('body-root');
    
    // Theme Application
    if (currentSettings.theme === 'light') {
        body.classList.add('light-mode');
        document.getElementById('header-sticky').classList.remove('bg-darkbg');
        document.getElementById('header-sticky').classList.add('bg-midbg');
    } else {
        body.classList.remove('light-mode');
        document.getElementById('header-sticky').classList.remove('bg-midbg');
        document.getElementById('header-sticky').classList.add('bg-darkbg');
    }

    // Language Application
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        } else if (translations.myanmar && translations.myanmar[key]) {
             el.textContent = translations.myanmar[key]; 
        }
    });
}

window.changeTheme = function(theme) {
    currentSettings.theme = theme;
    try {
        localStorage.setItem('userSettings', JSON.stringify(currentSettings));
    } catch (e) { /* Error */ }
    
    applySettings();
    
    const activeNavBtn = document.querySelector('.nav-btn.text-primary');
    if (activeNavBtn) {
        changeNav(activeNavBtn);
    }
}

window.changeNav = function(btn) {
    const nav = btn.dataset.nav;
    const navBtns = document.querySelectorAll('.nav-btn');
    const menuBar = document.getElementById('menu-bar');
    const playerContainer = document.getElementById('player-container');
    const currentTitleBar = document.querySelector('.max-w-3xl.mx-auto.flex.justify-between.items-center.mt-0.mb-6.px-2.w-full');
    const moviesContainer = document.getElementById('movies');
    
    // Reset all nav buttons
    navBtns.forEach(b => {
        b.classList.remove('text-primary', 'font-bold');
        b.classList.add('text-gray-400', 'hover:text-white');
    });

    // Set active nav button
    btn.classList.add('text-primary', 'font-bold');
    btn.classList.remove('text-gray-400', 'hover:text-white'); 

    // Reset grid/flex properties before content load
    moviesContainer.innerHTML = '';
    
    // Header/Player visibility and Layout Control
    if (nav === 'profile' || nav === 'modapp') { // Modapp will trigger layout change 
        menuBar.classList.add('hidden');
        playerContainer.classList.add('hidden');
        if (currentTitleBar) currentTitleBar.classList.add('hidden'); 
        
        moviesContainer.classList.remove('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'gap-2', 'justify-items-center', 'px-0');
        moviesContainer.classList.add('flex', 'flex-col', 'w-full', 'pt-4'); 
        
    } else {
        menuBar.classList.remove('hidden');
        playerContainer.classList.remove('hidden');
        if (currentTitleBar) currentTitleBar.classList.remove('hidden'); 
        
        moviesContainer.classList.remove('flex', 'flex-col', 'w-full', 'pt-4');
        moviesContainer.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'gap-2', 'justify-items-center', 'px-0');
    }

    // Load Content
    switch (nav) {
        case 'home':
            const activeCategoryBtn = document.querySelector('.menu-btn.active-category') || document.querySelector('.menu-btn[data-category="action"]');
            if (activeCategoryBtn) {
                showCategory(activeCategoryBtn.dataset.category, activeCategoryBtn);
            } else if (videos.action) {
                 showCategory('action', document.querySelector('.menu-btn[data-category="action"]'));
            } else {
                const t = translations[currentSettings.language] || translations.myanmar;
                moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.noContent || 'No Content Available'}</h2>`; 
            }
            break;

        case 'trending':
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active-category', 'active-category-blue', 'text-white', 'bg-gray-800');
                btn.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
            });
            displayTrending();
            break;

        case 'favorites':
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active-category', 'active-category-blue', 'text-white', 'bg-gray-800');
                btn.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
            });
            displayFavorites();
            break;
            
        case 'modapp': 
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active-category', 'active-category-blue', 'text-white', 'bg-gray-800');
                btn.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
            });
            
            // ⭐️ Browser တွင် တိုက်ရိုက်ဖွင့်ခြင်း
            window.open(MODAPP_WEBVIEW_URL, '_blank'); 
            
            // ဖွင့်ပြီးပါက Home သို့ ချက်ချင်းပြန်လှည့်ခြင်း
            const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
            if (homeBtn) {
                 changeNav(homeBtn);
            }
            break;


        case 'profile':
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.classList.remove('active-category', 'active-category-blue', 'text-white', 'bg-gray-800');
                btn.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
            });
            displayProfileSettings();
            break;
    }
}

window.changeLanguage = function(lang) {
    currentSettings.language = lang;
    try {
        localStorage.setItem('userSettings', JSON.stringify(currentSettings));
    } catch (e) { /* Error */ }
    applySettings();
    const activeNavBtn = document.querySelector('.nav-btn.text-primary');
    if (activeNavBtn) {
        changeNav(activeNavBtn);
    }
}


// -------------------------------------------------------------------------
// 4. RENDERING LOGIC (Category/Trending/Favorites/Profile)
// -------------------------------------------------------------------------

window.showCategory = function(category, btn) {
    const moviesContainer = document.getElementById('movies');
    moviesContainer.innerHTML = '';
    
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.classList.remove('active-category', 'active-category-blue', 'text-white');
        b.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
    });

    if (btn) {
        btn.classList.add('active-category', 'active-category-blue', 'text-white');
        btn.classList.remove('bg-gray-800', 'hover:bg-gray-700');
    }

    const moviesList = videos[category] || [];
    if (moviesList.length === 0) {
        const t = translations[currentSettings.language] || translations.myanmar;
        moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.noContent || 'No Content Available'}</h2>`;
        return;
    }

    moviesList.forEach(movie => {
        moviesContainer.appendChild(createMovieCard(movie));
    });
};

function displayTrending() {
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.classList.remove('active-category', 'active-category-blue', 'text-white');
        b.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
    });

    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.myanmar;
    
    const trendingMovies = videos.trending || []; 
    
    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.trendingTitle || 'Trending Movies'}</h2>`;
    
    if (trendingMovies.length === 0) {
        moviesContainer.innerHTML += `<p class="text-center w-full text-gray-500 col-span-full">${t.noContent || 'No Content Available'}</p>`;
        return;
    }

    trendingMovies.forEach(movie => {
        moviesContainer.appendChild(createMovieCard(movie));
    });
}

function displayFavorites() {
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.classList.remove('active-category', 'active-category-blue', 'text-white');
        b.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
    });

    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.myanmar;

    const favoriteMovies = favorites.map(id => findMovieById(id)).filter(movie => movie !== null);
    
    moviesContainer.innerHTML = `<h2 class="text-xl font-bold text-center w-full mb-4 text-white/80 col-span-full">${t.favoritesTitle || 'My Favorites'}</h2>`;

    if (favoriteMovies.length === 0) {
        moviesContainer.innerHTML += `<p class="text-center w-full text-gray-500 col-span-full">${t.noFavorites || 'No favorite movies added yet.'}</p>`;
        return;
    }

    favoriteMovies.forEach(movie => {
        moviesContainer.appendChild(createMovieCard(movie));
    });
}

function displayProfileSettings() {
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.classList.remove('active-category', 'active-category-blue', 'text-white');
        b.classList.add('bg-gray-800', 'text-white', 'hover:bg-gray-700');
    });
    
    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.myanmar;
    
    moviesContainer.innerHTML = `
        <div class="max-w-md mx-auto w-full space-y-6">
            <h2 class="text-3xl font-bold text-primary">${t.profileTitle || 'User Profile'}</h2>
            
            <div class="p-4 bg-gray-800 rounded-lg shadow-lg">
                <h3 class="text-xl font-semibold mb-3">${t.settingsTitle || 'Settings'}</h3>
                
                <div class="flex justify-between items-center mb-4">
                    <p>${t.themeLabel || 'Theme:'}</p>
                    <select id="theme-select" onchange="changeTheme(this.value)" class="bg-gray-700 text-white p-2 rounded">
                        <option value="dark" ${currentSettings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="light" ${currentSettings.theme === 'light' ? 'selected' : ''}>Light</option>
                    </select>
                </div>

                <div class="flex justify-between items-center mb-4">
                    <p>${t.languageLabel || 'Language:'}</p>
                    <select id="language-select" onchange="changeLanguage(this.value)" class="bg-gray-700 text-white p-2 rounded">
                        <option value="myanmar" ${currentSettings.language === 'myanmar' ? 'selected' : ''}>${t.langMyanmar || 'Myanmar'}</option>
                        <option value="english" ${currentSettings.language === 'english' ? 'selected' : ''}>${t.langEnglish || 'English'}</option>
                    </select>
                </div>
                
                <button onclick="localStorage.clear(); window.location.reload();" class="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition duration-200">
                    ${t.resetData || 'Reset App Data'}
                </button>
            </div>

            <button onclick="openAdultWebview()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-xl flex items-center justify-center space-x-2 transition duration-200">
                <span class="text-xl">🔞</span>
                <span class="text-lg" data-i18n="adultContent">လူကြီးကားများကြည့်ရန် (18+)</span>
            </button>
        </div>
    `;

    document.getElementById('theme-select').value = currentSettings.theme;
}


// -------------------------------------------------------------------------
// 5. HELPER AND VIDEO FUNCTIONS
// -------------------------------------------------------------------------

function createMovieCard(movie) {
    const movieId = movie.id; 
    const isFav = favorites.includes(movieId); 
    const t = translations[currentSettings.language] || translations.myanmar;
    const card = document.createElement('div');
    const bgColorClass = currentSettings.theme === 'light' ? 'bg-white' : 'bg-gray-800';
    
    card.className = `movie-card-bg ${bgColorClass} rounded-lg shadow-md hover:shadow-primary/50 transition duration-300 transform hover:scale-[1.03] overflow-hidden cursor-pointer w-full flex flex-col`;
    card.setAttribute('data-movie-id', movieId);

    // aspect-video (16:9) ratio
    card.innerHTML = `
        <div class="relative w-full aspect-video" onclick="window.playVideo('${movieId}')"> 
            <img src="${movie.thumb}" alt="${movie.title}" onerror="this.onerror=null;this.src='https://placehold.co/100x100/1a1a1a/cccccc?text=WY'" class="w-full h-full object-cover rounded-t-lg absolute">
            ${isFav ? `<div class="absolute top-1 left-1 text-primary z-10">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>` : ''}
        </div>
        <div class="p-1 flex flex-col justify-between flex-grow">
            <p class="text-[0.6rem] font-medium leading-tight mb-1 truncate">${movie.title}</p> 
            <button onclick="window.playVideo('${movieId}')" class="mt-1 text-[0.6rem] font-semibold text-primary hover:text-black hover:bg-primary transition duration-200 py-1 px-1 rounded-full border border-primary">
                ${t.nowPlaying || 'Play Now'}
            </button>
        </div>
    `;
    return card;
}

window.playVideo = function(movieId) {
    const movie = findMovieById(movieId);
    
    if (!movie) {
        showCustomAlert("Error", "ရုပ်ရှင်ဒေတာရှာမတွေ့ပါ");
        return;
    }
    
    currentPlayingMovie = movie;

    document.getElementById('iframePlayer').src = movie.src;
    document.getElementById('current-movie-title').textContent = movie.title;
    
    updateFavoriteButtonState(movieId);
}


function findMovieById(id) {
    for (const category in videos) {
        const movie = videos[category].find(movie => movie.id === id);
        if (movie) return movie;
    }
    return null;
}

function toggleFullScreen() {
    const playerContainer = document.getElementById('player-container');
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        playerContainer.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
}

let alertTimeout;
window.showCustomAlert = function(title, message) {
    const modal = document.getElementById('custom-alert-modal');
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    modal.classList.remove('hidden');
    clearTimeout(alertTimeout);
    alertTimeout = setTimeout(closeCustomAlert, 5000); // Auto close after 5 seconds
}

window.closeCustomAlert = function() {
    document.getElementById('custom-alert-modal').classList.add('hidden');
    clearTimeout(alertTimeout);
}


// -------------------------------------------------------------------------
// 6. ADULT WEBVIEW LOGIC (ModApp logic is now in changeNav)
// -------------------------------------------------------------------------

window.openAdultWebview = function() {
    const modal = document.getElementById('adult-webview-modal');
    const iframe = document.getElementById('adultWebviewIframe');
    
    iframe.src = ADULT_WEBVIEW_URL;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

window.closeAdultWebview = function() {
    const modal = document.getElementById('adult-webview-modal');
    const iframe = document.getElementById('adultWebviewIframe');
    
    iframe.src = 'about:blank'; 
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}


// Initial application load 
window.addEventListener('DOMContentLoaded', () => {
    window.initializeApp();
});
