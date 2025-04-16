import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import chalk from "chalk";
import boxen from "boxen";
import * as fs from 'fs/promises';

async function main({
    page,
    context,
    stagehand,
  }: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  await page.goto("https://wiki.yandex.ru/");
  await page.pause();

  try {
    // 1. Читаем JSON файл
    const jsonData = await fs.readFile('./linksFiltered.json', 'utf-8');
    const links = JSON.parse(jsonData);

    // 2. Берем первую ссылку (первую строку)
    if (!Array.isArray(links) || links.length === 0 || typeof links[0] !== 'string') {
      console.error('JSON файл имеет неверный формат. Ожидается массив строк.');
      return;
    }



  } catch (error) {
    console.error('Произошла ошибка:', error);
  }
}

/**
 * This is the main function that runs when you do npm run start
 *
 * YOU PROBABLY DON'T NEED TO MODIFY ANYTHING BELOW THIS POINT!
 *
 */
async function run() {
  const stagehand = new Stagehand({
    ...StagehandConfig,
  });
  await stagehand.init();

  if (StagehandConfig.env === "BROWSERBASE" && stagehand.browserbaseSessionID) {
    console.log(
      boxen(
        `View this session live in your browser: \n${chalk.blue(
          `https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
        )}`,
        {
          title: "Browserbase",
          padding: 1,
          margin: 3,
        },
      ),
    );
  }

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
