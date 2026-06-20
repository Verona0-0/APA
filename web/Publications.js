// ========== ИЗДАНИЯ ==========

async function loadPublications() {
    try {
        const pubs = await api('/api/Publications');
        const desc = await api('/api/Description') || [];
        const prices = await api('/api/SubscriptionPrices') || [];
        const descMap = {};
        desc.forEach(d => { if (!descMap[d.publicationsID]) descMap[d.publicationsID] = []; descMap[d.publicationsID].push(d); });
        const currentPriceMap = {};
        prices.forEach(p => { if (!p.dateEnd) currentPriceMap[p.publicationsID] = p; });
        currentPublications = pubs.map(p => ({
            id: p.publicationsID,
            name: p.name || `Издание ${p.publicationsID}`,
            price: currentPriceMap[p.publicationsID]?.price || 0,
            priceText: currentPriceMap[p.publicationsID] ? `${currentPriceMap[p.publicationsID].price} руб` : 'Нет цены',
            hasDescriptions: (descMap[p.publicationsID] || []).length > 0
        }));
        renderPublicationsList(currentPublications);
        dataLoaded.publications = true;
        notify('Издания загружены', 'success');
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); }
}

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
    if (confirm('Удалить издание?')) {
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
    await loadTypesForDescription();
    cancelDescriptionEdit();
    await loadPublicationDescriptions(id);
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

// Вставляет обложку в элемент по id (для карточек и постеров)
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
    // Если в кэше null — обложки нет → POST, иначе → PUT
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
    if (!confirm('Удалить обложку?')) return;
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
    // Заменяем элемент, чтобы убрать старые обработчики
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