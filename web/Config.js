// ========== КОНФИГУРАЦИЯ ==========
const API_BASE = 'http://localhost:5000';
let currentUser = null, currentRole = null;
let dataLoaded = {
    catalogs: false,
    publications: false,
    clients: false,
    reports: false,
    prices: false,
    addresses: false,
    services: false,
    allSubscriptions: false
};

// сбрасываем флаги загрузки (при выходе), чтобы разделы потом подгрузились заново
function resetDataLoaded() {
    Object.keys(dataLoaded).forEach(k => dataLoaded[k] = false);
}
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

// чтобы текст от юзера не поломал вёрстку (html)
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// ========== СТАТУС ПОДПИСКИ ==========
// сравниваем по дням, а не по времени. подписка, что кончается сегодня, ещё
// активна весь день. dateEnd может быть пустым — значит бессрочная.

// обрезаем дату до начала дня (00:00), чтобы сравнивать только по дате
function dayFloor(d) {
    const x = new Date(d);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

// future = ещё не началась, active = идёт сейчас, expired = уже кончилась
function subStatus(sub, ref = new Date()) {
    const today = dayFloor(ref);
    if (sub.dateStart && dayFloor(sub.dateStart) > today) return 'future';
    if (sub.dateEnd && dayFloor(sub.dateEnd) < today) return 'expired';
    return 'active';
}

function isSubActive(sub, ref = new Date()) {
    return subStatus(sub, ref) === 'active';
}

// ========== ЦЕНЫ ==========
// цены лежат записями с периодом [dateStart; dateEnd]. если dateEnd пустой —
// цена действует до сих пор. сделал одну функцию: раньше в каждом разделе
// текущую цену искали по-своему, и они расходились.

// берём цену, которая действует на дату ref. если их вдруг несколько — ту, что
// началась позже. список уже должен быть по одному изданию/услуге. вернёт запись или null
function priceOn(prices, ref = new Date()) {
    const day = dayFloor(ref);
    return (prices || [])
        .filter(p => dayFloor(p.dateStart) <= day && (!p.dateEnd || dayFloor(p.dateEnd) >= day))
        .sort((a, b) => dayFloor(b.dateStart) - dayFloor(a.dateStart))[0] || null;
}

// цена (число) издания/услуги на дату, или null если цены нет
function pubPrice(prices, publicationsID, ref) {
    const p = priceOn((prices || []).filter(x => x.publicationsID === publicationsID), ref);
    return p ? p.price : null;
}
function servicePrice(prices, servicesID, ref) {
    const p = priceOn((prices || []).filter(x => x.servicesID === servicesID), ref);
    return p ? p.price : null;
}

// ========== ХРАНИЛИЩЕ ТОКЕНА ==========
// токен держим в localStorage, а не в cookie: большой JWT в cookie не влезал
// и молча резался, из-за этого профиль падал с 401. методы оставил те же
// (get/set/delete), чтобы не переписывать вызовы по всем файлам.
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

// ========== ОБРАБОТКА ОШИБОК (понятные сообщения на русском) ==========

// превращаем известные ошибки сервера в нормальный русский текст
function translateKnownError(msg) {
    if (!msg) return '';
    const m = String(msg).trim();
    let r;
    if ((r = m.match(/^Name must be shorten than (\d+)!?$/i))) return `Слишком длинное название (максимум ${r[1]} символов).`;
    if ((r = m.match(/^FIO must be shorten than (\d+)!?$/i))) return `Слишком длинное ФИО (максимум ${r[1]} символов).`;
    if (/^Name format error!?$/i.test(m)) return 'Неверный формат названия: используйте русские буквы и начните с заглавной.';
    if (/^FIO format error!?$/i.test(m)) return 'Неверный формат ФИО. Пример: Иванов Иван Иванович (только русские буквы).';
    if (/^Phone format error!?$/i.test(m)) return 'Неверный формат телефона: введите 11 цифр, например 79001234567.';
    if (/^Not Found$/i.test(m)) return 'Запись не найдена.';
    if (/invalid_grant/i.test(m)) return 'Неверный логин или пароль.';
    if ((r = m.match(/Passwords? must be at least (\d+)/i))) return `Пароль слишком короткий (минимум ${r[1]} символов).`;
    if (/Password/i.test(m)) return 'Пароль не соответствует требованиям.';
    if (/is already taken/i.test(m)) return 'Имя пользователя уже занято.';
    return '';
}

function statusMessage(status) {
    if (status === 400) return 'Проверьте правильность введённых данных.';
    if (status === 401) return 'Требуется вход в систему.';
    if (status === 403) return 'Недостаточно прав для выполнения операции.';
    if (status === 404) return 'Запрашиваемая запись не найдена.';
    if (status === 409) return 'Конфликт данных: запись уже существует или используется.';
    if (status >= 500) return 'Ошибка сервера. Попробуйте позже.';
    return 'Не удалось выполнить запрос.';
}

// разбираем ответ сервера (json, массив ошибок, текст или html) в одно понятное сообщение
function humanizeError(status, rawText) {
    const text = (rawText || '').trim();
    let msg = '';
    if (text && !text.startsWith('<')) {
        if (text.startsWith('{')) {
            try { const j = JSON.parse(text); msg = j.error_description || j.error || j.message || j.title || ''; } catch (_) { msg = ''; }
        } else if (text.startsWith('[')) {
            try { msg = JSON.parse(text).map(e => e.description || e.error || e).join(', '); } catch (_) { msg = text; }
        } else {
            msg = text;
        }
    }
    const translated = translateKnownError(msg);
    if (translated) return translated;
    // если уже по-русски и не длинное — показываем как есть
    if (msg && /[А-Яа-яЁё]/.test(msg) && msg.length <= 200) return msg;
    return statusMessage(status);
}
window.humanizeError = humanizeError;

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
            const errorText = await res.text().catch(() => '');
            throw new Error(humanizeError(res.status, errorText));
        }
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await res.json();
        }
        return null;
    } catch (error) {
        console.error('API Error:', error);
        // fetch упал = сервера нет. пишем по-человечески
        if (error instanceof TypeError) {
            throw new Error('Нет связи с сервером. Проверьте, запущен ли API.');
        }
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
        const errorText = await response.text().catch(() => '');
        throw new Error(humanizeError(response.status, errorText));
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
    if (!res.ok) throw new Error(humanizeError(res.status, await res.text().catch(() => '')));
    const data = await res.json();
    window.cookies.set('token', data.access_token);
    // пишем и в currentUser (его читает весь код), и в window.currentUser —
    // иначе один останется null и страница упадёт на currentUser.username
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
window.escapeHtml = escapeHtml;
window.dayFloor = dayFloor;
window.subStatus = subStatus;
window.isSubActive = isSubActive;
window.priceOn = priceOn;
window.pubPrice = pubPrice;
window.servicePrice = servicePrice;
window.resetDataLoaded = resetDataLoaded;