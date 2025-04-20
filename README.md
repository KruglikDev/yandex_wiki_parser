План:
1) Запускаем парсер, ждем паузу, авторизируемся (здесь нужно закомментировать остальной код парсера).
2) Собираем ссылки в боковой панели: их нужно открывать + они подгружаются динамически, если проскроллить до конца - пропадут ссылки в начале. Создать Set и отфильтровать повторы.
3) Загрузить ссылки в файл со ссылками, установить свежие ru прокси, раскомментировать код парсера.
4) Запустить парсер npm run start, авторизоваться, отжать паузу и ждать. Не забываем про настройки БД в докере.

conda activate yandex_wiki

// СОЗДАТЬ БД
docker run --name yandex_wiki -e POSTGRES_PASSWORD=123 -e POSTGRES_USER=kruglik -e POSTGRES_DB=yandex_wiki_db -p 5438:5432 -d postgres

// ВОЙТИ В БД
docker exec -it yandex_wiki psql -U kruglik -d yandex_wiki_db

// СОЗДАТЬ ТАБЛИЦУ
CREATE TABLE wiki (
    id SERIAL PRIMARY KEY,         -- Автоинкрементный ID
    route TEXT UNIQUE NOT NULL,    -- Уникальный маршрут (например, "/home/about") - сюда передаем link вот этот link = links[idx]
    content TEXT NOT NULL,         -- Содержимое, можно хранить markdown - сюда сохраняем page_content
    isParsed BOOLEAN DEFAULT FALSE -- Если успешно загрузили данные — меняем на TRUE
);

// ПРОВЕРИТЬ СТРУКТУРУ ТАБЛИЦЫ
\d wiki

// УДАЛИТЬ ВСЕ ИЗ ТАБЛИЦЫ НО ОСТАВИТЬ СТРУКТУРУ
TRUNCATE TABLE wiki RESTART IDENTITY;

psql -h localhost -U kruglik -d yandex_wiki_db -p 5438 -c "SELECT * FROM wiki LIMIT 15;" > output.json
