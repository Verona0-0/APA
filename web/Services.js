// ========== СЕРВИСЫ ==========
var allServices = [];

async function loadServicesSection() {
    try {
        allServices = await api('/api/Services') || [];
        renderServicesList();
        dataLoaded.services = true;
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); showSectionError('services-list'); }
}

function renderServicesList() {
    const el = document.getElementById('services-list');
    if (!el) return;
    if (!allServices.length) {
        el.innerHTML = '<div class="empty-msg">Нет сервисов</div>';
        return;
    }
    el.innerHTML = allServices.map(s => `
        <div class="list-row">
            <strong>${escapeHtml(s.name)}</strong>
            <div class="row-actions">
                <button class="btn-secondary" onclick="editService(${s.servicesID})">Изменить</button>
                <button class="btn-danger" onclick="deleteServiceItem(${s.servicesID})">Удалить</button>
            </div>
        </div>
    `).join('');
}

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
                    <button class="btn-danger" onclick="removeSubService(${ss.subscriptionServicesID}, ${subId})">✖</button>
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
