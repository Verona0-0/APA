// ========== ОТЧЕТЫ ==========

async function loadReports() {
    try {
        const [subs, pubs] = await Promise.all([
            api('/api/Subscriptions'),
            api('/api/Publications').catch(() => [])
        ]);
        const pubMap = {};
        (pubs || []).forEach(p => pubMap[p.publicationsID] = p.name || `Издание ${p.publicationsID}`);
        renderReports(subs, pubMap);
        if (window.populateReceiptSelect) populateReceiptSelect();
        dataLoaded.reports = true;
    } catch (e) { notify(e.message, 'error'); showSectionError('reports-grid'); }
}

const money = n => `${Number(n || 0).toLocaleString('ru-RU')} руб`;

function renderReports(subs, pubMap = {}) {
    const grid = document.getElementById('reports-grid');
    if (!grid) return;

    // отчёт показывает то, что есть на сегодня. будущие (ещё не начавшиеся)
    // нигде не считаем — ни в счётчиках, ни в выручке
    const visible = (subs || []).filter(s => subStatus(s) !== 'future');
    const activeSubs = visible.filter(s => isSubActive(s));
    const expired = visible.length - activeSubs.length;
    const activeRevenue = activeSubs.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalRevenue = visible.reduce((sum, s) => sum + (s.price || 0), 0);

    // популярность считаем по живым подпискам (текущий спрос)
    const pubCount = {};
    activeSubs.forEach(s => pubCount[s.publicationsID] = (pubCount[s.publicationsID] || 0) + 1);
    const top = Object.entries(pubCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    grid.innerHTML = `
        <div class="card">
            <div class="card-title">Активные подписки</div>
            <div class="card-price">${activeSubs.length}</div>
            <div class="card-meta">всего: ${visible.length} · истекло: ${expired}</div>
        </div>
        <div class="card">
            <div class="card-title">Выручка по активным</div>
            <div class="card-price">${money(activeRevenue)}</div>
            <div class="card-meta">за всё время: ${money(totalRevenue)}</div>
        </div>
        <div class="card">
            <div class="card-title">Популярные издания</div>
            <div>${top.length
                ? top.map(([id, cnt]) => `<div>${escapeHtml(pubMap[id] || ('Издание #' + id))}: ${cnt}</div>`).join('')
                : '<span style="color:var(--gray);">Нет активных подписок</span>'}</div>
        </div>
    `;
}