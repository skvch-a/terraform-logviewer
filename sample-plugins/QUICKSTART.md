# Быстрый старт - Плагинная система

## 🎯 Цель

Протестировать и продемонстрировать работу плагинной системы на базе gRPC.

## ⚡ Самый быстрый способ (30 секунд)

```bash
cd sample-plugins
python simple_test.py
```

**Что произойдёт:**
1. Запустится gRPC-сервер плагина на порту 50051
2. Создадутся тестовые логи с ошибками
3. Логи отправятся в плагин для обработки
4. Плагин агрегирует ошибки по типу
5. Выведутся результаты с подсчётом и статистикой
6. Сервер остановится автоматически

**Результат:**
```
✅ Plugin started on port 50051
✅ Created 5 test logs (3 errors, 1 info)

📊 RESULTS:
Total errors: 4, Unique error types: 2, Most common: 'Connection timeout' (3 times)

Error Types (sorted by frequency):
1. Connection timeout - Count: 3
2. Resource not found - Count: 1

✅ All assertions passed!
```

## 📦 Полная демонстрация с Docker (5 минут)

### Шаг 1: Запустите приложение

```bash
docker-compose up -d
```

Подождите ~30 секунд пока запустятся все сервисы.

### Шаг 2: Загрузите логи

1. Откройте http://localhost:3000
2. Нажмите "Choose File"
3. Выберите файл из `sample-logs/` (например, `1. plan_test-k801vip_tflog.json`)
4. Нажмите "Upload"

### Шаг 3: Запустите плагин

```bash
cd sample-plugins
python test_plugin.py
```

**Что произойдёт:**
1. Запустится Error Aggregator Plugin
2. Плагин зарегистрируется в backend
3. Все ERROR-логи из БД отправятся на обработку
4. Выведется агрегированный отчёт по ошибкам
5. Плагин продолжит работать (нажмите Ctrl+C для остановки)

### Шаг 4: Повторная обработка

Пока плагин работает, вы можете:

```bash
# В другом терминале
curl -X POST "http://localhost:8000/api/plugins/process?plugin_name=error-aggregator&level=error"
```

## 🔧 API примеры

### Запустить плагин вручную

```bash
python sample-plugins/error_aggregator_plugin.py 50051 &
```

### Зарегистрировать плагин

```bash
curl -X POST "http://localhost:8000/api/plugins/register?name=error-aggregator&address=localhost:50051"
```

Ответ:
```json
{"message": "Plugin 'error-aggregator' registered at localhost:50051"}
```

### Список плагинов

```bash
curl http://localhost:8000/api/plugins/list
```

Ответ:
```json
{"plugins": {"error-aggregator": "localhost:50051"}}
```

### Обработать логи

```bash
curl -X POST "http://localhost:8000/api/plugins/process?plugin_name=error-aggregator"
```

## 🎓 Создать свой плагин (3 минуты)

### 1. Создайте файл `my_plugin.py`:

```python
import sys
import os
from concurrent import futures
import grpc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.plugins import log_plugin_pb2, log_plugin_pb2_grpc

class MyPlugin(log_plugin_pb2_grpc.LogPluginServicer):
    def ProcessLogs(self, request, context):
        # Подсчитаем логи по уровням
        levels = {}
        for log in request.logs:
            levels[log.level] = levels.get(log.level, 0) + 1
        
        results = [
            log_plugin_pb2.ProcessedResult(
                key=level,
                value=f"Count: {count}",
                count=count,
                log_ids=[]
            )
            for level, count in levels.items()
        ]
        
        return log_plugin_pb2.LogResponse(
            results=results,
            summary=f"Processed {len(request.logs)} logs"
        )

def serve(port=50052):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    log_plugin_pb2_grpc.add_LogPluginServicer_to_server(MyPlugin(), server)
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    print(f"My Plugin running on port {port}")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

### 2. Запустите:

```bash
python my_plugin.py &
```

### 3. Зарегистрируйте:

```bash
curl -X POST "http://localhost:8000/api/plugins/register?name=my-plugin&address=localhost:50052"
```

### 4. Используйте:

```bash
curl -X POST "http://localhost:8000/api/plugins/process?plugin_name=my-plugin"
```

## 📚 Дополнительные ресурсы

- **README.md** - Полная документация плагинов
- **DEMO.md** - Подробная демонстрация с примерами
- **PLUGIN_SYSTEM.md** - Технические детали реализации

## ❓ Частые вопросы

**Q: Нужен ли Docker для тестирования?**
A: Нет! `simple_test.py` работает без Docker.

**Q: Можно ли писать плагины на других языках?**
A: Да! gRPC поддерживает Go, Java, C++, Node.js и другие.

**Q: Как обрабатывать большие объёмы логов?**
A: Используйте параметр `limit` в API или фильтруйте по `level`.

**Q: Безопасно ли это?**
A: Да, плагины работают в отдельных процессах и не имеют прямого доступа к БД.

## ✅ Проверка

Вы успешно протестировали систему, если:
- ✅ `simple_test.py` выполнился без ошибок
- ✅ Вы видите агрегированные результаты
- ✅ Тесты прошли успешно

## 🎉 Готово!

Теперь вы можете:
- Создавать собственные плагины
- Интегрировать их в систему
- Расширять функционал без изменения основного кода
