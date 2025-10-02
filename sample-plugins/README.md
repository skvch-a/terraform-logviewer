# Sample gRPC Plugins

Эта директория содержит примеры плагинов для системы обработки логов.

## Плагинная система на базе gRPC

Система плагинов позволяет участникам подключать собственные фильтры и обработчики для анализа логов Terraform.

### Архитектура

Плагины работают как отдельные gRPC-серверы, которые:
1. Получают логи от основного приложения
2. Обрабатывают их согласно своей логике
3. Возвращают результаты обработки

### Структура плагина

Каждый плагин должен:
- Реализовывать интерфейс `LogPlugin` из `log_plugin.proto`
- Предоставлять метод `ProcessLogs` для обработки логов
- Запускаться как отдельный gRPC-сервер

### Пример: Error Aggregator Plugin

`error_aggregator_plugin.py` - плагин для автоматической агрегации ошибок по типу и повторяемости.

**Функции:**
- Группирует ошибки по типу (извлекает из сообщения)
- Подсчитывает количество повторений каждой ошибки
- Показывает временные рамки (первое и последнее появление)
- Предоставляет список Request ID для каждого типа ошибки

## Быстрый старт

### 1. Запустите основное приложение

```bash
docker-compose up -d
```

### 2. Загрузите логи через веб-интерфейс

Откройте http://localhost:3000 и загрузите файл с логами.

### 3. Запустите тестовый скрипт

```bash
cd sample-plugins
python test_plugin.py
```

Скрипт автоматически:
- Запустит плагин на порту 50051
- Зарегистрирует его в backend
- Обработает ошибки из загруженных логов
- Покажет агрегированные результаты

### 4. Результат

Вы увидите отчёт вида:

```
📊 RESULTS:
============================================================

Total errors: 15, Unique error types: 3, Most common: 'Connection timeout' (10 times)

Error Types (sorted by frequency):
------------------------------------------------------------

1. Connection timeout
   Count: 10, First: 2024-01-01T10:00:00, Last: 2024-01-01T10:15:00
   Sample Request IDs: req-001, req-003, req-007

2. Resource not found
   Count: 3, First: 2024-01-01T10:05:00, Last: 2024-01-01T10:10:00
   Sample Request IDs: req-002, req-005

3. Permission denied
   Count: 2, First: 2024-01-01T10:08:00, Last: 2024-01-01T10:12:00
   Sample Request IDs: req-004
```

## Использование через API

### Регистрация плагина

```bash
curl -X POST "http://localhost:8000/api/plugins/register?name=error-aggregator&address=localhost:50051"
```

### Список плагинов

```bash
curl http://localhost:8000/api/plugins/list
```

### Обработка логов

```bash
curl -X POST "http://localhost:8000/api/plugins/process?plugin_name=error-aggregator&level=error"
```

## Создание собственного плагина

### 1. Скопируйте структуру

```python
from app.plugins import log_plugin_pb2, log_plugin_pb2_grpc

class MyPlugin(log_plugin_pb2_grpc.LogPluginServicer):
    def ProcessLogs(self, request, context):
        # Ваша логика обработки
        results = []
        for log in request.logs:
            # Обработайте каждый лог
            pass
        
        return log_plugin_pb2.LogResponse(
            results=results,
            summary="Ваше резюме"
        )

def serve(port=50052):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    log_plugin_pb2_grpc.add_LogPluginServicer_to_server(MyPlugin(), server)
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    server.wait_for_termination()
```

### 2. Запустите плагин

```bash
python my_plugin.py 50052
```

### 3. Зарегистрируйте в системе

```bash
curl -X POST "http://localhost:8000/api/plugins/register?name=my-plugin&address=localhost:50052"
```

### 4. Используйте

```bash
curl -X POST "http://localhost:8000/api/plugins/process?plugin_name=my-plugin"
```

## Идеи для плагинов

- **Performance Analyzer** - анализ времени выполнения операций
- **Dependency Tracker** - отслеживание зависимостей между ресурсами
- **Security Auditor** - поиск потенциальных проблем безопасности
- **Cost Estimator** - оценка стоимости операций
- **Pattern Detector** - поиск паттернов и аномалий

## Требования

- Python 3.12+
- grpcio
- grpcio-tools

Уже установлены в backend контейнере.
