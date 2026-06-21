// ========== КЛИЕНТЫ ==========
// Примечание: allAddressesFlat и typeAddresses объявлены глобально в Addres.js

async function loadClients() {
    try {
        const clients = await api('/api/Client');
        currentClients = clients.map(c => ({ ...c, id: c.clientID }));
        renderClientsList(currentClients);
        dataLoaded.clients = true;
    } catch (e) { notify('Ошибка загрузки клиентов: ' + e.message, 'error'); showSectionError('clients-grid'); }
}

async function getClientSubscriptions(clientId) {
    const [subs, pubs] = await Promise.all([api('/api/Subscriptions'), api('/api/Publications')]);
    const pubMap = {};
    pubs.forEach(p => pubMap[p.publicationsID] = p.name);
    return subs.filter(s => s.clientID === clientId).map(s => ({
        ...s,
        publicationName: pubMap[s.publicationsID] || `Издание ${s.publicationsID}`
    }));
}

async function updateClient(clientId, data) {
    await api(`/api/Client/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify({ clientID: clientId, fio: data.fio, phone: data.phone })
    });
}

// --- Добавление клиента ---

window.showAddClientModal = function () {
    document.getElementById('new-client-name').value = '';
    document.getElementById('new-client-phone').value = '';
    openModal('add-client-modal');
};

window.saveNewClient = async function () {
    const fio = document.getElementById('new-client-name').value.trim();
    const phone = document.getElementById('new-client-phone').value.trim();
    if (!fio) return notify('Введите ФИО', 'warning');
    try {
        await api('/api/Client', { method: 'POST', body: JSON.stringify({ fio, phone }) });
        notify('Клиент добавлен', 'success');
        closeModal('add-client-modal');
        await loadClients();
    } catch (e) { notify(e.message, 'error'); }
};

// --- Удаление клиента ---

window.deleteClient = async function (clientId, event) {
    if (event) event.stopPropagation();
    if (!await confirmDialog('Удалить клиента?')) return;
    try {
        const subs = await getClientSubscriptions(clientId);
        const active = subs.filter(s => !s.dateEnd || new Date(s.dateEnd) > new Date());
        if (active.length) throw new Error(`У клиента ${active.length} активных подписок. Удалите их сначала.`);
        await api(`/api/Client/${clientId}`, { method: 'DELETE' });
        notify('Клиент удалён', 'success');
        await loadClients();
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); }
};

// --- Детали клиента ---

window.showClientDetails = async function (clientId) {
    try {
        const client = currentClients.find(c => c.clientID === clientId);
        if (!client) throw new Error('Клиент не найден');

        document.getElementById('client-edit-id').value = client.clientID;
        document.getElementById('client-details-name').value = client.fio || '';
        document.getElementById('client-details-phone').value = client.phone || '';

        const [subs, pubs] = await Promise.all([
            getClientSubscriptions(clientId),
            api('/api/Publications')
        ]);

        const pubSelect = document.getElementById('subscription-publication');
        pubSelect.innerHTML = pubs.map(p => `<option value="${p.publicationsID}">${p.name || p.publicationsID}</option>`).join('');

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('subscription-date-start').value = today;
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        document.getElementById('subscription-date-end').value = nextYear.toISOString().split('T')[0];

        // Загружаем адреса (из глобального allAddressesFlat, если уже загружены)
        if (!allAddressesFlat.length) {
            allAddressesFlat = await api('/api/DeliveryAddress') || [];
        }
        if (!typeAddresses.length) {
            typeAddresses = await api('/api/TypeAddress') || [];
        }
        renderAddressSelectors('address-selectors');

        renderClientDetails(client, subs);
        openModal('client-modal');
    } catch (e) { notify(e.message, 'error'); }
};

window.saveClientChanges = async function () {
    try {
        const id = parseInt(document.getElementById('client-edit-id').value);
        await updateClient(id, {
            fio: document.getElementById('client-details-name').value,
            phone: document.getElementById('client-details-phone').value
        });
        notify('Данные обновлены', 'success');
        await loadClients();
        closeModal('client-modal');
    } catch (e) { notify(e.message, 'error'); }
};

// --- Подписки клиента ---

window.addSubscription = async function () {
    try {
        const clientId = parseInt(document.getElementById('client-edit-id').value);
        const publicationsID = parseInt(document.getElementById('subscription-publication').value);
        const dateStart = document.getElementById('subscription-date-start').value;
        const dateEnd = document.getElementById('subscription-date-end').value;
        const deliveryAddressID = parseInt(document.getElementById('selected-address-id').value);

        if (!publicationsID || !dateStart || !dateEnd || !deliveryAddressID)
            throw new Error('Заполните все поля, включая адрес доставки');

        const prices = await api('/api/SubscriptionPrices');
        const currPrice = prices.find(p => p.publicationsID === publicationsID && !p.dateEnd);

        await api('/api/Subscriptions', {
            method: 'POST',
            body: JSON.stringify({
                clientID: clientId,
                publicationsID,
                deliveryAddressID,
                date: new Date().toISOString(),
                dateStart: new Date(dateStart).toISOString(),
                dateEnd: new Date(dateEnd).toISOString(),
                price: currPrice?.price || 0
            })
        });
        notify('Подписка оформлена', 'success');
        const subs = await getClientSubscriptions(clientId);
        renderClientDetails({}, subs);
    } catch (e) { notify(e.message, 'error'); }
};

window.deleteSubscription = async function (subId) {
    if (!await confirmDialog('Удалить подписку?')) return;
    try {
        await api(`/api/Subscriptions/${subId}`, { method: 'DELETE' });
        notify('Подписка удалена', 'success');
        const clientId = parseInt(document.getElementById('client-edit-id').value);
        const subs = await getClientSubscriptions(clientId);
        renderClientDetails({}, subs);
    } catch (e) { notify(e.message, 'error'); }
};

function renderClientDetails(client, subscriptions) {
    if (client.fio !== undefined) {
        document.getElementById('client-details-name').value = client.fio || '';
        document.getElementById('client-details-phone').value = client.phone || '';
    }
    const container = document.getElementById('client-details-subscriptions');
    if (!container) return;
    if (!subscriptions.length) {
        container.innerHTML = '<div class="empty-msg">Нет подписок</div>';
        return;
    }
    container.innerHTML = subscriptions.map(s => {
        const start = new Date(s.dateStart).toLocaleDateString('ru-RU');
        const end = s.dateEnd ? new Date(s.dateEnd).toLocaleDateString('ru-RU') : '∞';
        return `
            <div class="sub-item">
                <div style="flex:1;">
                    <strong>${s.publicationName}</strong>
                    <div style="font-size:0.85rem;color:#7f8c8d;margin-top:0.2rem;">${start} — ${end}</div>
                </div>
                <span style="color:var(--primary);font-weight:700;">${s.price} руб</span>
                <div class="row-actions">
                    <button class="btn-secondary" onclick="manageSubServices(${s.subscriptionsID})">Услуги</button>
                    <button class="btn-danger" onclick="deleteSubscription(${s.subscriptionsID})">✖</button>
                </div>
            </div>`;
    }).join('');
}

// --- Селекторы адресов (каскадные дропдауны) ---

let selectedAddressId = null;

function renderAddressSelectors(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    selectedAddressId = null;
    document.getElementById('selected-address-id').value = '';
    buildAddressLevel(container, null);
}

function buildAddressLevel(container, parentId) {
    const children = allAddressesFlat.filter(a =>
        parentId === null ? (!a.parentID || a.parentID === 0) : a.parentID === parentId
    );
    if (!children.length) return;

    const select = document.createElement('select');
    select.className = 'field-input';
    select.style.marginBottom = '0.4rem';

    const typeName = typeAddresses.find(t => t.typeAddressID === children[0].typeAddressID)?.name || 'Адрес';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = `— Выберите ${typeName} —`;
    select.appendChild(def);

    children.forEach(child => {
        const opt = document.createElement('option');
        opt.value = child.deliveryAddressID;
        opt.textContent = child.name;
        select.appendChild(opt);
    });

    select.addEventListener('change', () => {
        // Убрать все следующие селекторы
        while (select.nextSibling) container.removeChild(select.nextSibling);
        const addrId = parseInt(select.value);
        if (addrId) {
            selectedAddressId = addrId;
            document.getElementById('selected-address-id').value = addrId;
            buildAddressLevel(container, addrId);
        } else {
            selectedAddressId = null;
            document.getElementById('selected-address-id').value = '';
        }
    });

    container.appendChild(select);
}
