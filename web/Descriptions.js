// ========== ОПИСАНИЯ ==========

async function loadTypeDescriptions() {
    try { return await api('/api/TypeDescription') || []; } catch (e) { return []; }
}

async function createDescription(data) {
    if (!data.publicationsID || !data.typeDescriptionID || !data.name?.trim()) throw new Error('Не все поля заполнены');
    await api('/api/Description', { method: 'POST', body: JSON.stringify(data) });
}

async function performUpdateDescription(id, data) {
    if (!data.name?.trim()) throw new Error('Введите текст');
    await api(`/api/Description/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function performDeleteDescription(id) {
    await api(`/api/Description/${id}`, { method: 'DELETE' });
}

async function loadTypesForDescription(selectedId = null) {
    const types = await loadTypeDescriptions();
    const select = document.getElementById('description-edit-type');
    if (select) {
        select.innerHTML = types.map(t => `<option value="${t.typeDescriptionID}" ${t.typeDescriptionID === selectedId ? 'selected' : ''}>${t.name || t.typeDescriptionID}</option>`).join('');
        if (!types.length) select.innerHTML = '<option value="">Нет типов</option>';
    }
    return types;
}

async function loadPublicationDescriptions(pubId) {
    const allDesc = await api('/api/Description') || [];
    const types = await loadTypeDescriptions();
    const typeMap = {};
    types.forEach(t => typeMap[t.typeDescriptionID] = t.name);
    const filtered = allDesc.filter(d => d.publicationsID === pubId);
    const container = document.getElementById('publication-descriptions-list');
    if (container) {
        if (filtered.length) {
            container.innerHTML = filtered.map(d => `
                <div class="description-item">
                    <div class="description-header"><span class="description-type">${typeMap[d.typeDescriptionID] || 'Тип ' + d.typeDescriptionID}</span></div>
                    <div class="description-text">${d.name}</div>
                    <div class="description-actions">
                        <button class="edit-btn small" onclick="editDescription(${d.descriptionID})">✏️</button>
                        <button class="remove-btn small" onclick="deleteDescription(${d.descriptionID})">🗑️</button>
                    </div>
                </div>
            `).join('');
        } else container.innerHTML = '<div class="empty-message">Нет описаний</div>';
    }
}

window.addDescription = async function () {
    try {
        const pubId = parseInt(document.getElementById('publication-edit-id').value);
        const typeId = parseInt(document.getElementById('description-edit-type').value);
        const text = document.getElementById('description-edit-text').value.trim();
        if (!typeId) throw new Error('Выберите тип');
        if (!text) throw new Error('Введите текст');
        await createDescription({ publicationsID: pubId, typeDescriptionID: typeId, name: text });
        notify('Описание добавлено', 'success');
        document.getElementById('description-edit-text').value = '';
        await loadPublicationDescriptions(pubId);
    } catch (e) { notify(e.message, 'error'); }
};

window.editDescription = async function (descId) {
    const all = await api('/api/Description');
    const desc = all.find(d => d.descriptionID === descId);
    if (!desc) return notify('Описание не найдено', 'error');
    document.getElementById('editing-description-id').value = descId;
    await loadTypesForDescription(desc.typeDescriptionID);
    document.getElementById('description-edit-text').value = desc.name;
    document.getElementById('add-description-btn').style.display = 'none';
    document.getElementById('update-description-btn').style.display = 'inline-flex';
    document.getElementById('cancel-edit-btn').style.display = 'inline-flex';
};

window.updateDescription = async function () {
    try {
        const descId = parseInt(document.getElementById('editing-description-id').value);
        const typeId = parseInt(document.getElementById('description-edit-type').value);
        const text = document.getElementById('description-edit-text').value.trim();
        if (!typeId || !text) throw new Error('Заполните поля');
        const all = await api('/api/Description');
        const old = all.find(d => d.descriptionID === descId);
        await performUpdateDescription(descId, {
            publicationsID: old.publicationsID,
            typeDescriptionID: typeId,
            name: text
        });
        notify('Описание обновлено', 'success');
        cancelDescriptionEdit();
        const pubId = parseInt(document.getElementById('publication-edit-id').value);
        await loadPublicationDescriptions(pubId);
    } catch (e) { notify(e.message, 'error'); }
};

window.cancelDescriptionEdit = function () {
    document.getElementById('editing-description-id').value = '';
    document.getElementById('description-edit-text').value = '';
    document.getElementById('add-description-btn').style.display = 'inline-flex';
    document.getElementById('update-description-btn').style.display = 'none';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    const typeSelect = document.getElementById('description-edit-type');
    if (typeSelect && typeSelect.options.length) typeSelect.selectedIndex = 0;
};

window.deleteDescription = async function (descId) {
    if (!confirm('Удалить описание?')) return;
    try {
        await performDeleteDescription(descId);
        notify('Описание удалено', 'success');
        const pubId = parseInt(document.getElementById('publication-edit-id').value);
        await loadPublicationDescriptions(pubId);
    } catch (e) { notify(e.message, 'error'); }
};

// Управление типами описаний
async function loadAllTypeDescriptions() {
    return await loadTypeDescriptions();
}

async function addTypeDescription(name) {
    if (!name.trim()) throw new Error('Введите название');
    await api('/api/TypeDescription', { method: 'POST', body: JSON.stringify({ name }) });
}

async function updateTypeDescription(id, name) {
    if (!name.trim()) throw new Error('Введите название');
    await api(`/api/TypeDescription/${id}`, { method: 'PUT', body: JSON.stringify({ typeDescriptionID: id, name }) });
}

async function deleteTypeDescription(id) {
    const descriptions = await api('/api/Description');
    const used = descriptions.some(d => d.typeDescriptionID === id);
    if (used) throw new Error('Нельзя удалить тип, так как он используется в описаниях');
    await api(`/api/TypeDescription/${id}`, { method: 'DELETE' });
}

window.openTypeDescriptionsModal = async function () {
    await renderTypeDescriptionsList();
    openModal('typedescriptions-modal');
};

async function renderTypeDescriptionsList() {
    const types = await loadTypeDescriptions();
    const container = document.getElementById('typedescriptions-list');
    if (!container) return;
    if (types.length) {
        container.innerHTML = types.map(t => `
            <div class="type-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #ddd;">
                <span>${t.name}</span>
                <div>
                    <button class="edit-btn small" onclick="editTypeDescription(${t.typeDescriptionID}, '${t.name.replace(/'/g, "\\'")}')">✏️</button>
                    <button class="remove-btn small" onclick="deleteTypeDescriptionHandler(${t.typeDescriptionID})">🗑️</button>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<div>Типы отсутствуют</div>';
    }
}

window.editTypeDescription = function (id, currentName) {
    const newName = prompt('Введите новое название типа:', currentName);
    if (newName && newName.trim()) {
        updateTypeDescription(id, newName.trim())
            .then(() => {
                notify('Тип обновлён', 'success');
                renderTypeDescriptionsList();
                loadTypesForDescription();
            })
            .catch(e => notify(e.message, 'error'));
    }
};

window.deleteTypeDescriptionHandler = async function (id) {
    if (confirm('Удалить тип? Это может затронуть описания.')) {
        try {
            await deleteTypeDescription(id);
            notify('Тип удалён', 'success');
            renderTypeDescriptionsList();
            loadTypesForDescription();
        } catch (e) { notify(e.message, 'error'); }
    }
};

window.addNewTypeDescription = async function () {
    const input = document.getElementById('new-type-name');
    const name = input.value.trim();
    if (!name) return notify('Введите название', 'warning');
    try {
        await addTypeDescription(name);
        notify('Тип добавлен', 'success');
        input.value = '';
        renderTypeDescriptionsList();
        loadTypesForDescription();
    } catch (e) { notify(e.message, 'error'); }
};