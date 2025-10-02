# Демонстрация плагинной системы

## Что реализовано

✅ **Плагинная система на базе gRPC** - полнофункциональная система для подключения собственных обработчиков логов

✅ **Пример плагина** - Error Aggregator для автоматической агрегации ошибок по типу и повторяемости

✅ **Простые тесты** - несколько способов тестирования системы

## Быстрая демонстрация (без Docker)

Самый простой способ увидеть работу плагина:

```bash
cd sample-plugins
python simple_test.py
```

**Результат:**
```
============================================================
🧪 Simple Plugin Test (без Docker)
============================================================

🚀 Starting plugin server...
✅ Plugin started on port 50051

📝 Creating test logs...
✅ Created 5 test logs (3 errors, 1 info)

⚙️  Calling plugin...

============================================================
📊 RESULTS:
============================================================

Total errors: 4, Unique error types: 2, Most common: 'Connection timeout' (3 times)

Error Types (sorted by frequency):
------------------------------------------------------------

1. Connection timeout
   Count: 3, First: 2024-01-01T10:00:00Z, Last: 2024-01-01T10:20:00Z
   Request IDs: req-001, req-002, req-005

2. Resource not found
   Count: 1, First: 2024-01-01T10:10:00Z, Last: 2024-01-01T10:10:00Z
   Request IDs: req-003

============================================================
✅ All assertions passed!
============================================================
```

Этот тест:
- ✅ Запускает плагин-сервер
- ✅ Создаёт тестовые логи с ошибками
- ✅ Отправляет их в плагин через gRPC
- ✅ Получает агрегированные результаты
- ✅ Проверяет корректность работы

## Полная демонстрация (с Docker)

### Шаг 1: Запустите приложение

```bash
docker-compose up -d
```

### Шаг 2: Загрузите логи

Откройте http://localhost:3000 и загрузите файл с логами (например, из `sample-logs/`)

### Шаг 3: Запустите плагин и тест

```bash
cd sample-plugins
python test_plugin.py
```

**Что произойдёт:**
1. Скрипт запустит Error Aggregator Plugin на порту 50051
2. Зарегистрирует его в backend через API
3. Отправит все логи уровня ERROR на обработку
4. Покажет агрегированные результаты

**Пример вывода:**
```
============================================================
🧪 Testing gRPC Plugin System for Terraform LogViewer
============================================================
✅ Backend is running
🚀 Starting Error Aggregator Plugin on port 50051...
✅ Plugin started successfully

📝 Registering plugin with backend...
✅ Plugin registered: {'message': "Plugin 'error-aggregator' registered at localhost:50051"}

📋 Listing registered plugins...
✅ Registered plugins: {'plugins': {'error-aggregator': 'localhost:50051'}}

⚙️  Processing logs with error-aggregator plugin...

============================================================
📊 RESULTS:
============================================================

Total errors: 42, Unique error types: 5, Most common: 'Failed to read resource' (15 times)

Error Types (sorted by frequency):
------------------------------------------------------------

1. Failed to read resource
   Count: 15, First: 2024-01-15T10:23:45Z, Last: 2024-01-15T10:45:23Z
   Sample Request IDs: req-abc123, req-def456, req-ghi789

2. Connection timeout
   Count: 12, First: 2024-01-15T10:25:00Z, Last: 2024-01-15T10:50:00Z
   Sample Request IDs: req-jkl012, req-mno345

...

============================================================
✅ Test completed!

💡 You can run this script anytime to re-process logs.
💡 The plugin will continue running until you press Ctrl+C.
============================================================
```

## API использование

### 1. Запустите плагин вручную

```bash
cd sample-plugins
python error_aggregator_plugin.py 50051 &
```

### 2. Зарегистрируйте в системе

```bash
curl -X POST "http://localhost:8000/api/plugins/register?name=error-aggregator&address=localhost:50051"
```

**Ответ:**
```json
{
  "message": "Plugin 'error-aggregator' registered at localhost:50051"
}
```

### 3. Посмотрите список плагинов

```bash
curl http://localhost:8000/api/plugins/list
```

**Ответ:**
```json
{
  "plugins": {
    "error-aggregator": "localhost:50051"
  }
}
```

### 4. Обработайте логи

```bash
curl -X POST "http://localhost:8000/api/plugins/process?plugin_name=error-aggregator&level=error"
```

**Ответ:**
```json
{
  "results": [
    {
      "key": "Connection timeout",
      "value": "Count: 10, First: 2024-01-01T10:00:00Z, Last: 2024-01-01T10:15:00Z",
      "count": 10,
      "log_ids": ["req-001", "req-003", "req-007"]
    },
    {
      "key": "Resource not found",
      "value": "Count: 3, First: 2024-01-01T10:05:00Z, Last: 2024-01-01T10:10:00Z",
      "count": 3,
      "log_ids": ["req-002", "req-005"]
    }
  ],
  "summary": "Total errors: 13, Unique error types: 2, Most common: 'Connection timeout' (10 times)"
}
```

## Создание своего плагина

### Минимальный пример

```python
from concurrent import futures
import grpc
from app.plugins import log_plugin_pb2, log_plugin_pb2_grpc

class MyPlugin(log_plugin_pb2_grpc.LogPluginServicer):
    def ProcessLogs(self, request, context):
        # Ваша логика
        results = []
        
        # Пример: подсчёт логов по уровню
        levels = {}
        for log in request.logs:
            levels[log.level] = levels.get(log.level, 0) + 1
        
        for level, count in levels.items():
            results.append(log_plugin_pb2.ProcessedResult(
                key=level,
                value=f"Count: {count}",
                count=count,
                log_ids=[]
            ))
        
        return log_plugin_pb2.LogResponse(
            results=results,
            summary=f"Processed {len(request.logs)} logs"
        )

def serve(port=50052):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    log_plugin_pb2_grpc.add_LogPluginServicer_to_server(MyPlugin(), server)
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    print(f"Plugin running on port {port}")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

**Запуск:**
```bash
python my_plugin.py
```

**Регистрация:**
```bash
curl -X POST "http://localhost:8000/api/plugins/register?name=my-plugin&address=localhost:50052"
```

**Использование:**
```bash
curl -X POST "http://localhost:8000/api/plugins/process?plugin_name=my-plugin"
```

## Архитектура

```
┌─────────────────┐
│  Web Frontend   │
│  (React)        │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Backend API    │
│  (FastAPI)      │
└────────┬────────┘
         │ gRPC
         ▼
┌─────────────────┐
│  Plugin Manager │
└────────┬────────┘
         │ gRPC
         ▼
┌─────────────────────────────┐
│  External Plugins (gRPC)    │
│  - Error Aggregator         │
│  - Performance Analyzer     │
│  - Custom Plugin...         │
└─────────────────────────────┘
```

## Преимущества gRPC

✅ **Производительность** - бинарный протокол, быстрее JSON
✅ **Типизация** - строгий контракт через Protocol Buffers
✅ **Языковая независимость** - плагины на любом языке (Python, Go, Java, C++, etc.)
✅ **Изоляция** - плагины работают в отдельных процессах
✅ **Простота** - понятный API для создания плагинов

## Идеи для плагинов

- **Performance Analyzer** - анализ времени выполнения операций
- **Dependency Tracker** - построение графа зависимостей ресурсов
- **Security Auditor** - поиск проблем безопасности
- **Cost Estimator** - оценка стоимости операций
- **Pattern Detector** - ML-анализ и поиск аномалий
- **Notification Plugin** - отправка уведомлений при определённых событиях

## Заключение

Плагинная система позволяет:
- ✅ Расширять функционал без изменения основного кода
- ✅ Создавать специализированные обработчики
- ✅ Использовать любой язык программирования
- ✅ Легко тестировать и демонстрировать

**Система готова к использованию и легко расширяется!**
