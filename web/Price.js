// ========== ЦЕНЫ ==========

let pricesPubMap = {};

async function loadSubscriptionPrices() {
    try {
        allPrices = await api('/api/SubscriptionPrices') || [];
        const pubs = await api('/api/Publications') || [];
        pricesPubMap = {};
        pubs.forEach(p => pricesPubMap[p.publicationsID] = p.name);

        // фильтр по изданию: пусто — все издания (текущие цены),
        // выбрано издание — вся история его цен
        const sel = document.getElementById('price-pub-filter');
        if (sel) {
            const prev = sel.value;
            sel.innerHTML = '<option value="">Все издания (текущие цены)</option>' +
                pubs.map(p => `<option value="${p.publicationsID}">${escapeHtml(p.name || ('Издание ' + p.publicationsID))}</option>`).join('');
            sel.value = prev;
        }

        setupPriceFilters();
        applyPriceFilters();
        dataLoaded.prices = true;
    } catch (e) { notify(e.message, 'error'); showSectionError('prices-grid'); }
}

function setupPriceFilters() {
    const pub = document.getElementById('price-pub-filter');
    if (pub) pub.onchange = applyPriceFilters;
    const min = document.getElementById('price-min');
    if (min) min.oninput = applyPriceFilters;
    const max = document.getElementById('price-max');
    if (max) max.oninput = applyPriceFilters;
    const cb = document.getElementById('show-inactive-prices');
    if (cb) cb.onchange = applyPriceFilters;
}

function decoratePrice(p) {
    return {
        ...p,
        publicationName: pricesPubMap[p.publicationsID] || `Издание ${p.publicationsID}`,
        dateText: formatDateLocale(p.date),
        startText: formatDateLocale(p.dateStart),
        endText: p.dateEnd ? formatDateLocale(p.dateEnd) : null
    };
}

function applyPriceFilters() {
    const pubId = parseInt(document.getElementById('price-pub-filter')?.value) || null;
    const showInactive = document.getElementById('show-inactive-prices')?.checked;
    const min = parseFloat(document.getElementById('price-min')?.value);
    const max = parseFloat(document.getElementById('price-max')?.value);

    let list = allPrices.slice();
    if (pubId) {
        // выбрано издание — показываем всю его историю цен
        list = list.filter(p => p.publicationsID === pubId);
    } else if (!showInactive) {
        // все издания — по умолчанию только действующие цены
        list = list.filter(p => !p.dateEnd);
    }
    if (!isNaN(min)) list = list.filter(p => p.price >= min);
    if (!isNaN(max)) list = list.filter(p => p.price <= max);

    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderPricesList(list.map(decoratePrice), !!pubId);
}
window.applyPriceFilters = applyPriceFilters;


window.toggleInactivePrices = applyPriceFilters;

function renderPricesList(prices, isHistory) {
    const grid = document.getElementById('prices-grid');
    if (!grid) return;
    grid.className = '';
    if (!prices.length) {
        grid.innerHTML = '<div class="empty-msg">Цены не найдены</div>';
        return;
    }
    grid.innerHTML = `
        ${isHistory ? `<div style="margin-bottom:0.75rem;color:var(--gray);font-size:0.9rem;">История цен издания: ${escapeHtml(prices[0].publicationName)}</div>` : ''}
        <div style="overflow-x:auto;">
            <table class="subs-table">
                <thead>
                    <tr>
                        <th>Издание</th>
                        <th>Цена</th>
                        <th>Установлена</th>
                        <th>Действует с</th>
                        <th>По</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${prices.map(p => `
                        <tr>
                            <td>${escapeHtml(p.publicationName)}</td>
                            <td style="white-space:nowrap;font-weight:700;">${p.price} руб</td>
                            <td>${p.dateText}</td>
                            <td>${p.startText}</td>
                            <td>${p.endText ? p.endText : '<span class="status-badge badge-active">Текущая</span>'}</td>
                            <td style="white-space:nowrap;">
                                <button class="btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.85rem;" onclick="editPrice(${p.subscriptionPricesID})">Изменить</button>
                                <button class="btn-danger" style="padding:0.35rem 0.65rem;font-size:0.85rem;" onclick="deletePrice(${p.subscriptionPricesID})">Удалить</button>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

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
    document.getElementById('price-edit-id').value = priceId;
    document.getElementById('price-edit-publication').value = pricesPubMap[price.publicationsID] || `Издание ${price.publicationsID}`;
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
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('new-price-date-start').value = today;
    document.getElementById('new-price-prev-close').value = today;
    document.getElementById('new-price-date-end').value = '';
    document.getElementById('new-price-value').value = '';
    openModal('new-price-modal');
};

window.saveNewPrice = async function () {
    try {
        const pubId = parseInt(document.getElementById('new-price-publication').value);
        const price = parseFloat(document.getElementById('new-price-value').value);
        const start = document.getElementById('new-price-date-start').value;
        const prevClose = document.getElementById('new-price-prev-close').value || start;
        const end = document.getElementById('new-price-date-end').value || null;
        if (!pubId || isNaN(price) || !start) throw new Error('Заполните все поля');
        const today = new Date().toISOString();
        const existing = await api('/api/SubscriptionPrices');
        // закрываем текущую цену издания той датой, что выбрали
        const active = existing.find(p => p.publicationsID === pubId && !p.dateEnd);
        if (active) {
            await api(`/api/SubscriptionPrices/${active.subscriptionPricesID}`, {
                method: 'PUT',
                body: JSON.stringify({ ...active, dateEnd: new Date(prevClose).toISOString() })
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
