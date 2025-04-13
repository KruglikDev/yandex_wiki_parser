import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import chalk from "chalk";
import boxen from "boxen";
import { drawObserveOverlay, clearOverlays, actWithCache } from "./utils.js";
import { z } from "zod";

async function main({
    page,
    context,
    stagehand,
  }: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  // Navigate to a URL
  await page.goto("https://wiki.yandex.ru/");

  // Click the 'Войти в Wiki' button
  await page.act("Click the 'Войти в Wiki' button");

  // --- Handling the Yandex ID button click and new tab ---

  // 1. Начать ожидание новой страницы ПЕРЕД кликом
  const pagePromise = context.waitForEvent('page');

  // 2. Выполнить клик, который должен открыть новую страницу
  //    Рекомендуется использовать более точный локатор Playwright вместо act,
  //    если с act возникают проблемы при открытии новых вкладок.
  console.log("Attempting to click the Yandex ID button...");
  try {
    // Попробуем кликнуть на элемент, содержащий текст 'Yandex ID'
    // Это может быть кнопка <button> или ссылка <a>, или другой элемент.
    // Используйте DevTools браузера, чтобы найти лучший селектор.
    await page.locator(':text("Yandex ID")').click();
    // Или, если act работал для поиска элемента, но не для ожидания вкладки:
    // await page.act("Click the button that includes 'Yandex ID' text");
  } catch (error) {
    console.error("Could not click the Yandex ID button:", error);
    // Если клик не удался, дальнейшее ожидание вкладки бессмысленно
    return;
  }

  console.log("Click initiated, waiting for new page event...");

  // 3. Дождаться выполнения промиса (т.е. открытия новой страницы)
  try {
    const newPage = await pagePromise;
    console.log("New page event received!");
    await newPage.waitForLoadState('domcontentloaded'); // Ждем загрузки DOM новой страницы
    await newPage.bringToFront(); // Делаем новую вкладку активной
    console.log("Switched to new tab:", newPage.url());

    const captchaElement = newPage.locator('iframe[title*="SmartCaptcha"]'); // Найдите правильный селектор для iframe капчи

    if (await captchaElement.isVisible()) {
      console.log("CAPTCHA detected. Pausing script for manual solving...");
      console.log("Please solve the CAPTCHA in the browser window and then press 'Resume' in the Playwright Inspector.");

      // Ставим скрипт на паузу
      await newPage.pause(); // <--- ПАУЗА ЗДЕСЬ

      console.log("Script resumed. Assuming CAPTCHA was solved manually.");
      await newPage.fill('input[name="username"]', 'a.kruglik@keep-calm.ru');
      await page.act("Click Log in button");
      // Теперь можно продолжать действия, например, нажать кнопку отправки формы
      // await newPage.click('button[type="submit"]'); // Найти правильный селектор кнопки
    }
    await newPage.fill('input[name="username"]', 'a.kruglik@keep-calm.ru');
    await page.act("Click Log in button");
    // Теперь можно взаимодействовать с newPage
    // Например:
    // await newPage.fill('input[name="username"]', 'ваш_логин');
    // await newPage.fill('input[name="passwd"]', 'ваш_пароль');
    // await newPage.click('pr');

  } catch (error) {
    console.error("Failed to get the new page or timed out waiting:", error);
    // Дополнительная отладка: проверить страницы снова
    const currentPages = context.pages();
    console.log(`Current pages after timeout/error (${currentPages.length}):`, currentPages.map(p => p.url()));
  }
  // --- End of new tab handling ---

  console.log("Script finished.");
  // // Use act() to take actions on the page
  // await page.act("Click the search box");
  //
  // // Use observe() to plan an action before doing it
  // const [action] = await page.observe(
  //   "Type 'Tell me in one sentence why I should use Stagehand' into the search box",
  // );
  // await drawObserveOverlay(page, [action]); // Highlight the search box
  // await page.waitForTimeout(1000);
  // await clearOverlays(page); // Remove the highlight before typing
  // await page.act(action); // Take
  //
  // // For more on caching, check out our docs: https://docs.stagehand.dev/examples/caching
  // await actWithCache(page, "Click the suggestion to use AI");
  // await page.waitForTimeout(4000);
  //
  // // Use extract() to extract structured data from the page
  // const { text } = await page.extract({
  //   instruction:
  //     "extract the text of the AI suggestion from the search results",
  //   schema: z.object({
  //     text: z.string(),
  //   }),
  // });
  // stagehand.log({
  //   category: "create-browser-app",
  //   message: `Got AI Suggestion`,
  //   auxiliary: {
  //     text: {
  //       value: text,
  //       type: "string",
  //     },
  //   },
  // });
  // stagehand.log({
  //   category: "create-browser-app",
  //   message: `Metrics`,
  //   auxiliary: {
  //     metrics: {
  //       value: JSON.stringify(stagehand.metrics),
  //       type: "object",
  //     },
  //   },
  // });
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
