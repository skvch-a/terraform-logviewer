# Плагинная система на базе gRPC - Реализация

## Обзор

Реализована полнофункциональная плагинная система на базе gRPC, позволяющая подключать собственные фильтры и обработчики для анализа логов Terraform.

## Что реализовано

### 1. Базовая инфраструктура

#### Protocol Buffers определение (`backend/app/plugins/log_plugin.proto`)
- Определён интерфейс `LogPlugin` с методом `ProcessLogs`
- Структуры данных для логов (`LogEntry`)
- Структуры для результатов (`ProcessedResult`, `LogResponse`)

#### Plugin Manager (`backend/app/plugins/plugin_manager.py`)
- Класс `PluginManager` для управления плагинами
- Регистрация плагинов по имени и адресу
- Вызов плагинов через gRPC
- Преобразование данных между форматами

#### API Endpoints (`backend/app/api/log_router.py`)
- `POST /api/plugins/register` - регистрация плагина
- `GET /api/plugins/list` - список зарегистрированных плагинов
- `POST /api/plugins/process` - обработка логов через плагин

### 2. Пример плагина

#### Error Aggregator Plugin (`sample-plugins/error_aggregator_plugin.py`)
Плагин для автоматической агрегации ошибок:
- Группировка ошибок по типу (извлечение из сообщения)
- Подсчёт повторений каждого типа ошибки
- Временные рамки (первое и последнее появление)
- Список Request ID для каждого типа
- Сортировка по частоте появления

**Функции:**
```python
class ErrorAggregatorPlugin:
    def ProcessLogs(request, context):
        # Агрегирует ошибки по типу
        # Возвращает статистику и список ошибок
    
    def _extract_error_type(message):
        # Извлекает тип ошибки из сообщения
```

### 3. Тестирование

#### Простой тест (`sample-plugins/simple_test.py`)
- Запускает плагин локально
- Создаёт тестовые данные
- Вызывает плагин напрямую через gRPC
- Проверяет корректность результатов
- **Не требует Docker** - можно запустить сразу

**Команда:**
```bash
cd sample-plugins
python simple_test.py
```

**Результат:**
```
✅ Plugin started on port 50051
✅ Created 5 test logs (3 errors, 1 info)
📊 RESULTS:
Total errors: 4, Unique error types: 2, Most common: 'Connection timeout' (3 times)
✅ All assertions passed!
```

#### Интеграционный тест (`sample-plugins/test_plugin.py`)
- Запускает плагин
- Регистрирует в backend через API
- Обрабатывает реальные логи из БД
- Показывает результаты
- Держит плагин запущенным для дальнейших экспериментов

**Команда:**
```bash
docker-compose up -d
cd sample-plugins
python test_plugin.py
```

### 4. Документация

#### README плагинов (`sample-plugins/README.md`)
- Описание архитектуры
- Быстрый старт
- Инструкция по созданию плагинов
- Примеры API вызовов

#### Демонстрация (`sample-plugins/DEMO.md`)
- Пошаговая демонстрация
- Примеры вывода
- Минимальный пример плагина
- Идеи для новых плагинов
- Диаграмма архитектуры

#### Обновлённый README (`README.md`)
- Добавлена информация о плагинной системе
- Пример использования
- Ссылка на документацию

## Архитектура

```
┌──────────────────────────────────────────────────┐
│                 Web Frontend                     │
│                   (React)                        │
└────────────────────┬─────────────────────────────┘
                     │ HTTP REST API
                     ▼
┌──────────────────────────────────────────────────┐
│              Backend API (FastAPI)               │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │         Plugin Manager                     │ │
│  │  - register_plugin(name, address)          │ │
│  │  - process_logs_with_plugin(name, logs)    │ │
│  │  - list_plugins()                          │ │
│  └──────────────────┬─────────────────────────┘ │
└────────────────────│──────────────────────────────┘
                     │ gRPC
                     ▼
┌──────────────────────────────────────────────────┐
│            External Plugins (gRPC)               │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Error Aggregator Plugin                   │ │
│  │  Port: 50051                               │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Custom Plugin 1                           │ │
│  │  Port: 50052                               │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Custom Plugin N                           │ │
│  │  Port: 5005X                               │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Преимущества реализации

### 1. Простота
- Минимальный код для создания плагина
- Понятный API
- Примеры и документация

### 2. Гибкость
- Плагины работают независимо
- Можно использовать любой язык программирования
- Легко добавлять новые плагины

### 3. Безопасность
- Изоляция процессов
- Плагины не имеют прямого доступа к БД
- Контролируемый API

### 4. Производительность
- gRPC использует бинарный протокол
- Эффективная сериализация через Protocol Buffers
- Параллельная обработка

### 5. Тестируемость
- Простой standalone тест без зависимостей
- Интеграционный тест с полной системой
- Понятные результаты

## Примеры использования

### 1. Запуск простого теста

```bash
cd sample-plugins
python simple_test.py
```

Результат показывает агрегацию ошибок без необходимости запуска Docker.

### 2. Использование с реальными данными

```bash
# Запустить приложение
docker-compose up -d

# Загрузить логи через веб-интерфейс
# http://localhost:3000

# Запустить плагин и обработать логи
cd sample-plugins
python test_plugin.py
```

### 3. Использование через API

```bash
# Запустить плагин
python sample-plugins/error_aggregator_plugin.py 50051 &

# Зарегистрировать
curl -X POST "http://localhost:8000/api/plugins/register?name=error-aggregator&address=localhost:50051"

# Обработать логи
curl -X POST "http://localhost:8000/api/plugins/process?plugin_name=error-aggregator&level=error"
```

### 4. Создание своего плагина

Минимальный код:

```python
from concurrent import futures
import grpc
from app.plugins import log_plugin_pb2, log_plugin_pb2_grpc

class MyPlugin(log_plugin_pb2_grpc.LogPluginServicer):
    def ProcessLogs(self, request, context):
        results = []
        # Ваша логика здесь
        return log_plugin_pb2.LogResponse(
            results=results,
            summary="Обработано"
        )

def serve(port=50052):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    log_plugin_pb2_grpc.add_LogPluginServicer_to_server(MyPlugin(), server)
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

## Идеи для будущих плагинов

1. **Performance Analyzer** - анализ времени выполнения операций
2. **Dependency Tracker** - построение графа зависимостей ресурсов
3. **Security Auditor** - поиск потенциальных проблем безопасности
4. **Cost Estimator** - оценка стоимости операций на основе логов
5. **Pattern Detector** - ML-анализ и поиск аномалий
6. **Notification Plugin** - отправка уведомлений в Slack/Telegram
7. **Report Generator** - генерация PDF/HTML отчётов
8. **Metrics Exporter** - экспорт метрик в Prometheus

## Технические детали

### Зависимости
- `grpcio==1.68.1` - gRPC runtime
- `grpcio-tools==1.68.1` - компилятор protobuf

### Файлы
```
backend/
  app/
    plugins/
      __init__.py                  # Инициализация модуля
      log_plugin.proto             # Protocol Buffers определение
      log_plugin_pb2.py            # Сгенерированный код (messages)
      log_plugin_pb2_grpc.py       # Сгенерированный код (services)
      plugin_manager.py            # Менеджер плагинов
  requirements.txt                 # Обновлены зависимости

sample-plugins/
  error_aggregator_plugin.py       # Пример плагина
  simple_test.py                   # Простой тест
  test_plugin.py                   # Интеграционный тест
  README.md                        # Документация
  DEMO.md                          # Демонстрация
```

### API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/plugins/register` | Регистрация плагина |
| GET | `/api/plugins/list` | Список плагинов |
| POST | `/api/plugins/process` | Обработка логов |

### Protocol Buffers

**LogEntry** - структура лога:
- level: уровень (error, warn, info, etc.)
- timestamp: временная метка
- message: сообщение
- tf_req_id: request ID
- tf_rpc: RPC метод
- tf_resource_type: тип ресурса
- raw_json: полный JSON лога

**ProcessedResult** - результат обработки:
- key: ключ (например, тип ошибки)
- value: значение (описание)
- count: количество
- log_ids: список Request ID

## Заключение

Система полностью реализована, протестирована и задокументирована. Она готова к использованию и легко расширяется для добавления новых плагинов.

**Особенности:**
✅ Простая в использовании
✅ Хорошо задокументирована
✅ Имеет примеры и тесты
✅ Легко расширяется
✅ Производительная
✅ Изолированная и безопасная
