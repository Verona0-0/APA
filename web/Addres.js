// ========== АДРЕСА ДОСТАВКИ ==========
var typeAddresses = [];
var allAddressesFlat = [];

const collapsedNodes = new Set();

function getTypeName(typeId) {
    const t = typeAddresses.find(t => t.typeAddressID === typeId);
    return t ? t.name : 'Адрес';
}
window.getTypeName = getTypeName;

async function loadAddressSection() {
    try {
        [typeAddresses, allAddressesFlat] = await Promise.all([
            api('/api/TypeAddress').catch(() => []),
            api('/api/DeliveryAddress').catch(() => [])
        ]);
        renderTypeAddressList();
        renderDeliveryAddressTree();
        dataLoaded.addresses = true;
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); showSectionError('delivery-address-tree'); }
}

// --- Типы адресов ---

function renderTypeAddressList() {
    const el = document.getElementById('type-address-list');
    if (!el) return;
    if (!typeAddresses.length) {
        el.innerHTML = '<div class="empty-msg">Нет типов адресов</div>';
        return;
    }
    el.innerHTML = typeAddresses.map(t => `
        <div class="list-row">
            <span>${escapeHtml(t.name)}</span>
            <div class="row-actions">
                <button class="btn-secondary" onclick="editTypeAddress(${t.typeAddressID})">Изменить</button>
                <button class="btn-danger" onclick="deleteTypeAddressItem(${t.typeAddressID})">Удалить</button>
            </div>
        </div>
    `).join('');
}

window.saveNewTypeAddress = async function () {
    const input = document.getElementById('new-type-address-name');
    const name = input?.value.trim();
    if (!name) return notify('Введите название', 'warning');
    try {
        await api('/api/TypeAddress', { method: 'POST', body: JSON.stringify({ name }) });
        notify('Тип добавлен', 'success');
        input.value = '';
        await loadAddressSection();
    } catch (e) { notify(e.message, 'error'); }
};

window.editTypeAddress = async function (id) {
    const current = typeAddresses.find(t => t.typeAddressID === id);
    const newName = await promptDialog('Новое название типа адреса:', current?.name || '', { title: 'Тип адреса' });
    if (!newName?.trim()) return;
    try {
        await api(`/api/TypeAddress/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ typeAddressID: id, name: newName.trim() })
        });
        notify('Тип обновлён', 'success');
        loadAddressSection();
    } catch (e) { notify(e.message, 'error'); }
};

window.deleteTypeAddressItem = async function (id) {
    if (allAddressesFlat.some(a => a.typeAddressID === id))
        return notify('Нельзя удалить: тип используется в адресах', 'error');
    if (!await confirmDialog('Удалить тип адреса?')) return;
    try {
        await api(`/api/TypeAddress/${id}`, { method: 'DELETE' });
        notify('Тип удалён', 'success');
        await loadAddressSection();
    } catch (e) { notify(e.message, 'error'); }
};

// --- Дерево адресов  ---

function renderDeliveryAddressTree() {
    const el = document.getElementById('delivery-address-tree');
    if (!el) return;
    const roots = allAddressesFlat.filter(a => !a.parentID || a.parentID === 0);
    if (!roots.length) {
        el.innerHTML = '<div class="empty-msg">Нет адресов. Добавьте корневой адрес.</div>';
        return;
    }
    el.innerHTML = renderAddrNodes(roots, 0);
}

function renderAddrNodes(nodes, depth) {
    return nodes.map(node => {
        const children = allAddressesFlat.filter(a => a.parentID === node.deliveryAddressID);
        const hasChildren = children.length > 0;
        const isCollapsed = collapsedNodes.has(node.deliveryAddressID);
        const typeName = getTypeName(node.typeAddressID);

        return `
            <div style="margin-left:${depth * 1.5}rem;margin-bottom:0.4rem;">
                <div class="addr-row">
                    <button
                        onclick="toggleAddrNode(${node.deliveryAddressID})"
                        style="background:none;border:none;cursor:${hasChildren ? 'pointer' : 'default'};
                                width:1.4rem;font-size:0.8rem;color:var(--dark);padding:0;flex-shrink:0;"
                        title="${hasChildren ? (isCollapsed ? 'Развернуть' : 'Свернуть') : ''}">
                        ${hasChildren ? (isCollapsed ? '▶' : '▼') : ''}
                    </button>
                    <span class="addr-type-badge">${escapeHtml(typeName)}</span>
                    <span style="font-weight:600;flex:1;">${escapeHtml(node.name)}</span>
                    <div class="row-actions">
                        <button class="btn-primary" style="padding:0.3rem 0.6rem;font-size:0.8rem;"
                            onclick="showAddAddressModal(${node.deliveryAddressID})">+ Дочерний</button>
                        <button class="btn-secondary" onclick="editAddressNode(${node.deliveryAddressID})">Изменить</button>
                        <button class="btn-danger" onclick="deleteAddressNode(${node.deliveryAddressID})">Удалить</button>
                    </div>
                </div>
                ${hasChildren && !isCollapsed
            ? `<div style="margin-top:0.4rem;">${renderAddrNodes(children, depth + 1)}</div>`
            : ''}
            </div>
        `;
    }).join('');
}

window.toggleAddrNode = function (id) {
    if (collapsedNodes.has(id)) collapsedNodes.delete(id);
    else collapsedNodes.add(id);
    renderDeliveryAddressTree();
};

// --- CRUD адресов ---

window.showAddAddressModal = async function (parentId) {
    if (!typeAddresses.length) {
        typeAddresses = await api('/api/TypeAddress').catch(() => []);
    }
    document.getElementById('new-addr-parent-id').value = parentId ?? '';
    document.getElementById('new-addr-name').value = '';
    const typeSelect = document.getElementById('new-addr-type');
    typeSelect.innerHTML = typeAddresses.length
        ? typeAddresses.map(t => `<option value="${t.typeAddressID}">${t.name}</option>`).join('')
        : '<option value="">Нет типов</option>';
    const label = document.getElementById('new-addr-parent-label');
    if (label) {
        if (parentId != null) {
            const p = allAddressesFlat.find(a => a.deliveryAddressID === parentId);
            label.textContent = p ? `Родитель: ${p.name}` : '';
        } else {
            label.textContent = 'Корневой адрес (без родителя)';
        }
    }
    openModal('new-addr-modal');
};


window.openNewAddrFromSubscription = async function () {
    await showAddAddressModal(null);
};

window.saveNewDeliveryAddress = async function () {
    const parentId = document.getElementById('new-addr-parent-id').value;
    const typeId = parseInt(document.getElementById('new-addr-type').value);
    const name = document.getElementById('new-addr-name').value.trim();
    if (!name) return notify('Введите название', 'warning');
    if (!typeId) return notify('Выберите тип', 'warning');
    try {
        await api('/api/DeliveryAddress', {
            method: 'POST',
            body: JSON.stringify({
                parentID: parentId ? parseInt(parentId) : 0,
                typeAddressID: typeId,
                name
            })
        });
        notify('Адрес добавлен', 'success');
        closeModal('new-addr-modal');

        
        allAddressesFlat = await api('/api/DeliveryAddress').catch(() => allAddressesFlat);

        
        const clientModal = document.getElementById('client-modal');
        if (clientModal && !clientModal.classList.contains('hidden')) {
            renderAddressSelectors('address-selectors');
        }

        
        renderDeliveryAddressTree();
        renderTypeAddressList();
    } catch (e) { notify(e.message, 'error'); }
};

window.editAddressNode = async function (id) {
    const addr = allAddressesFlat.find(a => a.deliveryAddressID === id);
    if (!addr) return;
    const newName = await promptDialog('Новое название:', addr.name, { title: 'Адрес' });
    if (!newName?.trim()) return;
    try {
        await api(`/api/DeliveryAddress/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...addr, name: newName.trim() })
        });
        notify('Адрес обновлён', 'success');
        await loadAddressSection();
    } catch (e) { notify(e.message, 'error'); }
};

window.deleteAddressNode = async function (id) {
    if (allAddressesFlat.some(a => a.parentID === id))
        return notify('Сначала удалите дочерние адреса', 'error');
    if (!await confirmDialog('Удалить адрес?')) return;
    try {
        await api(`/api/DeliveryAddress/${id}`, { method: 'DELETE' });
        notify('Адрес удалён', 'success');
        collapsedNodes.delete(id);
        await loadAddressSection();
    } catch (e) { notify(e.message, 'error'); }
};

window.loadAddressSection = loadAddressSection;
