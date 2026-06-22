// ========== ВСЕ ПОДПИСКИ ==========
var allSubsData = [];

// подпись и css-класс бейджа по статусу (active/future/expired)
function subStatusLabel(status) {
    return status === 'active' ? 'Активна' : status === 'future' ? 'Будущая' : 'Истекла';
}
function subBadgeClass(status) {
    return status === 'active' ? 'badge-active' : status === 'future' ? 'badge-future' : 'badge-expired';
}

async function loadAllSubscriptions() {
    try {
        const [subs, clients, pubs] = await Promise.all([
            api('/api/Subscriptions'),
            api('/api/Client'),
            api('/api/Publications')
        ]);

        const clientMap = {};
        clients.forEach(c => clientMap[c.clientID] = c.fio || `Клиент ${c.clientID}`);
        const pubMap = {};
        pubs.forEach(p => pubMap[p.publicationsID] = p.name || `Издание ${p.publicationsID}`);

        const now = new Date();
        allSubsData = subs.map(s => ({
            ...s,
            clientName: clientMap[s.clientID] || `Клиент ${s.clientID}`,
            publicationName: pubMap[s.publicationsID] || `Издание ${s.publicationsID}`,
            status: subStatus(s, now)
        }));

        setupSubsFilters();
        applySubsFilters();
        dataLoaded.allSubscriptions = true;
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); showSectionError('all-subs-container'); }
}

function setupSubsFilters() {
    [
        ['subs-search', 'input'],
        ['subs-status-filter', 'change'],
        ['subs-date-from', 'change'],
        ['subs-date-to', 'change'],
        ['subs-price-min', 'input'],
        ['subs-price-max', 'input']
    ].forEach(([id, evt]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.oninput = null;
        el.onchange = null;
        el[evt === 'change' ? 'onchange' : 'oninput'] = applySubsFilters;
    });
}

function applySubsFilters() {
    const q = (document.getElementById('subs-search')?.value || '').toLowerCase();
    const statusVal = document.getElementById('subs-status-filter')?.value || 'all';
    const dateFrom = document.getElementById('subs-date-from')?.value;
    const dateTo = document.getElementById('subs-date-to')?.value;
    const min = parseFloat(document.getElementById('subs-price-min')?.value);
    const max = parseFloat(document.getElementById('subs-price-max')?.value);

    const filtered = allSubsData.filter(s => {
        const matchText = s.clientName.toLowerCase().includes(q) ||
            s.publicationName.toLowerCase().includes(q);
        const matchStatus = statusVal === 'all' || statusVal === s.status;

        const start = new Date(s.dateStart);
        if (dateFrom && start < new Date(dateFrom)) return false;
        if (dateTo && start > new Date(dateTo + 'T23:59:59')) return false;
        if (!isNaN(min) && s.price < min) return false;
        if (!isNaN(max) && s.price > max) return false;

        return matchText && matchStatus;
    });

    renderAllSubscriptions(filtered);
}

function renderAllSubscriptions(subs) {
    const container = document.getElementById('all-subs-container');
    if (!container) return;

    if (!subs.length) {
        container.innerHTML = '<div class="empty-msg">Подписки не найдены</div>';
        return;
    }

    container.innerHTML = `
        <div style="overflow-x:auto;">
            <table class="subs-table">
                <thead>
                    <tr>
                        <th>Клиент</th>
                        <th>Издание</th>
                        <th>Начало</th>
                        <th>Окончание</th>
                        <th>Цена</th>
                        <th>Статус</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${subs.map(s => `
                        <tr>
                            <td>${s.clientName}</td>
                            <td>${s.publicationName}</td>
                            <td>${new Date(s.dateStart).toLocaleDateString('ru-RU')}</td>
                            <td>${s.dateEnd ? new Date(s.dateEnd).toLocaleDateString('ru-RU') : '—'}</td>
                            <td style="white-space:nowrap;">${s.price.toLocaleString()} руб</td>
                            <td>
                                <span class="status-badge ${subBadgeClass(s.status)}">
                                    ${subStatusLabel(s.status)}
                                </span>
                            </td>
                            <td style="white-space:nowrap;">
                                <button class="btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.85rem;"
                                    onclick="openSubDetail(${s.subscriptionsID})">Открыть</button>
                                <button class="btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.85rem;"
                                    onclick="printSubscriptionReceipt(${s.subscriptionsID})">Квитанция</button>
                                <button class="btn-danger" style="padding:0.35rem 0.65rem;font-size:0.85rem;"
                                    onclick="deleteAllSub(${s.subscriptionsID})">Удалить</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top:1rem;color:var(--gray);font-size:0.9rem;">
            Показано: ${subs.length} из ${allSubsData.length}
        </div>
    `;
}

// собираем полный адрес от корня вниз по плоскому списку адресов
function subAddrPath(addrId) {
    const path = [];
    let cur = allAddressesFlat.find(a => a.deliveryAddressID === addrId);
    let guard = 0;
    while (cur && guard++ < 30) {
        path.unshift(cur.name);
        cur = (cur.parentID && cur.parentID !== 0)
            ? allAddressesFlat.find(a => a.deliveryAddressID === cur.parentID)
            : null;
    }
    return path.join(', ');
}

// открыть подписку: смотрим данные, меняем адрес, можно перейти к услугам
window.openSubDetail = async function (subId) {
    const s = allSubsData.find(x => x.subscriptionsID === subId);
    if (!s) return notify('Подписка не найдена', 'error');
    if (!allAddressesFlat.length) {
        allAddressesFlat = await api('/api/DeliveryAddress').catch(() => []);
    }

    document.getElementById('sub-detail-id').value = subId;
    document.getElementById('sub-detail-client').textContent = s.clientName;
    document.getElementById('sub-detail-pub').textContent = 'Издание: ' + s.publicationName;
    const start = new Date(s.dateStart).toLocaleDateString('ru-RU');
    const end = s.dateEnd ? new Date(s.dateEnd).toLocaleDateString('ru-RU') : '∞';
    document.getElementById('sub-detail-period').textContent = `Период: ${start} — ${end}`;
    document.getElementById('sub-detail-price').textContent = `${s.price.toLocaleString()} руб`;

    const sel = document.getElementById('sub-detail-address');
    sel.innerHTML = allAddressesFlat.length
        ? allAddressesFlat.map(a => `<option value="${a.deliveryAddressID}">${escapeHtml(subAddrPath(a.deliveryAddressID))}</option>`).join('')
        : '<option value="">Нет адресов</option>';
    sel.value = s.deliveryAddressID;

    openModal('sub-detail-modal');
};

window.saveSubAddress = async function () {
    const subId = parseInt(document.getElementById('sub-detail-id').value);
    const addrId = parseInt(document.getElementById('sub-detail-address').value);
    if (!addrId) return notify('Выберите адрес', 'warning');
    try {
        // тянем подписку целиком, чтобы при PUT не затереть остальные поля
        const full = await api(`/api/Subscriptions/${subId}`);
        await api(`/api/Subscriptions/${subId}`, {
            method: 'PUT',
            body: JSON.stringify({ ...full, deliveryAddressID: addrId })
        });
        notify('Адрес доставки обновлён', 'success');
        const s = allSubsData.find(x => x.subscriptionsID === subId);
        if (s) s.deliveryAddressID = addrId;
        closeModal('sub-detail-modal');
    } catch (e) { notify(e.message, 'error'); }
};

window.deleteAllSub = async function (id) {
    if (!await confirmDialog('Удалить подписку?')) return;
    try {
        await api(`/api/Subscriptions/${id}`, { method: 'DELETE' });
        notify('Подписка удалена', 'success');
        allSubsData = allSubsData.filter(s => s.subscriptionsID !== id);
        applySubsFilters();
    } catch (e) { notify(e.message, 'error'); }
};

window.loadAllSubscriptions = loadAllSubscriptions;
