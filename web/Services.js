// ========== СЕРВИСЫ ==========
var allServices = [];
var allServicePrices = [];

async function loadServicesSection() {
    try {
        [allServices, allServicePrices] = await Promise.all([
            api('/api/Services').then(r => r || []),
            api('/api/ServicePrices').then(r => r || []).catch(() => [])
        ]);
        renderServicesList();
        dataLoaded.services = true;
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); showSectionError('services-list'); }
}

// текущая цена услуги (число) или null. считаем тем же хелпером, что и везде
function getServiceCurrentPrice(serviceId) {
    return servicePrice(allServicePrices, serviceId);
}
window.getServiceCurrentPrice = getServiceCurrentPrice;

function renderServicesList() {
    const el = document.getElementById('services-list');
    if (!el) return;
    if (!allServices.length) {
        el.innerHTML = '<div class="empty-msg">Нет сервисов</div>';
        return;
    }
    el.innerHTML = allServices.map(s => {
        const price = getServiceCurrentPrice(s.servicesID);
        const priceText = price != null ? `${price} руб` : 'Нет цены';
        return `
        <div class="list-row">
            <div style="flex:1;">
                <strong>${escapeHtml(s.name)}</strong>
                <span style="margin-left:0.75rem;color:var(--primary);font-weight:600;">${priceText}</span>
            </div>
            <div class="row-actions">
                <button class="btn-secondary" onclick="showServicePriceModal(${s.servicesID})">Цена</button>
                <button class="btn-secondary" onclick="editService(${s.servicesID})">Изменить</button>
                <button class="btn-danger" onclick="deleteServiceItem(${s.servicesID})">Удалить</button>
            </div>
        </div>`;
    }).join('');
}

// --- Цена услуги (история, как у изданий) ---

window.showServicePriceModal = function (serviceId) {
    const svc = allServices.find(s => s.servicesID === serviceId);
    if (!svc) return notify('Услуга не найдена', 'error');
    const current = getServiceCurrentPrice(serviceId);
    document.getElementById('service-price-id').value = serviceId;
    document.getElementById('service-price-name').value = svc.name;
    document.getElementById('service-price-value').value = current != null ? current : '';
    document.getElementById('service-price-date-start').value = new Date().toISOString().split('T')[0];
    openModal('service-price-modal');
};

window.saveServicePrice = async function () {
    try {
        const serviceId = parseInt(document.getElementById('service-price-id').value);
        const price = parseFloat(document.getElementById('service-price-value').value);
        const start = document.getElementById('service-price-date-start').value;
        if (isNaN(price) || price < 0) throw new Error('Некорректная цена');
        if (!start) throw new Error('Укажите дату начала');
        const today = new Date().toISOString();
        // закрываем старую цену, чтобы действующей осталась только новая
        const active = allServicePrices.find(p => p.servicesID === serviceId && !p.dateEnd);
        if (active) {
            await api(`/api/ServicePrices/${active.servicePricesID}`, {
                method: 'PUT',
                body: JSON.stringify({ ...active, dateEnd: today })
            });
        }
        await api('/api/ServicePrices', {
            method: 'POST',
            body: JSON.stringify({
                servicesID: serviceId,
                date: today,
                dateStart: new Date(start).toISOString(),
                dateEnd: null,
                price
            })
        });
        notify('Цена услуги сохранена', 'success');
        closeModal('service-price-modal');
        await loadServicesSection();
    } catch (e) { notify(e.message, 'error'); }
};

window.saveNewService = async function () {
    const input = document.getElementById('new-service-name');
    const name = input?.value.trim();
    if (!name) return notify('Введите название', 'warning');
    try {
        await api('/api/Services', { method: 'POST', body: JSON.stringify({ name }) });
        notify('Сервис добавлен', 'success');
        input.value = '';
        await loadServicesSection();
    } catch (e) { notify(e.message, 'error'); }
};

window.editService = async function (id) {
    const current = allServices.find(s => s.servicesID === id);
    const newName = await promptDialog('Новое название сервиса:', current?.name || '', { title: 'Сервис' });
    if (!newName?.trim()) return;
    try {
        await api(`/api/Services/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ servicesID: id, name: newName.trim() })
        });
        notify('Сервис обновлён', 'success');
        loadServicesSection();
    } catch (e) { notify(e.message, 'error'); }
};

window.deleteServiceItem = async function (id) {
    if (!await confirmDialog('Удалить сервис?')) return;
    try {
        await api(`/api/Services/${id}`, { method: 'DELETE' });
        notify('Сервис удалён', 'success');
        await loadServicesSection();
    } catch (e) { notify(e.message, 'error'); }
};

// --- Услуги подписки ---

window.manageSubServices = async function (subId) {
    try {
        if (!allServices.length) allServices = await api('/api/Services') || [];
        const all = await api('/api/SubscriptionServices') || [];
        const linked = all.filter(ss => ss.subscriptionID === subId);
        const linkedIds = new Set(linked.map(ss => ss.servicesID));

        document.getElementById('sub-services-id').value = subId;

        const linkedEl = document.getElementById('sub-services-linked');
        linkedEl.innerHTML = linked.length ? linked.map(ss => {
            const svc = allServices.find(s => s.servicesID === ss.servicesID);
            return `
                <div class="list-row">
                    <span>${svc?.name || 'Сервис ' + ss.servicesID}</span>
                    <button class="btn-danger" onclick="removeSubService(${ss.subscriptionServicesID}, ${subId})">Удалить</button>
                </div>`;
        }).join('') : '<div class="empty-msg">Нет услуг</div>';

        const addSelect = document.getElementById('sub-services-add-select');
        const available = allServices.filter(s => !linkedIds.has(s.servicesID));
        addSelect.innerHTML = available.length
            ? available.map(s => `<option value="${s.servicesID}">${s.name}</option>`).join('')
            : '<option value="">Все услуги уже добавлены</option>';

        openModal('sub-services-modal');
    } catch (e) { notify(e.message, 'error'); }
};

window.addSubService = async function () {
    const subId = parseInt(document.getElementById('sub-services-id').value);
    const serviceId = parseInt(document.getElementById('sub-services-add-select').value);
    if (!serviceId) return notify('Выберите услугу', 'warning');
    try {
        await api('/api/SubscriptionServices', {
            method: 'POST',
            body: JSON.stringify({ subscriptionID: subId, servicesID: serviceId })
        });
        notify('Услуга добавлена', 'success');
        await manageSubServices(subId);
    } catch (e) { notify(e.message, 'error'); }
};

window.removeSubService = async function (id, subId) {
    try {
        await api(`/api/SubscriptionServices/${id}`, { method: 'DELETE' });
        notify('Услуга удалена', 'success');
        await manageSubServices(subId);
    } catch (e) { notify(e.message, 'error'); }
};

window.loadServicesSection = loadServicesSection;
