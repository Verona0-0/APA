// ========== ПЕЧАТНЫЕ ДОКУМЕНТЫ ==========
// тут печатные формы: квитанция, прайс-листы услуг и изданий, отчёт по подпискам.
// печать открываем в отдельном окне со своим css (window.print),
// оттуда же можно сохранить в PDF.

const ORG_NAME = 'Федеральная почтовая служба';
const ORG_SUB = 'Отделение связи · отдел оформления подписки';

const PRINT_CSS = `
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 24px 32px; font-size: 13px; }
    .doc-org { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 16px; }
    .doc-org h1 { font-size: 16px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-org div { font-size: 12px; color: #555; margin-top: 2px; }
    .doc-title { text-align: center; font-size: 18px; font-weight: 700; margin: 16px 0; }
    .doc-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; font-size: 12px; color: #333; }
    .doc-block { margin-bottom: 14px; }
    .doc-block h3 { font-size: 13px; margin: 0 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
    .doc-block .row { display: flex; gap: 8px; margin: 3px 0; }
    .doc-block .row .label { color: #666; min-width: 150px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
    th { background: #f0f0f0; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    tr.total td { font-weight: 700; background: #f7f7f7; }
    .doc-sign { display: flex; justify-content: space-between; margin-top: 36px; font-size: 12px; }
    .doc-sign .line { border-top: 1px solid #1a1a1a; padding-top: 4px; width: 45%; text-align: center; color: #555; }
    .doc-footer { margin-top: 24px; font-size: 11px; color: #888; text-align: center; }
    .summary { display: flex; gap: 24px; flex-wrap: wrap; margin: 12px 0; }
    .summary div { font-size: 12px; }
    .summary strong { display: block; font-size: 18px; }
    @media print {
        .no-print { display: none !important; }
        body { padding: 0; }
    }
`;

function printDocument(title, bodyHtml) {
    const w = window.open('', '_blank', 'width=820,height=920');
    if (!w) { notify('Разрешите всплывающие окна, чтобы печатать документы', 'warning'); return; }
    w.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>
        ${bodyHtml}
        <div class="no-print" style="text-align:center;margin-top:28px;">
            <button onclick="window.print()" style="padding:8px 18px;cursor:pointer;">Печать / Сохранить PDF</button>
            <button onclick="window.close()" style="padding:8px 18px;cursor:pointer;margin-left:8px;">Закрыть</button>
        </div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (_) { } }, 350);
}

function docHeader(title) {
    return `
        <div class="doc-org">
            <h1>${ORG_NAME}</h1>
            <div>${ORG_SUB}</div>
        </div>
        <div class="doc-title">${title}</div>`;
}

function fmtMoney(n) {
    return `${Number(n || 0).toLocaleString('ru-RU')} руб`;
}

function operatorName() {
    return (currentUser && (currentUser.fullName || currentUser.username)) || 'Оператор';
}

// собираем адрес целиком от корня вниз: «Город, Улица, Дом»
function buildAddressPath(addrId, addresses) {
    const path = [];
    let cur = addresses.find(a => a.deliveryAddressID === addrId);
    let guard = 0;
    while (cur && guard++ < 30) {
        path.unshift(cur.name);
        cur = (cur.parentID && cur.parentID !== 0)
            ? addresses.find(a => a.deliveryAddressID === cur.parentID)
            : null;
    }
    return path.join(', ');
}

// ========== КВИТАНЦИЯ ПОДПИСКИ ==========

window.printSubscriptionReceipt = async function (subId) {
    try {
        const sub = await api(`/api/Subscriptions/${subId}`);
        if (!sub) throw new Error('Подписка не найдена');

        const [client, pub, addresses, subServices, services, servicePrices] = await Promise.all([
            api(`/api/Client/${sub.clientID}`).catch(() => null),
            api(`/api/Publications/${sub.publicationsID}`).catch(() => null),
            api('/api/DeliveryAddress').catch(() => []),
            api('/api/SubscriptionServices').catch(() => []),
            api('/api/Services').catch(() => []),
            api('/api/ServicePrices').catch(() => [])
        ]);

        const linked = subServices.filter(ss => ss.subscriptionID === subId);
        const serviceLines = linked.map(ss => {
            const svc = services.find(s => s.servicesID === ss.servicesID);
            return { name: svc?.name || `Услуга ${ss.servicesID}`, price: servicePrice(servicePrices, ss.servicesID) || 0 };
        });

        const base = Number(sub.price || 0);
        const servicesTotal = serviceLines.reduce((s, l) => s + Number(l.price || 0), 0);
        const total = base + servicesTotal;

        const addressPath = buildAddressPath(sub.deliveryAddressID, addresses) || '—';
        const period = `${formatDateLocale(sub.dateStart)} — ${sub.dateEnd ? formatDateLocale(sub.dateEnd) : 'бессрочно'}`;

        const rows = [
            `<tr><td>Подписка на издание «${escapeHtml(pub?.name || ('Издание ' + sub.publicationsID))}»</td><td class="num">${fmtMoney(base)}</td></tr>`,
            ...serviceLines.map(l => `<tr><td>Услуга: ${escapeHtml(l.name)}</td><td class="num">${fmtMoney(l.price)}</td></tr>`),
            `<tr class="total"><td>ИТОГО</td><td class="num">${fmtMoney(total)}</td></tr>`
        ].join('');

        const body = `
            ${docHeader('Квитанция подписки № ' + subId)}
            <div class="doc-meta">
                <div>Дата оформления: <strong>${formatDateLocale(sub.date)}</strong></div>
                <div>Оператор: <strong>${escapeHtml(operatorName())}</strong></div>
            </div>
            <div class="doc-block">
                <h3>Подписчик</h3>
                <div class="row"><span class="label">ФИО</span><span>${escapeHtml(client?.fio || ('Клиент ' + sub.clientID))}</span></div>
                <div class="row"><span class="label">Телефон</span><span>${escapeHtml(client?.phone || '—')}</span></div>
                <div class="row"><span class="label">Адрес доставки</span><span>${escapeHtml(addressPath)}</span></div>
            </div>
            <div class="doc-block">
                <h3>Параметры подписки</h3>
                <div class="row"><span class="label">Издание</span><span>${escapeHtml(pub?.name || ('Издание ' + sub.publicationsID))}</span></div>
                <div class="row"><span class="label">Период подписки</span><span>${period}</span></div>
            </div>
            <table>
                <thead><tr><th>Наименование</th><th class="num">Сумма</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="doc-sign">
                <div class="line">Оператор</div>
                <div class="line">Подписчик</div>
            </div>
            <div class="doc-footer">Документ сформирован ${new Date().toLocaleString('ru-RU')}</div>`;

        printDocument('Квитанция подписки № ' + subId, body);
    } catch (e) { notify('Ошибка формирования квитанции: ' + e.message, 'error'); }
};

// наполняем список подписок в «Отчётах» — чтобы выбрать и напечатать квитанцию
window.populateReceiptSelect = async function () {
    const sel = document.getElementById('receipt-sub-select');
    if (!sel) return;
    try {
        const [subs, clients, pubs] = await Promise.all([
            api('/api/Subscriptions').catch(() => []),
            api('/api/Client').catch(() => []),
            api('/api/Publications').catch(() => [])
        ]);
        if (!subs.length) {
            sel.innerHTML = '<option value="">Нет подписок</option>';
            return;
        }
        const clientMap = {}; clients.forEach(c => clientMap[c.clientID] = c.fio || `Клиент ${c.clientID}`);
        const pubMap = {}; pubs.forEach(p => pubMap[p.publicationsID] = p.name || `Издание ${p.publicationsID}`);
        sel.innerHTML = subs.map(s => {
            const label = `№${s.subscriptionsID} · ${clientMap[s.clientID] || ('Клиент ' + s.clientID)} — ${pubMap[s.publicationsID] || ('Издание ' + s.publicationsID)}`;
            return `<option value="${s.subscriptionsID}">${escapeHtml(label)}</option>`;
        }).join('');
    } catch (_) {
        sel.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
};

window.printSelectedReceipt = function () {
    const sel = document.getElementById('receipt-sub-select');
    const id = parseInt(sel?.value);
    if (!id) return notify('Выберите подписку', 'warning');
    printSubscriptionReceipt(id);
};

// ========== ПРАЙС-ЛИСТ УСЛУГ ==========

window.printServicesPriceList = async function () {
    try {
        const [services, servicePrices] = await Promise.all([
            api('/api/Services').catch(() => []),
            api('/api/ServicePrices').catch(() => [])
        ]);

        if (!services.length) return notify('Нет услуг для прайс-листа', 'warning');

        const rows = services.map((s, i) => {
            const p = priceOn(servicePrices.filter(x => x.servicesID === s.servicesID));
            return `<tr>
                <td class="num">${i + 1}</td>
                <td>${escapeHtml(s.name)}</td>
                <td class="num">${p ? fmtMoney(p.price) : '—'}</td>
                <td class="num">${p ? formatDateLocale(p.dateStart) : '—'}</td>
            </tr>`;
        }).join('');

        const body = `
            ${docHeader('Прайс-лист на оказываемые услуги')}
            <div class="doc-meta">
                <div>Дата: <strong>${new Date().toLocaleDateString('ru-RU')}</strong></div>
                <div>Составил: <strong>${escapeHtml(operatorName())}</strong></div>
            </div>
            <table>
                <thead><tr><th class="num">№</th><th>Наименование услуги</th><th class="num">Цена</th><th class="num">Действует с</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="doc-footer">Документ сформирован ${new Date().toLocaleString('ru-RU')}</div>`;

        printDocument('Прайс-лист услуг', body);
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); }
};

// ========== ПРАЙС-ЛИСТ ИЗДАНИЙ ==========

window.printPublicationsPriceList = async function () {
    try {
        const [pubs, prices] = await Promise.all([
            api('/api/Publications').catch(() => []),
            api('/api/SubscriptionPrices').catch(() => [])
        ]);
        if (!pubs.length) return notify('Нет изданий для прайс-листа', 'warning');

        const rows = pubs.map((p, i) => {
            const pr = priceOn(prices.filter(x => x.publicationsID === p.publicationsID));
            return `<tr>
                <td class="num">${i + 1}</td>
                <td>${escapeHtml(p.name)}</td>
                <td class="num">${pr ? fmtMoney(pr.price) : '—'}</td>
                <td class="num">${pr ? formatDateLocale(pr.dateStart) : '—'}</td>
            </tr>`;
        }).join('');

        const body = `
            ${docHeader('Прайс-лист на подписку (издания)')}
            <div class="doc-meta">
                <div>Дата: <strong>${new Date().toLocaleDateString('ru-RU')}</strong></div>
                <div>Составил: <strong>${escapeHtml(operatorName())}</strong></div>
            </div>
            <table>
                <thead><tr><th class="num">№</th><th>Издание</th><th class="num">Цена подписки</th><th class="num">Действует с</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="doc-footer">Документ сформирован ${new Date().toLocaleString('ru-RU')}</div>`;

        printDocument('Прайс-лист изданий', body);
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); }
};

// ========== ОТЧЁТ ПО ПОДПИСКАМ ==========

window.printSubscriptionsReport = async function () {
    try {
        const from = document.getElementById('report-date-from')?.value || '';
        const to = document.getElementById('report-date-to')?.value || '';
        const [allSubs, clients, pubs] = await Promise.all([
            api('/api/Subscriptions').catch(() => []),
            api('/api/Client').catch(() => []),
            api('/api/Publications').catch(() => [])
        ]);
        if (!allSubs.length) return notify('Нет подписок для отчёта', 'warning');

        // фильтр по дате оформления (поле date). пусто — значит за всё время
        const fromD = from ? new Date(from) : null;
        const toD = to ? new Date(to + 'T23:59:59') : null;
        if (fromD && toD && fromD > toD) return notify('Дата «с» больше даты «по»', 'warning');
        const subs = allSubs.filter(s => {
            // будущие (ещё не начавшиеся) в отчёт не берём
            if (subStatus(s) === 'future') return false;
            const d = new Date(s.date);
            if (fromD && d < fromD) return false;
            if (toD && d > toD) return false;
            return true;
        });
        if (!subs.length) return notify('За выбранный период подписок нет', 'warning');

        const periodText = (from || to)
            ? `Период оформления: ${from ? new Date(from).toLocaleDateString('ru-RU') : '…'} — ${to ? new Date(to).toLocaleDateString('ru-RU') : '…'}`
            : 'За всё время';

        const clientMap = {}; clients.forEach(c => clientMap[c.clientID] = c.fio || `Клиент ${c.clientID}`);
        const pubMap = {}; pubs.forEach(p => pubMap[p.publicationsID] = p.name || `Издание ${p.publicationsID}`);

        const now = new Date();
        const active = subs.filter(s => isSubActive(s, now)).length;
        const revenue = subs.reduce((sum, s) => sum + Number(s.price || 0), 0);

        const rows = subs.map(s => {
            const isActive = isSubActive(s, now);
            return `<tr>
                <td>${escapeHtml(clientMap[s.clientID] || ('Клиент ' + s.clientID))}</td>
                <td>${escapeHtml(pubMap[s.publicationsID] || ('Издание ' + s.publicationsID))}</td>
                <td class="num">${formatDateLocale(s.dateStart)}</td>
                <td class="num">${s.dateEnd ? formatDateLocale(s.dateEnd) : '—'}</td>
                <td class="num">${fmtMoney(s.price)}</td>
                <td>${isActive ? 'Активна' : 'Истекла'}</td>
            </tr>`;
        }).join('');

        const body = `
            ${docHeader('Отчёт по подпискам')}
            <div class="doc-meta">
                <div>Дата отчёта: <strong>${now.toLocaleDateString('ru-RU')}</strong></div>
                <div>${escapeHtml(periodText)}</div>
                <div>Составил: <strong>${escapeHtml(operatorName())}</strong></div>
            </div>
            <div class="summary">
                <div>Всего подписок<strong>${subs.length}</strong></div>
                <div>Активных<strong>${active}</strong></div>
                <div>Выручка<strong>${fmtMoney(revenue)}</strong></div>
            </div>
            <table>
                <thead><tr><th>Клиент</th><th>Издание</th><th class="num">Начало</th><th class="num">Окончание</th><th class="num">Цена</th><th>Статус</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="doc-footer">Документ сформирован ${now.toLocaleString('ru-RU')}</div>`;

        printDocument('Отчёт по подпискам', body);
    } catch (e) { notify('Ошибка: ' + e.message, 'error'); }
};
