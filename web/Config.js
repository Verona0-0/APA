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

// ========== COOKIES ==========
window.cookies = {
    set(name, value, days = 7) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
    },
    get(name) {
        return document.cookie.split('; ').reduce((r, v) => {
            const parts = v.split('=');
            return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
    },
    delete(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
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
    window.currentUser = await window.api('/api/Users/profile');
    window.currentRole = window.currentUser.roles?.[0]?.toLowerCase() || 'client';
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