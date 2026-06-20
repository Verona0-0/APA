// ========== UI ==========

window.showSection = function (section) {
    document.querySelectorAll('.section, .menu-item').forEach(el => el.classList.remove('active'));
    document.getElementById(section)?.classList.add('active');
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
    const titles = {
        subscriptions: 'Отчёты',
        catalogs: 'Каталоги',
        publications: 'Издания',
        prices: 'Цены',
        clients: 'Клиенты',
        addresses: 'Адреса доставки',
        services: 'Сервисы',
        'all-subscriptions': 'Подписки'
    };
    document.getElementById('page-title').textContent = titles[section] || '';
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
