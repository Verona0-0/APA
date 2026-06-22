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
    // кнопки «Обновить» — тянем данные раздела заново
    document.getElementById('load-reports-btn')?.addEventListener('click', () => refreshSection('subscriptions'));
    document.getElementById('load-catalogs-btn')?.addEventListener('click', () => refreshSection('catalogs'));
    document.getElementById('load-publications-btn')?.addEventListener('click', () => refreshSection('publications'));
    document.getElementById('load-clients-btn')?.addEventListener('click', () => refreshSection('clients'));
    document.getElementById('load-prices-btn')?.addEventListener('click', () => refreshSection('prices'));
    document.getElementById('load-addresses-btn')?.addEventListener('click', () => refreshSection('addresses'));
    document.getElementById('load-services-btn')?.addEventListener('click', () => refreshSection('services'));
    document.getElementById('load-all-subs-btn')?.addEventListener('click', () => refreshSection('all-subscriptions'));

    // диалоги подтверждения/ввода и закрытие окон по Esc/фону
    setupDialogs();

    // кнопки добавления
    document.getElementById('add-catalog-btn')?.addEventListener('click', createNewCatalog);
    document.getElementById('add-publication-btn')?.addEventListener('click', createNewPublication);
    document.getElementById('add-price-btn')?.addEventListener('click', showAddPriceModal);
    document.getElementById('add-client-btn')?.addEventListener('click', showAddClientModal);

    // кнопки сохранения в окнах
    document.getElementById('save-new-catalog')?.addEventListener('click', e => withButtonLoading(e.currentTarget, () => saveNewCatalog()));
    document.getElementById('save-new-publication')?.addEventListener('click', e => withButtonLoading(e.currentTarget, () => saveNewPublication()));
    document.getElementById('save-new-price')?.addEventListener('click', e => withButtonLoading(e.currentTarget, () => saveNewPrice()));

    // навигация по разделам
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => showSection(item.dataset.section));
    });

    // переключение вкладок: вход / регистрация
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .auth-form').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('login-form').classList.toggle('active', btn.dataset.tab === 'login');
            document.getElementById('register-form').classList.toggle('active', btn.dataset.tab === 'register');
        });
    });

    // форма входа
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

    // форма регистрации
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

    // выход
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        cookies.delete('token');
        currentUser = null;
        resetDataLoaded();
        document.getElementById('main-container').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('hidden');
        notify('Выход выполнен');
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
