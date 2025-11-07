import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "stocks-app-tracker",
  ai: { gemini: { apiKey: process.env.GEMINI_API_KEY } },
  functions: [
    {
      name: "create-user",
      data: {
        name: "create-user",
      },
    },
  ],
});
