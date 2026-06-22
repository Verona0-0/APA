## Запуск проекта

### 1. MinIO (хранилище обложек)

Запусти приложение Docker и из корня репозитория:

```bash
docker compose up -d
```

- S3 API: `http://localhost:9000` (сюда ходит бэкенд)
- Веб-консоль: `http://localhost:9001` (логин/пароль: `minioadmin` / `minioadmin`)

### 2. API (бэкенд)

```bash
cd api/MyApi
dotnet run
```

- API поднимется на **`http://localhost:5000`**
- Swagger UI: **`http://localhost:5000/swagger`**
- При первом сборочном запуске драйверы БД (`*Driver*.dll`) автоматически копируются в выходную папку (MSBuild-таргет `CopyDriverDLLs`), а доменная БД `app.db` создаётся со всеми таблицами.

### 3. Фронтенд (SPA)

Фронтенд — это статические файлы, ему не нужна сборка. Откройте папку `web/` любым статическим сервером, например через Live Server.
Или
```bash
cd web
npx serve .
```

## Пользователи по умолчанию

Создаются автоматически при старте API ([`Program.cs`](api/MyApi/Program.cs)). Пароль у всех — `pass123`:

| Логин | Пароль | Роль | Возможности |
|-----------|----------|------------|-------------|
| `admin1` | `pass123` | **Admin** | полный доступ |
| `operator1` | `pass123` | **Operator** | работа с подписками, изданиями, обложками |
| `client1` | `pass123` | **Client** | базовый доступ |

Через форму регистрации новым пользователям выдаётся роль **Client**.

---

## Конфигурация

### Настройки хранилища обложек — [`api/MyApi/appsettings.json`](api/MyApi/appsettings.json)

```json
"Minio": {
  "Endpoint": "localhost:9000",
  "AccessKey": "minioadmin",
  "SecretKey": "minioadmin",
  "Bucket":    "covers",
  "UseSSL":    false
}
```

---

## Как всё устроено (подробно)

### 1. Авторизация и роли

Аутентификация построена на **ASP.NET Core Identity + OpenIddict** (см. [`Program.cs`](api/MyApi/Program.cs) и [`Controlers/TokenController.cs`](api/MyApi/Controlers/TokenController.cs)).

**Поток входа (Resource Owner Password Flow):**

1. Фронтенд отправляет `POST /connect/token` с полями формы
   `grant_type=password`, `username`, `password`, `scope=api1`, `client_id=spa_client`
   (см. `window.login` в [`web/Config.js`](web/Config.js)).
2. [`TokenController`](api/MyApi/Controlers/TokenController.cs) проверяет логин/пароль через
   `UserManager`, собирает claims (включая роли) и возвращает **access token** (JWT, подписанный
   dev-сертификатом OpenIddict).
3. Фронтенд сохраняет токен в `localStorage` (ключ `token`) и при каждом запросе шлёт его в
   заголовке `Authorization: Bearer <token>`. Профиль подтягивается через `GET /api/Users/profile`.

> Почему `localStorage`, а не cookie: JWT с ролями весит ~2 КБ и не помещался в cookie
> (он молча обрезался, и профиль падал с 401). Объект `window.cookies` в `Config.js` —
> это обёртка с прежним API `get/set/delete`, но поверх `localStorage`.

**Роли и политики авторизации:**
- Роли: `Admin`, `Operator`, `Client`.
- Политики: `AdminOnly` (только Admin), `OperatorOrAdmin` (Operator или Admin).
- Большинство контроллеров помечены `[Authorize]` — нужен валидный токен. Операции изменения
  обложек требуют политики `OperatorOrAdmin`.

**Зарегистрированные OAuth-клиенты** (создаются при старте):
- `spa_client` — публичный клиент для фронтенда;
- `swagger_client` (secret `swagger_secret`) — для авторизации прямо в Swagger UI.

### 2. Слой доступа к данным и подключаемые драйверы БД

Это самая нетривиальная часть бэкенда. Доменные данные (издания, клиенты, подписки и т.д.)
**не** используют EF Core — вместо этого реализован собственный слой репозиториев с подменяемым
драйвером СУБД.

**Как драйвер загружается:**

1. [`MyAppConfig`](api/MyApi/Singletons/MyAppConfig.cs) читает `config/config.json` и определяет
   активный `DBType`.
2. [`DAO`](api/MyApi/Singletons/DAO.cs) (singleton с `Lazy<IDatabase>`) находит описание драйвера,
   через `Assembly.LoadFrom` подгружает его DLL (например `MyApp.Driver.SQLite.dll`), рефлексией
   находит класс `Database : IDatabase` и создаёт его экземпляр, передав строку подключения.
3. Дальше весь код обращается к данным единообразно: `DAO.Instance.Publications.Get()`,
   `DAO.Instance.Subscriptions.Post(item)` и т.п. — независимо от того, SQLite это или MariaDB.

**Внутри драйвера** (на примере [`Drivers/SQLite`](api/Drivers/SQLite/)):
- [`Database.cs`](api/Drivers/SQLite/Database.cs) при создании выполняет DDL
  ([`DDL.cs`](api/Drivers/SQLite/DDL.cs) — набор `CREATE TABLE IF NOT EXISTS`) и отдаёт по
  свойству на каждую сущность (`Publications => new DBPublications()` и т.д.).
- [`DAO.cs`](api/Drivers/SQLite/DAO.cs) — низкоуровневый помощник: открывает соединение,
  выполняет параметризованные запросы (`ExecuteReader`, `ReadSingle`, `ExecuteNonQuery`),
  сериализует доступ через `Mutex` (одно соединение на приложение).
- `DB/DB*.cs` — конкретные репозитории: маппинг строк ридера в модели и CRUD-SQL
  (см. [`DB/DBPublications.cs`](api/Drivers/SQLite/DB/DBPublications.cs)). Например, удаление
  издания каскадно чистит все ссылающиеся таблицы вручную, поскольку в SQLite включены
  внешние ключи.

Такая схема позволяет добавить новую СУБД, просто реализовав интерфейсы из `Common` в новой
DLL и прописав её в `config.json`.

### 3. Доменная модель и таблицы

Модели лежат в [`api/Common/DB/`](api/Common/DB/). Часть из них содержит **валидацию прямо в
сеттерах свойств** — например [`Publications.cs`](api/Common/DB/Publications.cs) проверяет, что
название не длиннее 100 символов и соответствует регулярке (русские буквы, с заглавной). При
нарушении бросается `ArgumentException` ещё на этапе десериализации JSON, а специальный middleware
в `Program.cs` превращает его в аккуратный `400 Bad Request { "error": "..." }` (фронтенд затем
переводит такие сообщения в понятный русский текст — функция `translateKnownError` в `Config.js`).

Основные таблицы (см. [`DDL.cs`](api/Drivers/SQLite/DDL.cs)):

| Таблица | Назначение |
|---------|------------|
| `Publications` | издания (название, `CoverPath` — имя файла обложки в MinIO) |
| `Client` | клиенты (ФИО, телефон) |
| `Subscriptions` | подписки: клиент × издание, период, цена, адрес доставки |
| `SubscriptionPrices` | история цен на издания (с датами действия) |
| `Services` / `ServicePrices` | доп. услуги и история цен на них |
| `SubscriptionServices` | связка «подписка ↔ услуга» (M:N) |
| `Catalogs` / `PublicationsCatalogs` | каталоги изданий и их состав (M:N) |
| `DeliveryAddress` / `TypeAddress` | иерархические адреса доставки (дерево по `ParentID`) и их типы |
| `Description` / `TypeDescription` | произвольные описания изданий и типы описаний |

Цены устроены **как история с периодами действия**: «текущая» цена — это запись без `DateEnd`
с самой свежей датой. Эта логика выбора активной цены повторяется во фронтенде (прайс-листы,
карточки изданий).

### 4. Обложки изданий (загрузка и хранение картинок)

Картинки обложек хранятся **не в БД и не на диске приложения, а в объектном хранилище MinIO**
(S3-совместимое). В таблице `Publications` хранится только `CoverPath` — имя объекта в бакете.

**Серверная часть:**

- Абстракция [`IImageStorage`](api/MyApi/Storage/IImageStorage.cs) и реализация
  [`MinioImageStorage`](api/MyApi/Storage/MinioImageStorage.cs). Всё работает **потоково**
  (`Stream → Stream`): файл не загружается в память целиком.
- [`CoversController`](api/MyApi/Controlers/ControlerCovers.cs):
  - **`POST /api/Covers/{id}`** — загрузить обложку (только если её ещё нет; иначе `409`).
    Файл проверяется на расширение (`.jpg/.jpeg/.png/.webp/.gif`) и размер (≤ 10 МБ), ему
    присваивается имя `{GUID}{ext}`, поток запроса льётся прямо в MinIO, а имя объекта пишется
    в `CoverPath`.
  - **`PUT /api/Covers/{id}`** — заменить обложку (старый объект удаляется, новый получает новый GUID).
  - **`GET /api/Covers/{id}`** — отдать картинку. Поддерживает **HTTP-кэширование (ETag,
    `304 Not Modified`)** и **Range-запросы (`206 Partial Content`)**: MinIO отдаёт нужный кусок
    объекта прямо в тело ответа сквозным стримом.
  - **`DELETE /api/Covers/{id}`** — удалить обложку из MinIO и обнулить `CoverPath`.
- При старте приложения ([`Program.cs`](api/MyApi/Program.cs), `MigrateLocalCoversAsync`) выполняется
  разовая идемпотентная миграция: если у издания в `CoverPath` указан старый локальный путь,
  файл из папки `wwwroot/covers` переносится в MinIO, а `CoverPath` нормализуется к имени объекта.

**Клиентская часть** ([`web/Publications.js`](web/Publications.js)):

- Загрузка файла: скрытый `<input type="file">`, выбранный файл уходит как `FormData` на
  `POST`/`PUT /api/Covers/{id}` (метод выбирается по тому, есть ли уже обложка).
- Показ: `getCoverUrl(pubId)` запрашивает картинку с токеном, превращает ответ в `Blob` →
  `URL.createObjectURL` и подставляет в `<img>`. Результаты кэшируются в `Map` (`coverCache`),
  при удалении/замене URL отзывается через `revokeObjectURL`.

### 5. Формирование отчётов и печатных документов

Важная деталь: **на бэкенде нет эндпоинта отчётов**. Все отчёты и печатные формы собираются
**на клиенте** из обычных данных API. Логика — в [`web/Documents.js`](web/Documents.js) и
[`web/Report.js`](web/Report.js).

**Сводка на экране «Отчёты»** ([`Report.js`](web/Report.js)): `loadReports()` запрашивает
`/api/Subscriptions` и `/api/Publications` и считает агрегаты прямо в браузере — всего подписок,
сколько активных (нет `dateEnd` или он в будущем), суммарная выручка, топ-5 популярных изданий —
и рисует их карточками.

**Печатные документы** ([`Documents.js`](web/Documents.js)) — общий механизм:
1. Нужные данные тянутся параллельно через `Promise.all` (подписка, клиент, издание, услуги,
   цены, адреса).
2. Из них собирается строка HTML с табличной вёрсткой.
3. `printDocument(title, html)` открывает **новое окно** (`window.open`), пишет туда HTML вместе
   с отдельным «печатным» CSS (`PRINT_CSS`) и вызывает `window.print()`. Из диалога печати
   браузера документ можно сохранить как **PDF**.

Доступные печатные формы:
- **Квитанция подписки** (`printSubscriptionReceipt`) — реквизиты организации, данные подписчика,
  полный путь адреса доставки (собирается по дереву `DeliveryAddress` функцией `buildAddressPath`),
  таблица «издание + услуги + ИТОГО». Цена услуги берётся как активная (без `dateEnd`, самая свежая).
- **Прайс-лист услуг** (`printServicesPriceList`) и **прайс-лист изданий** (`printPublicationsPriceList`) —
  текущая цена каждой позиции и дата, с которой она действует.
- **Отчёт по подпискам за период** (`printSubscriptionsReport`) — фильтр по дате оформления
  (поля «с»/«по»), сводка (всего/активных/выручка) и таблица по всем подпискам со статусом.

### 6. Фронтенд: как работает SPA

- **Без сборки.** `index.html` подключает все `*.js` обычными `<script>`, функции и состояние
  складываются в `window.*`. Это не модули — порядок подключения в `index.html` важен
  (`Config.js` → разделы → `UI.js` → `Init.js`).
- **Навигация** ([`UI.js`](web/UI.js)): объект `sectionConfig` сопоставляет каждому пункту меню
  функцию загрузки, флаг «уже загружено» и контейнер. `showSection()` показывает раздел и
  **лениво** грузит данные при первом открытии; кнопки «Обновить» вызывают `refreshSection()`.
- **Обёртка `api()`** ([`Config.js`](web/Config.js)) добавляет заголовки и токен, разбирает
  ошибки и переводит технические сообщения сервера в понятные русские (`humanizeError`).
- **UX-детали**: собственные модальные диалоги вместо `alert/confirm/prompt`, спиннеры на
  кнопках (`withButtonLoading`), всплывающие уведомления (`notify`), экранирование пользовательского
  ввода (`escapeHtml`).

---

## Справочник по API

Базовый адрес: `http://localhost:5000`. Все доменные эндпоинты требуют заголовок
`Authorization: Bearer <token>`. Полная интерактивная документация — в **Swagger** (`/swagger`).

**Аутентификация / пользователи**

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/connect/token` | получить токен (grant `password`) |
| `POST` | `/api/Users/register` | регистрация (роль Client) |
| `GET` | `/api/Users/profile` | профиль текущего пользователя |

**Обложки**

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/Covers/{id}` | получить картинку (ETag, Range) |
| `POST` | `/api/Covers/{id}` | загрузить обложку (Operator/Admin) |
| `PUT` | `/api/Covers/{id}` | заменить обложку (Operator/Admin) |
| `DELETE` | `/api/Covers/{id}` | удалить обложку (Operator/Admin) |

**Доменные сущности** — единообразный CRUD (`GET` список, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`):

`Publications`, `Client`, `Subscriptions`, `SubscriptionPrices`, `Services`, `ServicePrices`,
`SubscriptionServices` (`/api/SubscriptionsServices`), `Catalogs`, `PublicationCatalogs`,
`DeliveryAddress`, `TypeAdress`, `Description`, `TypeDescription`.

Точные маршруты см. в [`api/MyApi/Controlers/`](api/MyApi/Controlers/) и в Swagger.

---

## Особенности режима разработки

- **`auth.db` пересоздаётся при каждом старте API** — учётные записи, созданные через регистрацию,
  не переживают перезапуск; остаются только сидируемые `admin1/operator1/client1`. Доменная БД
  (`app.db`) при этом сохраняется.
- Используются **dev-сертификаты** OpenIddict и отключено требование HTTPS на token-эндпоинте —
  это режим разработки, **не для продакшена**.
- **CORS открыт для всех источников** (`AllowAnyOrigin`) — удобно локально, но требует ужесточения
  перед публикацией.
- Пароли в Identity намеренно ослаблены (минимум 4 символа, без спецтребований) — только для удобства разработки.
- Файлы БД (`*.db`) и папки `bin/`, `obj/` исключены из git (см. [`.gitignore`](.gitignore)).
```
