import type { BlogPost } from "./types";

// Import all blog posts here. To add a new post:
// 1. Create a new .ts file in this directory (copy gerd-trigger-foods.ts as a template)
// 2. Add an import line below
// 3. Add the imported post to the `posts` array
import gerdTriggerFoods from "./gerd-trigger-foods";
import nighttimeGerdTips from "./nighttime-gerd-tips";
import stressAndGerd from "./stress-and-gerd";
import gerdFriendlyMeals from "./gerd-friendly-meals";
import understandingLpr from "./understanding-lpr";

const posts: BlogPost[] = [
  gerdTriggerFoods,
  nighttimeGerdTips,
  stressAndGerd,
  gerdFriendlyMeals,
  understandingLpr,
];

// Sort by date, newest first
posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export { posts };
export type { BlogPost };
