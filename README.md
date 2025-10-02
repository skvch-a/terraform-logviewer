# Terraform LogViewer

Веб-сервис для просмотра и анализа логов Terraform в формате JSON.

[Архитектура приложения](ARCHITECTURE.md)
## Особенности

-  Загрузка файлов логов Terraform в формате **JSON**
-  Сохранение логов в **PostgreSQL** базе данных
-  **Ленивая загрузка** - группы логов загружаются только по требованию для повышения производительности
-  **Возможность восстановления отсутствующих меток timestamp и level**
-  Cовременный веб-интерфейс на **React**
-  Полностью контейнеризованное приложение с **Docker**

## Возможности
1)  Парсинг и структурирование логов, возможность поиска и фильтрации по критериям, группировки по request_id
    
![](https://github.com/skvch-a/terraform-logviewer/blob/main/screenshots/database_logs_page.png)

2) Анализ секций (plan, apply, init)
     
![](https://github.com/skvch-a/terraform-logviewer/blob/main/screenshots/section_parser.png)

3) **Диаграмма Ганта** - визуализация хронологии запросов и ответов по `tf_req_id`

![](https://github.com/skvch-a/terraform-logviewer/blob/main/screenshots/gantt_chart.png)

4) **Круговая диаграмма по уровням** - визуализация отношения количества логов с разным level

![](https://github.com/skvch-a/terraform-logviewer/blob/main/screenshots/log_statistics.png)

## Технологический стек

### Frontend
- React 18
- Axios для API запросов
- Nginx для production

### Backend
- Python 3.12
- FastAPI
- SQLAlchemy
- PostgreSQL

### Инфраструктура
- Docker & Docker Compose
- PostgreSQL 16

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

2. Создайте файл .env в папке backend (поместите туда свой API ключ Sentry, если хотите воспользоваться выгрузкой ошибок в Sentry)

3. Запустите приложение с помощью Docker Compose:
```bash
docker-compose up -d
```

4. Откройте приложение в браузере:
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
- All 
- Error 
- Warning 
- Info 
- Debug 
- Trace 

**Можно отмечать логи как прочитаные, при нажатии на зелёную кнопку**

### Диаграмма Ганта (Gantt Chart)

Функция визуализации хронологии запросов:

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

Приложение принимает на вход файлы с расширением .log и .json
  
### Использовагие с Sentry
Поместите свой API ключ Sentry в файл `.env`, по примеру .env.example:
```bash
SENTRY_DSN=YOUR_SENTRY_DSN_KEY
```
Логи будут подгружены на сервис при нажатии кнопки "Send Errors to Sentry".
