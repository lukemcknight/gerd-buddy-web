import { createAIHandler } from "../../server/ai/handler.js";

export const config = { maxDuration: 60 };
export default createAIHandler("menu");
