// ========== ЦЕНЫ ==========

async function loadSubscriptionPrices() {
    try {
        allPrices = await api('/api/SubscriptionPrices') || [];
        const pubs = await api('/api/Publications') || [];
        const pubMap = {};
        pubs.forEach(p => pubMap[p.publicationsID] = p.name);
        const withNames = allPrices.map(p => ({
            ...p,
            publicationName: pubMap[p.publicationsID] || `Издание ${p.publicationsID}`,
            date: formatDateLocale(p.date),
            dateStart: formatDateLocale(p.dateStart),
            dateEnd: p.dateEnd ? formatDateLocale(p.dateEnd) : null,
            isCurrent: !p.dateEnd
        }));
        renderPricesList(withNames, true);
        dataLoaded.prices = true;
    } catch (e) { notify(e.message, 'error'); showSectionError('prices-grid'); }
}

function renderPricesList(prices, showOnlyActive) {
    const grid = document.getElementById('prices-grid');
    if (!grid) return;
    const filtered = showOnlyActive ? prices.filter(p => p.isCurrent) : prices;
    const cb = document.getElementById('show-inactive-prices');
    if (cb) cb.checked = !showOnlyActive;
    if (filtered.length) {
        grid.innerHTML = filtered.map(p => `
            <div class="card price-card">
                <div class="card-icon"></div>
                <div class="card-title">${p.publicationName}</div>
                <div class="card-price">${p.price} руб</div>
                <div class="price-dates">
                    <div> ${p.date}</div>
                    <div> ${p.dateStart}</div>
                    ${p.dateEnd ? `<div> ${p.dateEnd}</div>` : '<div class="current-badge">Текущая</div>'}
                </div>
                <div style="display:flex; gap:0.5rem; justify-content:center;">
                    <button class="edit-btn" onclick="editPrice(${p.subscriptionPricesID})">Изменить</button>
                    <button class="remove-btn" onclick="deletePrice(${p.subscriptionPricesID})">Удалить</button>
                </div>
            </div>
        `).join('');
    } else grid.innerHTML = '<div class="card"><div class="card-title">Цены не найдены</div></div>';
}

window.toggleInactivePrices = function () {
    const showInactive = document.getElementById('show-inactive-prices').checked;
    const pubs = api('/api/Publications');
    pubs.then(pubsArr => {
        const pubMap = {};
        pubsArr.forEach(p => pubMap[p.publicationsID] = p.name);
        const withNames = allPrices.map(p => ({
            ...p, publicationName: pubMap[p.publicationsID] || `Издание ${p.publicationsID}`,
            date: formatDateLocale(p.date), dateStart: formatDateLocale(p.dateStart),
            dateEnd: p.dateEnd ? formatDateLocale(p.dateEnd) : null, isCurrent: !p.dateEnd
        }));
        renderPricesList(withNames, !showInactive);
    });
};

window.deletePrice = async function (priceId) {
    if (await confirmDialog('Удалить запись о цене?')) {
        try {
            await api(`/api/SubscriptionPrices/${priceId}`, { method: 'DELETE' });
            notify('Цена удалена', 'success');
            await loadSubscriptionPrices();
            await loadPublications();
        } catch (e) { notify(e.message, 'error'); }
    }
};

window.editPrice = async function (priceId) {
    const price = allPrices.find(p => p.subscriptionPricesID === priceId);
    if (!price) return notify('Цена не найдена', 'error');
    const pubs = await api('/api/Publications');
    const pub = pubs.find(p => p.publicationsID === price.publicationsID);
    document.getElementById('price-edit-id').value = priceId;
    document.getElementById('price-edit-publication').value = pub?.name || `Издание ${price.publicationsID}`;
    document.getElementById('price-edit-value').value = price.price;
    document.getElementById('price-edit-date-start').value = formatDate(price.dateStart);
    document.getElementById('price-edit-date-end').value = price.dateEnd ? formatDate(price.dateEnd) : '';
    openModal('price-modal');
};

window.savePriceChanges = async function () {
    try {
        const priceId = parseInt(document.getElementById('price-edit-id').value);
        const newPrice = parseFloat(document.getElementById('price-edit-value').value);
        const newStart = document.getElementById('price-edit-date-start').value;
        const newEnd = document.getElementById('price-edit-date-end').value || null;
        if (isNaN(newPrice) || newPrice < 0) throw new Error('Некорректная цена');
        if (!newStart) throw new Error('Укажите дату начала');
        const existing = allPrices.find(p => p.subscriptionPricesID === priceId);
        const updated = {
            ...existing,
            price: newPrice,
            dateStart: new Date(newStart).toISOString(),
            dateEnd: newEnd ? new Date(newEnd).toISOString() : null
        };
        await api(`/api/SubscriptionPrices/${priceId}`, {
            method: 'PUT',
            body: JSON.stringify(updated)
        });
        notify('Цена обновлена', 'success');
        closeModal('price-modal');
        await loadSubscriptionPrices();
        await loadPublications();
    } catch (e) { notify(e.message, 'error'); }
};

window.showAddPriceModal = async function () {
    const pubs = await api('/api/Publications');
    const select = document.getElementById('new-price-publication');
    select.innerHTML = pubs.map(p => `<option value="${p.publicationsID}">${p.name || p.publicationsID}</option>`).join('');
    document.getElementById('new-price-date-start').value = new Date().toISOString().split('T')[0];
    document.getElementById('new-price-date-end').value = '';
    document.getElementById('new-price-value').value = '';
    openModal('new-price-modal');
};

window.saveNewPrice = async function () {
    try {
        const pubId = parseInt(document.getElementById('new-price-publication').value);
        const price = parseFloat(document.getElementById('new-price-value').value);
        const start = document.getElementById('new-price-date-start').value;
        const end = document.getElementById('new-price-date-end').value || null;
        if (!pubId || isNaN(price) || !start) throw new Error('Заполните все поля');
        const today = new Date().toISOString();
        const existing = await api('/api/SubscriptionPrices');
        const active = existing.find(p => p.publicationsID === pubId && !p.dateEnd);
        if (active && !end) {
            await api(`/api/SubscriptionPrices/${active.subscriptionPricesID}`, {
                method: 'PUT',
                body: JSON.stringify({ ...active, dateEnd: today })
            });
        }
        await api('/api/SubscriptionPrices', {
            method: 'POST',
            body: JSON.stringify({
                publicationsID: pubId,
                date: today,
                dateStart: new Date(start).toISOString(),
                dateEnd: end ? new Date(end).toISOString() : null,
                price
            })
        });
        notify('Цена добавлена', 'success');
        closeModal('new-price-modal');
        await loadSubscriptionPrices();
        await loadPublications();
    } catch (e) { notify(e.message, 'error'); }
};