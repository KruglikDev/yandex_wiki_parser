import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import chalk from "chalk";
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client } from 'pg'; // Подключаем клиент PostgreSQL

async function main({
    page,
    context,
    stagehand,
}: {
    page: Page;
    context: BrowserContext;
    stagehand: Stagehand;
}) {
    await page.goto("https://wiki.yandex.ru/");
    await page.pause();

    try {
        // 1. Read JSON file
        const jsonData = await fs.readFile('./linksFiltered.json', 'utf-8');
        const links = JSON.parse(jsonData);

        // 2. Validate links array
        if (!Array.isArray(links) || links.length === 0) {
            console.error('JSON file is empty or not an array');
            return;
        }

        // 3. Iterate through all links
        for (const link of links) {
            if (typeof link !== 'string') {
                console.error(`Invalid link format: ${link}`);
                continue;
            }

            try {
                const fullUrl = `https://wiki.yandex.ru${link}`;
                console.log(chalk.blue(`Processing: ${fullUrl}`));

                await page.goto(fullUrl);
                const cleanedLink = link.replace(/^\/|\/$/g, '');

                await page.mouse.wheel(0, 500);

                const headerInfo = await page.evaluate(() => {
                const headerEl = document.querySelector('.PageDoc-Header');
                if (!headerEl) return null;

                const authorEl = document.querySelector('.UserName');
                const titleEl = headerEl.querySelector('.DocTitle');
                const updatedEl = document.querySelector('.PageDoc-Updated');

                return {
                    author: authorEl?.textContent?.trim() || '',
                    title: titleEl?.textContent?.trim() || '',
                    updated: updatedEl?.textContent?.trim() || ''
                    };
                 });

                if (!headerInfo) {
                    console.error(`No header info found for ${link}`);
                    continue; // Пропускаем эту ссылку, если заголовок не найден
                }

                const headerMarkdown = `## ${headerInfo.title}\n\n**Автор:** ${headerInfo.author}\n\n**${headerInfo.updated}**\n\n`;
                console.log(chalk.gray(`[DEBUG] Header info for ${link}: ${JSON.stringify(headerInfo)}`));

                // Затем внутри извлечения контента:
                const data = await page.evaluate((linkKey) => {
                    // @ts-ignore
                    return window.__DATA__.preloadedState.pages.entities[linkKey]?.content;
                }, cleanedLink);

                if (!data) {
                    console.error(`No content found for ${link}`);
                    continue;
                }

                const content = typeof data === 'string' ? `${headerMarkdown}${data}` : `${headerMarkdown}${JSON.stringify(data, null, 2)}`;
                console.log(chalk.green(`Extracted content for ${link}${content}`));

                // 5. Uncomment and use PostgreSQL connection if needed
                /*
                const client = new Client({
                    user: 'kruglik',
                    host: 'localhost',
                    database: 'yandex_wiki_db',
                    password: '123',
                    port: 5438,
                });

                await client.connect();

                const insertQuery = `
                    INSERT INTO wiki (route, content)
                    VALUES ($1, $2)
                    ON CONFLICT (route) DO UPDATE SET content = EXCLUDED.content;
                `;
                await client.query(insertQuery, [link, content]);
                await client.end();
                console.log(chalk.green(`Saved to DB: ${link}`));
                */

                // 6. Extract and save images
                const images = await page.evaluate(() => {
                    const contentFolder = document.querySelector('div.PageDoc-Content.PageDoc-Content_type_wysiwyg') || document.body;
                    const imgElements = contentFolder.querySelectorAll('img');
                    return Array.from(imgElements).map(img => ({
                        src: img.src,
                        alt: img.alt || '',
                    }));
                });

                const imageDir = path.join('Images', link.replace(/^\/|\/$/g, ''));
                await fs.mkdir(imageDir, { recursive: true });

                for (const image of images) {
                    if (image.src) {
                        try {
                            const response = await page.goto(image.src);
                            const buffer = await response?.body();
                            if (!buffer) throw new Error(`No response body`);
                            const fileName = path.basename(new URL(image.src).pathname);
                            const imagePath = path.join(imageDir, fileName);
                            await fs.writeFile(imagePath, buffer);
                            console.log(chalk.green(`Saved image: ${imagePath}`));
                        } catch (err) {
                            console.error(chalk.red(`Error saving image ${image.src}: ${err}`));
                        }
                    }
                }

            } catch (error) {
                console.error(chalk.red(`Error processing link ${link}: ${error}`));
                continue; // Continue with the next link
            }
        }

        console.log(chalk.blue('Finished processing all links'));

    } catch (error) {
        console.error(chalk.red('General error:', error));
    }
}

async function run() {
  const stagehand = new Stagehand({
    ...StagehandConfig,
  });
  await stagehand.init();

  const page = stagehand.page;
  const context = stagehand.context;
  await main({
    page,
    context,
    stagehand,
  });
  // await stagehand.close();
  console.log(
    `\n🤘 Thanks so much for using Stagehand! Reach out to us on Slack if you have any feedback: ${chalk.blue(
      "https://stagehand.dev/slack",
    )}\n`,
  );
}

run();
