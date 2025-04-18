import fs from "fs/promises";
import { Page } from "@browserbasehq/stagehand";

async function processNewLinks(page: Page) {
    try {
        // Получаем все ссылки на странице
        const links = await page.evaluate(() => {
            const allLinks = document.querySelectorAll('a');
            return Array.from(allLinks).map(link => link.href);
        });

        // Загружаем существующие ссылки
        let existingLinks = new Set();
        try {
            const data = await fs.readFile('linksFiltered.json', 'utf-8');
            existingLinks = new Set(JSON.parse(data));
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('Ошибка при чтении linksFiltered.json:', error);
            }
        }

        // Обрабатываем новые ссылки
        const newLinks = [];
        for (const link of links) {
            try {
                let processedLink;
                if (link.startsWith('https://wiki.yandex.ru')) {
                    // Обрабатываем абсолютные ссылки
                    processedLink = link.replace('https://wiki.yandex.ru', '');
                } else if (link.startsWith('/')) {
                    // Обрабатываем относительные ссылки
                    processedLink = link;
                } else {
                    // Пропускаем другие ссылки
                    continue;
                }

                // Проверяем, есть ли ссылка в существующих
                if (!existingLinks.has(processedLink)) {
                    newLinks.push(processedLink);
                }
            } catch (error) {
                console.error(`Ошибка при обработке ссылки ${link}:`, error);
            }
        }

        // Сохраняем новые ссылки
        if (newLinks.length > 0) {
            try {
                await fs.appendFile('newLinks.json', JSON.stringify(newLinks, null, 2), 'utf-8');
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    await fs.writeFile('newLinks.json', JSON.stringify(newLinks, null, 2), 'utf-8');
                } else {
                    console.error('Ошибка при сохранении новых ссылок:', error);
                }
            }
        }

        return newLinks;
    } catch (error) {
        console.error('Ошибка при обработке ссылок:', error);
        return [];
    }
}

export default processNewLinks;