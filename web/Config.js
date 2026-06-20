// ========== КОНФИГУРАЦИЯ ==========
const API_BASE = 'http://localhost:5000';
let currentUser = null, currentRole = null;
let dataLoaded = {
    catalogs: false,
    publications: false,
    clients: false,
    reports: false,
    prices: false
};
let currentClients = [], currentPublications = [], currentCatalogs = [], allPrices = [];

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

function formatDateLocale(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
}

// ========== ХРАНИЛИЩЕ ТОКЕНА ==========
// Токен держим в localStorage, а не в document.cookie: ~2 КБ JWT в cookie
// не помещался (cookie молча обрезался в пустоту), и профиль падал с 401.
// API объекта намеренно оставлен прежним (get/set/delete), чтобы не править вызовы в других файлах.
window.cookies = {
    set(name, value) {
        localStorage.setItem(name, value);
    },
    get(name) {
        return localStorage.getItem(name) || '';
    },
    delete(name) {
        localStorage.removeItem(name);
    }
};

// ========== API ==========
window.api = async function (endpoint, options = {}) {
    const token = window.cookies.get('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Ошибка запроса');
        }
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await res.json();
        }
        return null;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// ========== АВТОРИЗАЦИЯ ==========
window.register = async function (userData) {
    const response = await fetch(`${API_BASE}/api/Users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Ошибка регистрации');
    }
    return await response.json();
};

window.login = async function (username, password) {
    const form = new URLSearchParams();
    form.append('grant_type', 'password');
    form.append('username', username);
    form.append('password', password);
    form.append('scope', 'api1');
    form.append('client_id', 'spa_client');

    const res = await fetch(`${API_BASE}/connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    window.cookies.set('token', data.access_token);
    // Пишем в саму переменную currentUser (её читает весь остальной код),
    // а window.* держим синхронно — иначе профиль уходит в window.currentUser,
    // а currentUser остаётся null и страница падает на currentUser.username.
    currentUser = await window.api('/api/Users/profile');
    currentRole = currentUser.roles?.[0]?.toLowerCase() || 'client';
    window.currentUser = currentUser;
    window.currentRole = currentRole;
    return data;
};


window.currentUser = currentUser;
window.currentRole = currentRole;
window.dataLoaded = dataLoaded;
window.currentClients = currentClients;
window.currentPublications = currentPublications;
window.currentCatalogs = currentCatalogs;
window.allPrices = allPrices;
window.API_BASE = API_BASE;
window.formatDate = formatDate;
window.formatDateLocale = formatDateLocale;