// ========== ИЗДАНИЯ ==========

async function loadPublications() {
    try {
        const [pubs, desc, prices, types] = await Promise.all([
            api('/api/Publications'),
            api('/api/Description').then(r => r || []).catch(() => []),
            api('/api/SubscriptionPrices').then(r => r || []).catch(() => []),
            api('/api/TypeDescription').then(r => r || []).catch(() => [])
        ]);
        const typeNameMap = {};
        types.forEach(t => typeNameMap[t.typeDescriptionID] = t.name);
        const descMap = {};
        desc.forEach(d => { if (!descMap[d.publicationsID]) descMap[d.publicationsID] = []; descMap[d.publicationsID].push(d); });
        currentPublications = pubs.map(p => {
            const price = pubPrice(prices, p.publicationsID);
            return {
                id: p.publicationsID,
                name: p.name || `Издание ${p.publicationsID}`,
                price: price ?? 0,
                priceText: price != null ? `${price} руб` : 'Нет цены',
                descriptions: (descMap[p.publicationsID] || []).map(d => ({
                    type: typeNameMap[d.typeDescriptionID] || 'Описание',
                    value: d.name
                }))
            };
        });
        setupPubFilters();
        applyPubFilters();
        dataLoaded.publications = true;
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); showSectionError('publications-grid'); }
}

// делаем html описания издания: «Тип: значение» построчно. нет данных — пусто
function formatPubDescriptions(ds) {
    if (!ds || !ds.length) return '';
    return ds.map(d => `<div style="font-size:0.85rem;color:#5a6b7b;"><span style="color:#95a5a6;">${escapeHtml(d.type)}:</span> ${escapeHtml(d.value)}</div>`).join('');
}
window.formatPubDescriptions = formatPubDescriptions;

// поиск, фильтр по цене, вид (карточки/список) ---

var pubView = 'cards';

function setupPubFilters() {
    ['pub-search', 'pub-price-min', 'pub-price-max'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = applyPubFilters;
    });
}

function applyPubFilters() {
    const q = (document.getElementById('pub-search')?.value || '').trim().toLowerCase();
    const min = parseFloat(document.getElementById('pub-price-min')?.value);
    const max = parseFloat(document.getElementById('pub-price-max')?.value);
    const list = currentPublications.filter(p => {
        if (q && !p.name.toLowerCase().includes(q)) return false;
        if (!isNaN(min) && p.price < min) return false;
        if (!isNaN(max) && p.price > max) return false;
        return true;
    });
    const grid = document.getElementById('publications-grid');
    if (grid) grid.className = pubView === 'list' ? 'list-view' : 'cards-grid';
    if (pubView === 'list') renderPublicationsListView(list);
    else renderPublicationsList(list);
}
window.applyPubFilters = applyPubFilters;

window.setPubView = function (view) {
    pubView = view;
    const cards = document.getElementById('pub-view-cards');
    const listBtn = document.getElementById('pub-view-list');
    if (cards) cards.className = view === 'cards' ? 'btn-primary' : 'btn-secondary';
    if (listBtn) listBtn.className = view === 'list' ? 'btn-primary' : 'btn-secondary';
    applyPubFilters();
};

// режим списка: компактные строки вместо карточек с обложками
function renderPublicationsListView(pubs) {
    const grid = document.getElementById('publications-grid');
    if (!grid) return;
    if (!pubs.length) {
        grid.innerHTML = '<div class="empty-msg">Издания не найдены</div>';
        return;
    }
    grid.innerHTML = pubs.map(p => `
        <div class="list-row">
            <div style="flex:1;">
                <strong>${escapeHtml(p.name)}</strong>
                ${formatPubDescriptions(p.descriptions)}
            </div>
            <span style="color:var(--primary);font-weight:700;margin-right:1rem;white-space:nowrap;">${p.priceText}</span>
            <div class="row-actions">
                <button class="btn-secondary" onclick="editPublication(${p.id})">Изменить</button>
                <button class="btn-danger" onclick="deletePublication(${p.id})">Удалить</button>
            </div>
        </div>`).join('');
}
window.renderPublicationsListView = renderPublicationsListView;

async function createPublication(name) {
    await api('/api/Publications', { method: 'POST', body: JSON.stringify({ name }) });
}

async function updatePublication(id, name) {
    await api(`/api/Publications/${id}`, { method: 'PUT', body: JSON.stringify({ publicationsID: id, name }) });
}

async function performDeletePublication(id) {
    const subs = await api('/api/Subscriptions');
    const related = subs.filter(s => s.publicationsID === id);
    if (related.length) throw new Error(`На издание оформлено ${related.length} подписок. Сначала удалите их.`);
    await api(`/api/Publications/${id}`, { method: 'DELETE' });
}

window.deletePublication = async function (id) {
    if (await confirmDialog('Удалить издание? Действие необратимо.')) {
        try {
            await performDeletePublication(id);
            notify('Издание удалено', 'success');
            await loadPublications();
        } catch (e) { notify(e.message, 'error'); }
    }
};

window.editPublication = async function (id) {
    const pub = currentPublications.find(p => p.id === id);
    if (!pub) return notify('Не найдено', 'error');
    document.getElementById('publication-edit-id').value = id;
    document.getElementById('publication-edit-name').value = pub.name;
    const prices = await api('/api/SubscriptionPrices');
    const pubPrices = prices.filter(p => p.publicationsID === id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const priceHistoryDiv = document.getElementById('publication-price-history');
    if (pubPrices.length) {
        priceHistoryDiv.innerHTML = pubPrices.map(p => `
            <div style="display:flex;gap:1rem;align-items:center;padding:0.5rem 0;border-bottom:1px solid #eee;font-size:0.9rem;">
                <strong style="color:var(--primary)">${p.price} руб</strong>
                <span>с ${formatDateLocale(p.dateStart)}</span>
                ${p.dateEnd ? `<span>до ${formatDateLocale(p.dateEnd)}</span>` : '<span style="color:var(--primary);font-size:0.8rem;">текущая</span>'}
            </div>
        `).join('');
    } else priceHistoryDiv.innerHTML = '<span style="color:#999;font-size:0.9rem;">Нет истории цен</span>';
    await renderDescriptionsForm(id);
    await showPubCoverPreview(id);
    setupCoverInput();
    document.getElementById('publication-modal').classList.remove('hidden');
};

window.savePublicationChanges = async function () {
    try {
        const id = parseInt(document.getElementById('publication-edit-id').value);
        const name = document.getElementById('publication-edit-name').value.trim();
        if (!name) throw new Error('Введите название');
        await updatePublication(id, name);
        notify('Издание обновлено', 'success');
        closeModal('publication-modal');
        await loadPublications();
    } catch (e) { notify(e.message, 'error'); }
};

window.createNewPublication = () => openModal('new-publication-modal');
window.saveNewPublication = async function () {
    const name = document.getElementById('new-publication-name').value.trim();
    if (!name) return notify('Введите название', 'warning');
    try {
        await createPublication(name);
        notify('Издание создано', 'success');
        closeModal('new-publication-modal');
        document.getElementById('new-publication-name').value = '';
        await loadPublications();
    } catch (e) { notify(e.message, 'error'); }
};

// ========== ОБЛОЖКИ ==========

const coverCache = new Map(); // pubId -> objectURL | null

async function getCoverUrl(pubId) {
    if (coverCache.has(pubId)) return coverCache.get(pubId);
    try {
        const token = window.cookies.get('token');
        const res = await fetch(`${API_BASE}/api/Covers/${pubId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) { coverCache.set(pubId, null); return null; }
        const blob = await res.blob();
        if (!blob.size) { coverCache.set(pubId, null); return null; }
        const url = URL.createObjectURL(blob);
        coverCache.set(pubId, url);
        return url;
    } catch { coverCache.set(pubId, null); return null; }
}

// вставляем обложку в элемент по id (для карточек и постеров)
window.loadCoverToEl = async function (elId, pubId) {
    const el = document.getElementById(elId);
    if (!el) return;
    const url = await getCoverUrl(pubId);
    if (url) {
        el.innerHTML = `<img src="${url}" alt="Обложка" style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block;">`;
        el.style.background = 'none';
        el.style.fontSize = '0';
    }
};

async function showPubCoverPreview(pubId) {
    const preview = document.getElementById('pub-cover-preview');
    const deleteBtn = document.getElementById('delete-cover-btn');
    if (!preview) return;
    preview.innerHTML = '<span style="color:#999;font-size:0.85rem;">Загрузка...</span>';
    const url = await getCoverUrl(pubId);
    if (url) {
        preview.innerHTML = `<img src="${url}" alt="Обложка" style="width:100%;max-height:240px;object-fit:cover;border-radius:10px;display:block;">`;
        if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    } else {
        preview.innerHTML = '<span style="color:#999;font-size:0.85rem;">Нет обложки</span>';
        if (deleteBtn) deleteBtn.style.display = 'none';
    }
}

async function uploadCoverFile(pubId, file) {
    const token = window.cookies.get('token');
    const form = new FormData();
    form.append('file', file);
    // в кэше null — обложки нет, значит POST. иначе PUT
    const hasCover = coverCache.has(pubId) && coverCache.get(pubId) !== null;
    const method = hasCover ? 'PUT' : 'POST';
    const res = await fetch(`${API_BASE}/api/Covers/${pubId}`, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form
    });
    if (!res.ok) throw new Error(await res.text() || 'Ошибка загрузки');
    const old = coverCache.get(pubId);
    if (old) URL.revokeObjectURL(old);
    coverCache.delete(pubId);
}

window.deletePubCover = async function () {
    const id = parseInt(document.getElementById('publication-edit-id').value);
    if (!await confirmDialog('Удалить обложку?')) return;
    try {
        await api(`/api/Covers/${id}`, { method: 'DELETE' });
        const old = coverCache.get(id);
        if (old) URL.revokeObjectURL(old);
        coverCache.delete(id);
        notify('Обложка удалена', 'success');
        await showPubCoverPreview(id);
    } catch (e) { notify(e.message, 'error'); }
};

function setupCoverInput() {
    const input = document.getElementById('cover-file-input');
    if (!input) return;
    // пересоздаём элемент, чтобы слетели старые обработчики
    const fresh = input.cloneNode(true);
    input.parentNode.replaceChild(fresh, input);
    fresh.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const id = parseInt(document.getElementById('publication-edit-id').value);
        try {
            await uploadCoverFile(id, file);
            notify('Обложка загружена', 'success');
            await showPubCoverPreview(id);
        } catch (err) { notify(err.message, 'error'); }
        fresh.value = '';
    });
}

window.showPubCoverPreview = showPubCoverPreview;
window.setupCoverInput = setupCoverInput;
window.getCoverUrl = getCoverUrl;