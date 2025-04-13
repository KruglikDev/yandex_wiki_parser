import type { ConstructorParams } from "@browserbasehq/stagehand";
import dotenv from "dotenv";

import { CustomOpenAIClient } from "./llm_clients/customOpenAI_client.js";
import { OpenAI } from "openai";

dotenv.config();

const StagehandConfig: ConstructorParams = {
  verbose: 1 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
  domSettleTimeoutMs: 30_000 /* Timeout for DOM to settle in milliseconds */,

  // LLM configuration

  llmClient: new CustomOpenAIClient({
    modelName: "mistral-7b-instruct-v0.3",
    client: new OpenAI({
      baseURL: "http://192.168.0.4:1234/v1/",
      apiKey: "",
    }),
  }),

  // Browser configuration
  env: "LOCAL" /* Environment to run in: LOCAL or BROWSERBASE */,
  apiKey: process.env.BROWSERBASE_API_KEY /* API key for authentication */,
  projectId: process.env.BROWSERBASE_PROJECT_ID /* Project identifier */,
  browserbaseSessionID:
    undefined /* Session ID for resuming Browserbase sessions */,
  browserbaseSessionCreateParams: {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      blockAds: true,
      viewport: {
        width: 1024,
        height: 768,
      },
    },
  },
  localBrowserLaunchOptions: {
    viewport: {
      width: 1024,
      height: 768,
    },
    args: [  // Добавляем аргументы здесь
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  } /* Configuration options for the local browser */,
};

export default StagehandConfig;
