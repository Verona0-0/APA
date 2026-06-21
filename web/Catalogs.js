// ========== КАТАЛОГИ ==========

async function loadCatalogs() {
    try {
        const cats = await api('/api/Catalogs');
        const rels = await api('/api/PublicationsCatalogs') || [];
        const pubs = await api('/api/Publications') || [];
        const pubMap = {};
        pubs.forEach(p => pubMap[p.publicationsID] = p.name);
        const group = {};
        rels.forEach(r => { if (!group[r.catalogsID]) group[r.catalogsID] = []; group[r.catalogsID].push(r.publicationsID); });
        const result = cats.map(c => {
            const ids = group[c.catalogsID] || [];
            return {
                id: c.catalogsID,
                name: c.name || `Каталог ${c.catalogsID}`,
                publications: ids.slice(0, 10).map(pid => ({ id: pid, name: pubMap[pid] || `Издание ${pid}` })),
                count: ids.length,
                isEmpty: ids.length === 0
            };
        });
        currentCatalogs = result;
        renderCatalogsList(result);
        dataLoaded.catalogs = true;
    } catch (e) { notify(e.message, 'error'); showSectionError('catalogs-grid'); }
}

async function performDeleteCatalog(catalogId) {
    const rels = await api('/api/PublicationsCatalogs');
    const count = rels.filter(r => r.catalogsID === catalogId).length;
    if (count) throw new Error(`Каталог содержит ${count} изданий. Удалите связи сначала.`);
    await api(`/api/Catalogs/${catalogId}`, { method: 'DELETE' });
}

window.deleteCatalog = async function (catalogId) {
    if (await confirmDialog('Удалить каталог? Издания не будут удалены.')) {
        try {
            await performDeleteCatalog(catalogId);
            notify('Каталог удалён', 'success');
            await loadCatalogs();
        } catch (e) { notify(e.message, 'error'); }
    }
};

window.editCatalog = function (catalogId) {
    const cat = currentCatalogs.find(c => c.id === catalogId);
    if (!cat) return notify('Каталог не найден', 'error');
    document.getElementById('catalog-edit-id').value = catalogId;
    document.getElementById('catalog-edit-name').value = cat.name;
    loadCatalogPublications(catalogId);
    openModal('catalog-modal');
};

window.saveCatalogChanges = async function () {
    try {
        const id = parseInt(document.getElementById('catalog-edit-id').value);
        const name = document.getElementById('catalog-edit-name').value.trim();
        if (!name) throw new Error('Введите название');
        await api(`/api/Catalogs/${id}`, { method: 'PUT', body: JSON.stringify({ catalogsID: id, name }) });
        notify('Каталог обновлён', 'success');
        closeModal('catalog-modal');
        await loadCatalogs();
    } catch (e) { notify(e.message, 'error'); }
};

window.createNewCatalog = () => openModal('new-catalog-modal');
window.saveNewCatalog = async function () {
    const name = document.getElementById('new-catalog-name').value.trim();
    if (!name) return notify('Введите название', 'warning');
    try {
        await api('/api/Catalogs', { method: 'POST', body: JSON.stringify({ name }) });
        notify('Каталог создан', 'success');
        closeModal('new-catalog-modal');
        document.getElementById('new-catalog-name').value = '';
        await loadCatalogs();
    } catch (e) { notify(e.message, 'error'); }
};

async function loadCatalogPublications(catalogId) {
    const rels = await api('/api/PublicationsCatalogs');
    const allPubs = await api('/api/Publications');
    const myRels = rels.filter(r => r.catalogsID === catalogId);
    const listDiv = document.getElementById('catalog-publications-list');
    if (!listDiv) return;
    if (myRels.length) {
        listDiv.innerHTML = myRels.map(rel => `
            <div class="catalog-pub-item">
                <span>${allPubs.find(p => p.publicationsID === rel.publicationsID)?.name || rel.publicationsID}</span>
                <button class="remove-btn" onclick="removeFromCatalog(${rel.publicationsCatalogsID}, ${catalogId})">✖</button>
            </div>
        `).join('');
    } else listDiv.innerHTML = '<div class="empty-message">Нет изданий</div>';
    listDiv.innerHTML += `
        <div class="add-publication-to-catalog" style="margin-top:1rem;">
            <select id="new-pub-select" class="publication-select">
                <option value="">Выберите издание</option>
                ${allPubs.map(p => `<option value="${p.publicationsID}">${p.name || p.publicationsID}</option>`).join('')}
            </select>
            <button class="add-btn" onclick="addToCatalog(${catalogId})">Добавить</button>
        </div>
    `;
}

window.removeFromCatalog = async function (relationId, catalogId) {
    if (await confirmDialog('Убрать издание из каталога?')) {
        try {
            await api(`/api/PublicationsCatalogs/${relationId}`, { method: 'DELETE' });
            notify('Удалено', 'success');
            await loadCatalogPublications(catalogId);
            await loadCatalogs();
        } catch (e) { notify(e.message, 'error'); }
    }
};

window.addToCatalog = async function (catalogId) {
    const select = document.getElementById('new-pub-select');
    const pubId = parseInt(select.value);
    if (!pubId) return notify('Выберите издание', 'warning');
    try {
        const existing = await api('/api/PublicationsCatalogs');
        if (existing.some(r => r.catalogsID === catalogId && r.publicationsID === pubId))
            return notify('Уже есть в каталоге', 'warning');
        await api('/api/PublicationsCatalogs', {
            method: 'POST',
            body: JSON.stringify({ catalogsID: catalogId, publicationsID: pubId })
        });
        notify('Добавлено', 'success');
        select.value = '';
        await loadCatalogPublications(catalogId);
        await loadCatalogs();
    } catch (e) { notify(e.message, 'error'); }
};