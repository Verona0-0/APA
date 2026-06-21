// ========== ОПИСАНИЯ ==========

let typeDescriptionsCache = [];

async function loadTypeDescriptions() {
    try {
        typeDescriptionsCache = await api('/api/TypeDescription') || [];
        return typeDescriptionsCache;
    } catch (e) { return []; }
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

// Редактор описаний издания «форма по типам»: на каждый тип описания —
// своя подписанная строка со значением. Заполнил и сохранил всё разом.
async function renderDescriptionsForm(pubId) {
    const container = document.getElementById('publication-descriptions-form');
    if (!container) return;
    const [allDesc, types] = await Promise.all([
        api('/api/Description').catch(() => []),
        loadTypeDescriptions()
    ]);

    if (!types.length) {
        container.innerHTML = '<div class="empty-msg">Нет типов описаний. Создайте их через кнопку «Типы описаний» (например: Страницы, Возраст, Жанр), затем заполните значения здесь.</div>';
        return;
    }

    const pubDesc = (allDesc || []).filter(d => d.publicationsID === pubId);

    // Существующие записи показываем отдельными строками (так не теряются
    // даже несколько значений одного типа), а для пустых типов — одно поле.
    const rows = [];
    types.forEach(t => {
        const entries = pubDesc.filter(d => d.typeDescriptionID === t.typeDescriptionID);
        if (entries.length) {
            entries.forEach(e => rows.push({ typeId: t.typeDescriptionID, typeName: t.name, descId: e.descriptionID, value: e.name || '' }));
        } else {
            rows.push({ typeId: t.typeDescriptionID, typeName: t.name, descId: '', value: '' });
        }
    });

    container.innerHTML = `
        <div class="desc-form">
            ${rows.map(r => `
                <div class="desc-row">
                    <label class="desc-row-label">${escapeHtml(r.typeName)}</label>
                    <input class="field-input desc-row-input" data-type="${r.typeId}" data-desc="${r.descId}"
                        data-orig="${escapeHtml(r.value)}" value="${escapeHtml(r.value)}" placeholder="— не заполнено —">
                </div>
            `).join('')}
        </div>
        <button class="btn-primary" id="save-descriptions-btn" style="margin-top:0.75rem;"
            onclick="withButtonLoading(this, () => saveAllDescriptions(${pubId}))">Сохранить описания</button>
    `;
}

// Сохраняет всю форму: новые значения создаёт, изменённые обновляет,
// очищенные (с уже существующей записью) удаляет.
window.saveAllDescriptions = async function (pubId) {
    const inputs = [...document.querySelectorAll('#publication-descriptions-form .desc-row-input')];
    const tasks = [];
    inputs.forEach(inp => {
        const typeId = parseInt(inp.dataset.type);
        const descId = inp.dataset.desc ? parseInt(inp.dataset.desc) : null;
        const value = inp.value.trim();
        const orig = (inp.dataset.orig || '').trim();
        if (descId) {
            if (!value) tasks.push(performDeleteDescription(descId));
            else if (value !== orig) tasks.push(performUpdateDescription(descId, { publicationsID: pubId, typeDescriptionID: typeId, name: value }));
        } else if (value) {
            tasks.push(createDescription({ publicationsID: pubId, typeDescriptionID: typeId, name: value }));
        }
    });
    if (!tasks.length) return notify('Изменений нет', 'warning');
    try {
        await Promise.all(tasks);
        notify('Описания сохранены', 'success');
        await renderDescriptionsForm(pubId);
        // Обновляем карточки изданий (значок «есть описание»).
        if (dataLoaded.publications) await loadPublications();
    } catch (e) { notify(e.message, 'error'); }
};

window.renderDescriptionsForm = renderDescriptionsForm;

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
                <span>${escapeHtml(t.name)}</span>
                <div>
                    <button class="edit-btn small" onclick="editTypeDescription(${t.typeDescriptionID})">✏️</button>
                    <button class="remove-btn small" onclick="deleteTypeDescriptionHandler(${t.typeDescriptionID})">🗑️</button>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<div>Типы отсутствуют</div>';
    }
}

window.editTypeDescription = async function (id) {
    const current = typeDescriptionsCache.find(t => t.typeDescriptionID === id);
    const newName = await promptDialog('Введите новое название типа:', current?.name || '', { title: 'Тип описания' });
    if (!newName || !newName.trim()) return;
    try {
        await updateTypeDescription(id, newName.trim());
        notify('Тип обновлён', 'success');
        renderTypeDescriptionsList();
        refreshOpenDescriptionsForm();
    } catch (e) { notify(e.message, 'error'); }
};

window.deleteTypeDescriptionHandler = async function (id) {
    if (await confirmDialog('Удалить тип? Это может затронуть описания.')) {
        try {
            await deleteTypeDescription(id);
            notify('Тип удалён', 'success');
            renderTypeDescriptionsList();
            refreshOpenDescriptionsForm();
        } catch (e) { notify(e.message, 'error'); }
    }
};

// Перерисовать форму описаний, если сейчас открыто редактирование издания.
function refreshOpenDescriptionsForm() {
    const pubId = parseInt(document.getElementById('publication-edit-id').value);
    const modal = document.getElementById('publication-modal');
    if (pubId && modal && !modal.classList.contains('hidden')) renderDescriptionsForm(pubId);
}

window.addNewTypeDescription = async function () {
    const input = document.getElementById('new-type-name');
    const name = input.value.trim();
    if (!name) return notify('Введите название', 'warning');
    try {
        await addTypeDescription(name);
        notify('Тип добавлен', 'success');
        input.value = '';
        renderTypeDescriptionsList();
        // Если открыто редактирование издания — показать новый тип в форме описаний.
        refreshOpenDescriptionsForm();
    } catch (e) { notify(e.message, 'error'); }
};