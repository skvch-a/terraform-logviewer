# Terraform Log Viewer

Веб-сервис для просмотра и анализа логов Terraform в формате JSON.

## Возможности

- 📤 Загрузка файлов логов Terraform в формате JSON
- 🔍 Парсинг и структурирование логов
- 💾 Сохранение логов в PostgreSQL базе данных
- 📊 Визуализация логов с фильтрацией по уровням (error, warn, info, debug, trace)
- 📈 **Диаграмма Ганта** - визуализация хронологии запросов и ответов по `tf_req_id`
- 🎨 Современный веб-интерфейс на React
- 🐳 Полностью контейнеризованное приложение с Docker

## Технологический стек

### Frontend
- React 18
- Axios для API запросов
- Nginx для production

### Backend
- Python 3.12
- FastAPI - современный веб-фреймворк
- SQLAlchemy - ORM для работы с БД
- PostgreSQL - база данных

### Инфраструктура
- Docker & Docker Compose
- PostgreSQL 15

## Установка и запуск

### Требования
- Docker
- Docker Compose

### Запуск приложения

1. Клонируйте репозиторий:
```bash
git clone https://github.com/skvch-a/terraform-logviewer.git
cd terraform-logviewer
```

2. Запустите приложение с помощью Docker Compose:
```bash
docker-compose up -d
```

3. Откройте приложение в браузере:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Остановка приложения

```bash
docker-compose down
```

Для полной очистки (включая данные БД):
```bash
docker-compose down -v
```

## Использование

### Загрузка логов

1. Откройте веб-интерфейс по адресу http://localhost:3000
2. Нажмите "Choose File" и выберите JSON файл с логами Terraform
3. Нажмите "Upload" для загрузки
4. Логи будут автоматически распарсены и отображены

### Фильтрация логов

Используйте выпадающий список "Filter by level" для фильтрации логов по уровням:
- All - все логи
- Error - только ошибки
- Warning - предупреждения
- Info - информационные сообщения
- Debug - отладочные сообщения
- Trace - трассировочные сообщения

### Диаграмма Ганта (Gantt Chart)

Новая функция визуализации хронологии запросов:

1. Загрузите логи Terraform через интерфейс
2. Нажмите кнопку "Gantt Chart" в верхнем меню
3. Просматривайте временную шкалу всех запросов:
   - Запросы сгруппированы по типу RPC (GetProviderSchema, ConfigureProvider, PlanResourceChange и т.д.)
   - Цветовое кодирование для разных типов операций
   - Наведите курсор на любой запрос для просмотра деталей:
     - Request ID
     - Тип RPC
     - Тип ресурса
     - Длительность выполнения
     - Количество логов
     - Временные метки начала и окончания

Диаграмма Ганта позволяет:
- Визуализировать последовательность и параллельность выполнения запросов
- Быстро определить длительные операции
- Понять зависимости между запросами
- Анализировать производительность операций Terraform

### Формат JSON логов

Приложение поддерживает два формата JSON логов Terraform:

1. JSON массив:
```json
[
  {
    "@level": "info",
    "@message": "Terraform init",
    "@timestamp": "2024-01-01T12:00:00Z"
  }
]
```

2. JSONL (JSON Lines) - построчный JSON:
```json
{"@level": "info", "@message": "Terraform init", "@timestamp": "2024-01-01T12:00:00Z"}
{"@level": "error", "@message": "Failed to initialize", "@timestamp": "2024-01-01T12:00:01Z"}
```

## API Endpoints

### POST /api/upload
Загрузка и парсинг файла логов

**Request:**
- Content-Type: multipart/form-data
- Body: file (JSON file)

**Response:**
```json
{
  "message": "File uploaded successfully",
  "entries_count": 42,
  "filename": "terraform.log"
}
```

### GET /api/logs
Получение логов из базы данных

**Query Parameters:**
- `skip` (optional): количество записей для пропуска (default: 0)
- `limit` (optional): максимальное количество записей (default: 100, max: 1000)
- `level` (optional): фильтр по уровню лога (error, warn, info, debug, trace)
- `tf_req_id` (optional): фильтр по идентификатору запроса
- `tf_rpc` (optional): фильтр по типу RPC
- `tf_resource_type` (optional): фильтр по типу ресурса

**Response:**
```json
[
  {
    "id": 1,
    "filename": "terraform.log",
    "uploaded_at": "2024-01-01T12:00:00",
    "log_level": "info",
    "timestamp": "2024-01-01T12:00:00Z",
    "message": "Terraform init",
    "raw_data": {...}
  }
]
```

### GET /api/gantt
Получение данных для диаграммы Ганта

**Response:**
```json
[
  {
    "tf_req_id": "52f3e8d8-5644-f202-4471-f120ff80312e",
    "tf_rpc": "GetProviderSchema",
    "tf_resource_type": null,
    "start_timestamp": "2025-09-09T15:31:32.842105+03:00",
    "end_timestamp": "2025-09-09T15:31:32.895432+03:00",
    "log_count": 15
  }
]
```

**Response:**
```json
[
  {
    "id": 1,
    "filename": "terraform.log",
    "uploaded_at": "2024-01-01T12:00:00",
    "log_level": "info",
    "timestamp": "2024-01-01T12:00:00Z",
    "message": "Terraform init",
    "raw_data": {...}
  }
]
```

## Архитектура

```
terraform-logviewer/
├── backend/                 # Python FastAPI приложение
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── models/         # SQLAlchemy модели
│   │   ├── schemas/        # Pydantic схемы
│   │   ├── services/       # Бизнес-логика
│   │   ├── database.py     # Настройка БД
│   │   └── main.py         # Точка входа
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # React приложение
│   ├── public/
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── services/       # API сервисы
│   │   ├── App.js
│   │   └── index.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── docker-compose.yml      # Оркестрация контейнеров
```

## Разработка

### Локальная разработка Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Локальная разработка Frontend

```bash
cd frontend
npm install
npm start
```

## Лицензия

MIT