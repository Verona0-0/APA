// ========== ОТЧЕТЫ ==========

async function loadReports() {
    try {
        const subs = await api('/api/Subscriptions');
        renderReports(subs);
        dataLoaded.reports = true;
        notify('Отчёты загружены', 'success');
    } catch (e) { notify(e.message, 'error'); }
}

function renderReports(subs) {
    const grid = document.getElementById('reports-grid');
    if (!grid) return;
    const total = subs?.length || 0;
    const active = subs?.filter(s => !s.dateEnd || new Date(s.dateEnd) > new Date()).length || 0;
    const revenue = subs?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;
    const pubCount = {};
    subs?.forEach(s => pubCount[s.publicationsID] = (pubCount[s.publicationsID] || 0) + 1);
    const top = Object.entries(pubCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    grid.innerHTML = `
        <div class="card"><div class="card-icon"></div><div class="card-title">Всего подписок</div><div class="card-price">${total}</div><div class="card-meta">активных: ${active}</div></div>
        <div class="card"><div class="card-icon"></div><div class="card-title">Выручка</div><div class="card-price">${revenue.toLocaleString()} руб</div><div class="card-meta">за всё время</div></div>
        <div class="card"><div class="card-icon"></div><div class="card-title">Популярные издания</div>
            <div>${top.length ? top.map(([id, cnt]) => `<div>Издание #${id}: ${cnt}</div>`).join('') : 'Нет данных'}</div>
        </div>
    `;
}