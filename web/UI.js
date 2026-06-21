// ========== UI ==========

// Карта разделов: какая функция грузит данные, какой флаг отвечает за
// «уже загружено» и в какой контейнер показывать спиннер.
const sectionConfig = {
    subscriptions:       { load: () => loadReports(),           key: 'reports',         container: 'reports-grid',          title: 'Отчёты' },
    catalogs:            { load: () => loadCatalogs(),          key: 'catalogs',        container: 'catalogs-grid',         title: 'Каталоги' },
    publications:        { load: () => loadPublications(),      key: 'publications',    container: 'publications-grid',     title: 'Издания' },
    prices:              { load: () => loadSubscriptionPrices(),key: 'prices',          container: 'prices-grid',           title: 'Цены' },
    clients:             { load: () => loadClients(),           key: 'clients',         container: 'clients-grid',          title: 'Клиенты' },
    addresses:           { load: () => loadAddressSection(),    key: 'addresses',       container: 'delivery-address-tree', title: 'Адреса доставки' },
    services:            { load: () => loadServicesSection(),   key: 'services',        container: 'services-list',         title: 'Сервисы' },
    'all-subscriptions': { load: () => loadAllSubscriptions(),  key: 'allSubscriptions',container: 'all-subs-container',     title: 'Подписки' }
};

function showSectionLoading(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Загрузка…</span></div>';
}
window.showSectionLoading = showSectionLoading;

// Заменяет спиннер сообщением об ошибке, чтобы он не «висел» вечно.
function showSectionError(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '<div class="empty-msg">Не удалось загрузить данные. Нажмите «Обновить», чтобы повторить.</div>';
}
window.showSectionError = showSectionError;

window.showSection = function (section) {
    document.querySelectorAll('.section, .menu-item').forEach(el => el.classList.remove('active'));
    document.getElementById(section)?.classList.add('active');
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
    const cfg = sectionConfig[section];
    document.getElementById('page-title').textContent = cfg?.title || '';

    // Ленивая автозагрузка: данные подтягиваются при первом открытии раздела.
    if (cfg && !dataLoaded[cfg.key]) {
        showSectionLoading(cfg.container);
        cfg.load();
    }
};

// Принудительное обновление раздела (кнопка «Обновить»).
window.refreshSection = function (section) {
    const cfg = sectionConfig[section];
    if (!cfg) return;
    dataLoaded[cfg.key] = false;
    showSectionLoading(cfg.container);
    cfg.load();
};

window.notify = function (text, type = 'success') {
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.textContent = text;
    document.getElementById('notifications').appendChild(div);
    setTimeout(() => div.remove(), 4000);
};

window.openModal = function (id) { document.getElementById(id).classList.remove('hidden'); };
window.closeModal = function (id) { document.getElementById(id).classList.add('hidden'); };

// Блокирует кнопку и показывает на ней спиннер на время async-операции.
// Использование в onclick: withButtonLoading(this, () => saveX())
window.withButtonLoading = async function (btn, fn) {
    if (!btn) return fn();
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>';
    try { return await fn(); }
    finally { btn.disabled = false; btn.innerHTML = original; }
};

// ========== ДИАЛОГИ (замена браузерных confirm/prompt) ==========

let _confirmResolve = null;
let _promptResolve = null;

// confirmDialog('Удалить издание?') -> Promise<boolean>
window.confirmDialog = function (message, opts = {}) {
    return new Promise(resolve => {
        _confirmResolve = resolve;
        document.getElementById('confirm-title').textContent = opts.title || 'Подтверждение';
        document.getElementById('confirm-message').textContent = message;
        const okBtn = document.getElementById('confirm-ok');
        okBtn.textContent = opts.confirmText || 'Удалить';
        okBtn.className = opts.danger === false ? 'btn-primary' : 'btn-danger';
        openModal('confirm-modal');
        okBtn.focus();
    });
};

function resolveConfirm(value) {
    closeModal('confirm-modal');
    const r = _confirmResolve;
    _confirmResolve = null;
    if (r) r(value);
}

// promptDialog('Новое название:', 'старое') -> Promise<string|null>
window.promptDialog = function (label, defaultValue = '', opts = {}) {
    return new Promise(resolve => {
        _promptResolve = resolve;
        document.getElementById('prompt-title').textContent = opts.title || 'Изменить';
        document.getElementById('prompt-label').textContent = label;
        const input = document.getElementById('prompt-input');
        input.value = defaultValue ?? '';
        document.getElementById('prompt-save').textContent = opts.saveText || 'Сохранить';
        openModal('prompt-modal');
        input.focus();
        input.select();
    });
}

function resolvePrompt(value) {
    closeModal('prompt-modal');
    const r = _promptResolve;
    _promptResolve = null;
    if (r) r(value);
}

// Закрытие модалки по Esc и клику на затемнение. Диалоги при этом
// «отменяются» (резолвятся в false/null), а auth-modal не закрываем.
function closeTopmostModal() {
    const open = [...document.querySelectorAll('.modal-overlay:not(.hidden)')];
    if (!open.length) return;
    dismissModal(open[open.length - 1]);
}

function dismissModal(overlay) {
    if (!overlay || overlay.id === 'auth-modal') return;
    if (overlay.id === 'confirm-modal') return resolveConfirm(false);
    if (overlay.id === 'prompt-modal') return resolvePrompt(null);
    overlay.classList.add('hidden');
}

// Навешивает обработчики диалогов и закрытия модалок. Вызывается из Init.js
// после готовности DOM.
window.setupDialogs = function () {
    document.getElementById('confirm-ok')?.addEventListener('click', () => resolveConfirm(true));
    document.getElementById('confirm-cancel')?.addEventListener('click', () => resolveConfirm(false));
    document.getElementById('prompt-save')?.addEventListener('click', () => resolvePrompt(document.getElementById('prompt-input').value));
    document.getElementById('prompt-cancel')?.addEventListener('click', () => resolvePrompt(null));
    document.getElementById('prompt-close')?.addEventListener('click', () => resolvePrompt(null));
    document.getElementById('prompt-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') resolvePrompt(e.target.value);
    });

    // Esc — закрыть верхнюю модалку.
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeTopmostModal();
    });
    // Клик на затемнённый фон — закрыть именно эту модалку.
    document.addEventListener('click', e => {
        if (e.target.classList?.contains('modal-overlay') && !e.target.classList.contains('hidden')) {
            dismissModal(e.target);
        }
    });
};

// --- Список клиентов ---

function renderClientsList(clients) {
    const grid = document.getElementById('clients-grid');
    const searchVal = document.getElementById('client-search')?.value || '';
    grid.innerHTML = `
        <div style="margin-bottom:1rem;">
            <input type="text" id="client-search" placeholder="Поиск по ФИО или телефону..." class="field-input" value="${searchVal}">
        </div>
        <div>
            ${clients.length ? clients.map(c => `
                <div class="list-row" style="cursor:pointer;" onclick="showClientDetails(${c.clientID})">
                    <div>
                        <strong>${c.fio || `Клиент ${c.clientID}`}</strong>
                        ${c.phone ? `<span style="margin-left:0.75rem;color:#7f8c8d;font-size:0.9rem;">📞 ${c.phone}</span>` : ''}
                    </div>
                    <div class="row-actions">
                        <button class="btn-secondary" onclick="event.stopPropagation();showClientDetails(${c.clientID})">Управление</button>
                        <button class="btn-danger" onclick="deleteClient(${c.clientID}, event)">Удалить</button>
                    </div>
                </div>
            `).join('') : '<div class="empty-msg">Клиенты не найдены</div>'}
        </div>
    `;
    document.getElementById('client-search')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const filtered = currentClients.filter(c =>
            (c.fio || '').toLowerCase().includes(q) || (c.phone || '').includes(q)
        );
        renderClientsList(filtered);
    });
}

// --- Список изданий (с обложками) ---

function renderPublicationsList(publications) {
    const grid = document.getElementById('publications-grid');
    if (!grid) return;
    if (!publications.length) {
        grid.innerHTML = '<div class="card"><div class="card-title">Издания не найдены</div></div>';
        return;
    }
    grid.innerHTML = publications.map((p, i) => `
        <div class="card">
            <div id="pcover-${p.id}" class="pub-cover-card" style="background:hsl(${200 + i * 23},60%,88%);">
                <span style="font-size:2.5rem;">📚</span>
            </div>
            <div class="card-title" style="margin-top:0.75rem;">${p.name}</div>
            <div class="card-price">${p.priceText}</div>
            ${p.hasDescriptions ? '<div style="text-align:center;color:#7f8c8d;font-size:0.85rem;margin-bottom:0.5rem;">📝 Есть описание</div>' : ''}
            <div class="card-actions">
                <button class="btn-secondary" onclick="editPublication(${p.id})">Изменить</button>
                <button class="btn-danger" onclick="deletePublication(${p.id})">Удалить</button>
            </div>
        </div>
    `).join('');

    
    publications.forEach(p => loadCoverToEl(`pcover-${p.id}`, p.id));
}

// --- Каталоги ---

function renderCatalogsList(catalogs) {
    const grid = document.getElementById('catalogs-grid');
    if (!catalogs.length) {
        grid.innerHTML = '<div class="catalog-block"><div class="empty-msg">Каталоги не найдены</div></div>';
        return;
    }
    grid.innerHTML = catalogs.map((cat, ci) => `
        <div class="catalog-block">
            <div class="catalog-head">
                <h3>${cat.name}</h3>
                <div class="row-actions">
                    <button class="btn-secondary" onclick="editCatalog(${cat.id})">Изменить</button>
                    <button class="btn-danger" onclick="deleteCatalog(${cat.id})">Удалить</button>
                </div>
            </div>
            ${cat.isEmpty
            ? '<div class="empty-msg">Нет изданий. Нажмите «Изменить» чтобы добавить.</div>'
            : `<div class="pub-filmstrip">
                    ${cat.publications.map((pub, pi) => `
                        <div class="pub-film">
                            <div id="catcover-${cat.id}-${pub.id}" class="pub-poster" style="background:hsl(${(200 + ci * 30 + pi * 10) % 360},60%,85%);">
                                <span style="font-size:2rem;">📚</span>
                            </div>
                            <div class="pub-film-name">${pub.name}</div>
                        </div>
                    `).join('')}
                </div>`
        }
        </div>
    `).join('');

    // Загружаем обложки для постеров
    catalogs.forEach(cat => {
        cat.publications.forEach(pub => loadCoverToEl(`catcover-${cat.id}-${pub.id}`, pub.id));
    });
}

window.renderClientsList = renderClientsList;
window.renderPublicationsList = renderPublicationsList;
window.renderCatalogsList = renderCatalogsList;
