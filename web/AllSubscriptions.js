// ========== ВСЕ ПОДПИСКИ ==========
var allSubsData = [];

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
            isActive: !s.dateEnd || new Date(s.dateEnd) > now
        }));

        applySubsFilters();
        setupSubsFilters();
        dataLoaded.allSubscriptions = true;
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); showSectionError('all-subs-container'); }
}

function setupSubsFilters() {
    const search = document.getElementById('subs-search');
    const status = document.getElementById('subs-status-filter');
    
    const newSearch = search?.cloneNode(true);
    const newStatus = status?.cloneNode(true);
    search?.parentNode.replaceChild(newSearch, search);
    status?.parentNode.replaceChild(newStatus, status);
    newSearch?.addEventListener('input', applySubsFilters);
    newStatus?.addEventListener('change', applySubsFilters);
}

function applySubsFilters() {
    const q = (document.getElementById('subs-search')?.value || '').toLowerCase();
    const statusVal = document.getElementById('subs-status-filter')?.value || 'all';

    const filtered = allSubsData.filter(s => {
        const matchText = s.clientName.toLowerCase().includes(q) ||
            s.publicationName.toLowerCase().includes(q);
        const matchStatus = statusVal === 'all' ||
            (statusVal === 'active' && s.isActive) ||
            (statusVal === 'expired' && !s.isActive);
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
                                <span class="status-badge ${s.isActive ? 'badge-active' : 'badge-expired'}">
                                    ${s.isActive ? 'Активна' : 'Истекла'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-danger" style="padding:0.35rem 0.65rem;font-size:0.85rem;"
                                    onclick="deleteAllSub(${s.subscriptionsID})">✖</button>
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
