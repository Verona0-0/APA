// ========== ОПИСАНИЯ ==========

let typeDescriptionsCache = [];
let baseTypesEnsured = false;

// базовые типы — создаём сами, удалять и переименовывать нельзя
const BASE_DESC_TYPES = ['Автор', 'Описание', 'Возраст', 'Обложка', 'Страницы'];
// готовые варианты, чтобы не вводить руками
const AGE_OPTIONS = ['0+', '6+', '12+', '16+', '18+'];
const COVER_OPTIONS = ['Мягкая', 'Твёрдая', 'Суперобложка', 'Интегральная'];

function isBaseDescType(name) {
    const n = String(name || '').trim().toLowerCase();
    return BASE_DESC_TYPES.some(b => b.toLowerCase() === n);
}

// базовые типы наверх (в нужном порядке), потом остальные по id
function sortTypes(types) {
    const rank = t => {
        const i = BASE_DESC_TYPES.findIndex(b => b.toLowerCase() === String(t.name || '').trim().toLowerCase());
        return i === -1 ? 100 : i;
    };
    return types.slice().sort((a, b) => rank(a) - rank(b) || a.typeDescriptionID - b.typeDescriptionID);
}

// проверяем, что базовые типы есть; чего не хватает — создаём (один раз за сессию)
async function ensureBaseTypeDescriptions() {
    let types = await api('/api/TypeDescription').catch(() => []);
    const have = new Set((types || []).map(t => String(t.name || '').trim().toLowerCase()));
    const missing = BASE_DESC_TYPES.filter(n => !have.has(n.toLowerCase()));
    for (const name of missing) {
        try { await api('/api/TypeDescription', { method: 'POST', body: JSON.stringify({ name }) }); } catch (_) { }
    }
    if (missing.length) types = await api('/api/TypeDescription').catch(() => types);
    typeDescriptionsCache = types || [];
    await migrateLegacyPagesTypes();
    return typeDescriptionsCache;
}

// разовая миграция: старые «страницы», что вводили руками, переносим в базовый
// тип «Страницы», а старые типы удаляем
async function migrateLegacyPagesTypes() {
    const types = typeDescriptionsCache || [];
    const basePages = types.find(t => String(t.name || '').trim().toLowerCase() === 'страницы');
    if (!basePages) return;

    // старый тип про страницы: имя начинается на «страниц», но это не базовый
    const legacy = types.filter(t =>
        t.typeDescriptionID !== basePages.typeDescriptionID &&
        String(t.name || '').trim().toLowerCase().startsWith('страниц')
    );
    if (!legacy.length) return;

    const legacyIds = new Set(legacy.map(t => t.typeDescriptionID));
    const allDesc = await api('/api/Description').catch(() => []);
    // издания, где базовый тип «Страницы» уже заполнен
    const hasBase = new Set(allDesc.filter(d => d.typeDescriptionID === basePages.typeDescriptionID).map(d => d.publicationsID));

    let moved = 0;
    for (const d of allDesc.filter(d => legacyIds.has(d.typeDescriptionID))) {
        try {
            if (hasBase.has(d.publicationsID)) {
                await api(`/api/Description/${d.descriptionID}`, { method: 'DELETE' });
            } else {
                await api(`/api/Description/${d.descriptionID}`, {
                    method: 'PUT',
                    body: JSON.stringify({ publicationsID: d.publicationsID, typeDescriptionID: basePages.typeDescriptionID, name: d.name })
                });
                hasBase.add(d.publicationsID);
                moved++;
            }
        } catch (_) { }
    }
    // старые типы после переноса не нужны — удаляем
    for (const t of legacy) {
        try { await api(`/api/TypeDescription/${t.typeDescriptionID}`, { method: 'DELETE' }); } catch (_) { }
    }
    typeDescriptionsCache = await api('/api/TypeDescription').catch(() => typeDescriptionsCache);
    if (moved) { try { notify(`Перенесено значений «Страницы»: ${moved}`, 'success'); } catch (_) { } }
}

async function loadTypeDescriptions() {
    try {
        if (!baseTypesEnsured) {
            await ensureBaseTypeDescriptions();
            baseTypesEnsured = true;
        } else {
            typeDescriptionsCache = await api('/api/TypeDescription') || [];
        }
        return typeDescriptionsCache;
    } catch (e) { return typeDescriptionsCache || []; }
}

async function createDescription(data) {
    if (!data.publicationsID || !data.typeDescriptionID || !data.name?.trim()) throw new Error('Заполните значение описания');
    await api('/api/Description', { method: 'POST', body: JSON.stringify(data) });
}

async function performUpdateDescription(id, data) {
    if (!data.name?.trim()) throw new Error('Введите значение');
    await api(`/api/Description/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function performDeleteDescription(id) {
    await api(`/api/Description/${id}`, { method: 'DELETE' });
}

// поле ввода зависит от типа: число (страницы), список (возраст, обложка) или просто текст
function selectControl(options, value, attrs) {
    const opts = options.slice();
    if (value && !opts.some(o => o.toLowerCase() === value.toLowerCase())) opts.unshift(value);
    return `<select ${attrs}>
        <option value="">— не указано —</option>
        ${opts.map(o => `<option value="${escapeHtml(o)}"${o === value ? ' selected' : ''}>${escapeHtml(o)}</option>`).join('')}
    </select>`;
}

function descControl(typeName, value, typeId, descId) {
    const attrs = `class="field-input desc-row-input" data-type="${typeId}" data-desc="${descId}" data-orig="${escapeHtml(value)}"`;
    const name = String(typeName || '').trim().toLowerCase();
    if (name === 'страницы') {
        return `<input type="number" min="1" step="1" ${attrs} value="${escapeHtml(value)}" placeholder="Число страниц (от 1)">`;
    }
    if (name === 'возраст') return selectControl(AGE_OPTIONS, value, attrs);
    if (name === 'обложка') return selectControl(COVER_OPTIONS, value, attrs);
    if (name === 'описание') return `<textarea ${attrs} rows="4" placeholder="Описание книги">${escapeHtml(value)}</textarea>`;
    return `<input type="text" ${attrs} value="${escapeHtml(value)}" placeholder="— не заполнено —">`;
}

// форма описаний: на каждый тип — своя строка с подписью и полем.
// заполнил и сохранил всё сразу
async function renderDescriptionsForm(pubId) {
    const container = document.getElementById('publication-descriptions-form');
    if (!container) return;
    const [allDesc, typesRaw] = await Promise.all([
        api('/api/Description').catch(() => []),
        loadTypeDescriptions()
    ]);

    const types = sortTypes(typesRaw || []);
    if (!types.length) {
        container.innerHTML = '<div class="empty-msg">Нет типов описаний.</div>';
        return;
    }

    const pubDesc = (allDesc || []).filter(d => d.publicationsID === pubId);

    // уже сохранённые значения — каждое своей строкой (чтобы не потерять, если
    // их несколько на один тип), для пустых типов — одно поле
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
                    ${descControl(r.typeName, r.value, r.typeId, r.descId)}
                </div>
            `).join('')}
        </div>
        <button class="btn-primary" id="save-descriptions-btn" style="margin-top:0.75rem;"
            onclick="withButtonLoading(this, () => saveAllDescriptions(${pubId}))">Сохранить описания</button>
    `;
}

// сохраняем форму: новое создаём, изменённое обновляем, стёртое удаляем
window.saveAllDescriptions = async function (pubId) {
    const inputs = [...document.querySelectorAll('#publication-descriptions-form .desc-row-input')];

    // typeId → название типа, нужно для проверок (например «Страницы»)
    const typeNameById = {};
    typeDescriptionsCache.forEach(t => typeNameById[t.typeDescriptionID] = t.name);

    // проверка: страниц должно быть целое число и не меньше 1
    for (const inp of inputs) {
        const typeId = parseInt(inp.dataset.type);
        const tn = String(typeNameById[typeId] || '').trim().toLowerCase();
        const val = inp.value.trim();
        if (tn === 'страницы' && val !== '') {
            const n = Number(val);
            if (!Number.isInteger(n) || n < 1) {
                return notify('Количество страниц должно быть целым числом не меньше 1', 'warning');
            }
        }
    }

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
        // обновим карточки изданий, чтобы подтянулся значок «есть описание»
        if (dataLoaded.publications) await loadPublications();
    } catch (e) { notify(e.message, 'error'); }
};

window.renderDescriptionsForm = renderDescriptionsForm;

// управление типами описаний
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
    const type = typeDescriptionsCache.find(t => t.typeDescriptionID === id);
    if (type && isBaseDescType(type.name)) throw new Error('Базовый тип нельзя удалить');
    const descriptions = await api('/api/Description');
    const used = descriptions.some(d => d.typeDescriptionID === id);
    if (used) throw new Error('Нельзя удалить тип: он используется в описаниях изданий');
    await api(`/api/TypeDescription/${id}`, { method: 'DELETE' });
}

window.openTypeDescriptionsModal = async function () {
    await renderTypeDescriptionsList();
    openModal('typedescriptions-modal');
};

async function renderTypeDescriptionsList() {
    const types = sortTypes(await loadTypeDescriptions());
    const container = document.getElementById('typedescriptions-list');
    if (!container) return;
    if (!types.length) {
        container.innerHTML = '<div>Типы отсутствуют</div>';
        return;
    }
    container.innerHTML = types.map(t => {
        const base = isBaseDescType(t.name);
        return `
            <div class="type-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #ddd;">
                <span>${escapeHtml(t.name)}${base ? ' <span style="font-size:0.72rem;color:#95a5a6;border:1px solid #cfd8dc;border-radius:6px;padding:1px 6px;margin-left:0.4rem;">базовый</span>' : ''}</span>
                <div>
                    ${base
                ? '<span title="Базовый тип нельзя изменить или удалить" style="color:#9aa5b1;font-size:0.85rem;">—</span>'
                : `<button class="edit-btn small" onclick="editTypeDescription(${t.typeDescriptionID})">Изм.</button>
                       <button class="remove-btn small" onclick="deleteTypeDescriptionHandler(${t.typeDescriptionID})">Удал.</button>`}
                </div>
            </div>`;
    }).join('');
}

window.editTypeDescription = async function (id) {
    const current = typeDescriptionsCache.find(t => t.typeDescriptionID === id);
    if (current && isBaseDescType(current.name)) return notify('Базовый тип нельзя переименовать', 'warning');
    const newName = await promptDialog('Введите новое название типа:', current?.name || '', { title: 'Тип описания' });
    if (!newName || !newName.trim()) return;
    if (isBaseDescType(newName)) return notify('Это название зарезервировано за базовым типом', 'warning');
    try {
        await updateTypeDescription(id, newName.trim());
        notify('Тип обновлён', 'success');
        renderTypeDescriptionsList();
        refreshOpenDescriptionsForm();
    } catch (e) { notify(e.message, 'error'); }
};

window.deleteTypeDescriptionHandler = async function (id) {
    const current = typeDescriptionsCache.find(t => t.typeDescriptionID === id);
    if (current && isBaseDescType(current.name)) return notify('Базовый тип нельзя удалить', 'warning');
    if (await confirmDialog('Удалить тип? Это может затронуть описания.')) {
        try {
            await deleteTypeDescription(id);
            notify('Тип удалён', 'success');
            renderTypeDescriptionsList();
            refreshOpenDescriptionsForm();
        } catch (e) { notify(e.message, 'error'); }
    }
};

// перерисовать форму описаний, если открыто окно редактирования издания
function refreshOpenDescriptionsForm() {
    const pubId = parseInt(document.getElementById('publication-edit-id').value);
    const modal = document.getElementById('publication-modal');
    if (pubId && modal && !modal.classList.contains('hidden')) renderDescriptionsForm(pubId);
}

window.addNewTypeDescription = async function () {
    const input = document.getElementById('new-type-name');
    const name = input.value.trim();
    if (!name) return notify('Введите название', 'warning');
    if (isBaseDescType(name)) return notify('Такой тип уже существует (базовый)', 'warning');
    try {
        await addTypeDescription(name);
        notify('Тип добавлен', 'success');
        input.value = '';
        renderTypeDescriptionsList();
        // если открыто окно издания — покажем новый тип в форме
        refreshOpenDescriptionsForm();
    } catch (e) { notify(e.message, 'error'); }
};
