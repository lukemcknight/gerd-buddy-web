import { createAIHandler } from "../../server/ai/handler";

export const config = { maxDuration: 60 };
export default createAIHandler("doctor");
