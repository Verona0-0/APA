// ========== ИНИЦИАЛИЗАЦИЯ ==========

async function init() {
    const token = cookies.get('token');
    if (token) {
        try {
            currentUser = await api('/api/Users/profile');
            document.getElementById('main-container').classList.remove('hidden');
            document.getElementById('auth-modal').classList.add('hidden');
            document.getElementById('user-name').textContent = currentUser.username;
            showSection('subscriptions');
        } catch (e) { cookies.delete('token'); }
    }
    setupEventListeners();
}

function setupEventListeners() {
    // Кнопки загрузки данных
    document.getElementById('load-reports-btn')?.addEventListener('click', () => { dataLoaded.reports = false; loadReports(); });
    document.getElementById('load-catalogs-btn')?.addEventListener('click', () => { dataLoaded.catalogs = false; loadCatalogs(); });
    document.getElementById('load-publications-btn')?.addEventListener('click', () => { dataLoaded.publications = false; loadPublications(); });
    document.getElementById('load-clients-btn')?.addEventListener('click', () => { dataLoaded.clients = false; loadClients(); });
    document.getElementById('load-prices-btn')?.addEventListener('click', () => { dataLoaded.prices = false; loadSubscriptionPrices(); });
    document.getElementById('load-addresses-btn')?.addEventListener('click', loadAddressSection);
    document.getElementById('load-services-btn')?.addEventListener('click', loadServicesSection);
    document.getElementById('load-all-subs-btn')?.addEventListener('click', loadAllSubscriptions);

    // Кнопки добавления
    document.getElementById('add-catalog-btn')?.addEventListener('click', createNewCatalog);
    document.getElementById('add-publication-btn')?.addEventListener('click', createNewPublication);
    document.getElementById('add-price-btn')?.addEventListener('click', showAddPriceModal);
    document.getElementById('add-client-btn')?.addEventListener('click', showAddClientModal);

    // Кнопки сохранения в модальных окнах
    document.getElementById('save-new-catalog')?.addEventListener('click', saveNewCatalog);
    document.getElementById('save-new-publication')?.addEventListener('click', saveNewPublication);
    document.getElementById('save-new-price')?.addEventListener('click', saveNewPrice);

    // Навигация по разделам
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => showSection(item.dataset.section));
    });

    // Переключение вкладок авторизации
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .auth-form').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('login-form').classList.toggle('active', btn.dataset.tab === 'login');
            document.getElementById('register-form').classList.toggle('active', btn.dataset.tab === 'register');
        });
    });

    // Форма входа
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.textContent = 'Вход...';
        try {
            await login(
                document.getElementById('login-username').value,
                document.getElementById('login-password').value
            );
            document.getElementById('main-container').classList.remove('hidden');
            document.getElementById('auth-modal').classList.add('hidden');
            document.getElementById('user-name').textContent = currentUser.username;
            notify('Вход выполнен');
            showSection('subscriptions');
        } catch (err) { notify('Ошибка: ' + err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Войти'; }
    });

    // Форма регистрации
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.textContent = 'Регистрация...';
        try {
            await register({
                username: document.getElementById('reg-username').value,
                email: document.getElementById('reg-email').value,
                fullName: document.getElementById('reg-fullname').value,
                password: document.getElementById('reg-password').value,
                role: 'client'
            });
            notify('Регистрация успешна! Войдите.', 'success');
            document.querySelector('[data-tab="login"]').click();
            document.getElementById('login-username').value = document.getElementById('reg-username').value;
            e.target.reset();
        } catch (err) { notify('Ошибка: ' + err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Зарегистрироваться'; }
    });

    // Выход
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        cookies.delete('token');
        currentUser = null;
        document.getElementById('main-container').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('hidden');
        notify('Выход выполнен');
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
