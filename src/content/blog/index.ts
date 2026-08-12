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
import naturalRemedies from "./natural-remedies-acid-reflux";
import gerdDietGuide from "./gerd-diet-guide";
import gerdVsHeartburn from "./gerd-vs-heartburn";
import acidRefluxPregnancy from "./acid-reflux-pregnancy";
import gerdMedicationsExplained from "./gerd-medications-explained";
import exerciseAndGerd from "./exercise-and-gerd";
import gerdAndAnxiety from "./gerd-and-anxiety";
import foodsThatHelpAcidReflux from "./foods-that-help-acid-reflux";
import whenToSeeDoctorAcidReflux from "./when-to-see-doctor-acid-reflux";
import gerdAndSleepApnea from "./gerd-and-sleep-apnea";
import gerdAndWeightLoss from "./gerd-and-weight-loss";
import gerdAndCoffee from "./gerd-and-coffee";
import gerdAndAlcohol from "./gerd-and-alcohol";
import hiatalHerniaAndGerd from "./hiatal-hernia-and-gerd";
import gerdAndAsthma from "./gerd-and-asthma";
import eatingHabitsForGerd from "./eating-habits-for-gerd";
import travelingWithGerd from "./traveling-with-gerd";
import gerdFlareUp from "./gerd-flare-up";
import gerdInChildren from "./gerd-in-children";
import doGerdFoodTrackingAppsWork from "./do-gerd-food-tracking-apps-work";
import bestGerdTrackingApps from "./best-gerd-tracking-apps";
import eggsAndAcidReflux from "./eggs-and-acid-reflux";
import teaAndAcidReflux from "./tea-and-acid-reflux";
import bestAcidRefluxApps from "./best-acid-reflux-apps";
import gerdbuddyVsMysymptoms from "./gerdbuddy-vs-mysymptoms";

const posts: BlogPost[] = [
  bestAcidRefluxApps,
  teaAndAcidReflux,
  eggsAndAcidReflux,
  gerdbuddyVsMysymptoms,
  bestGerdTrackingApps,
  doGerdFoodTrackingAppsWork,
  gerdTriggerFoods,
  nighttimeGerdTips,
  stressAndGerd,
  gerdFriendlyMeals,
  understandingLpr,
  naturalRemedies,
  gerdDietGuide,
  gerdVsHeartburn,
  acidRefluxPregnancy,
  gerdMedicationsExplained,
  exerciseAndGerd,
  gerdAndAnxiety,
  foodsThatHelpAcidReflux,
  whenToSeeDoctorAcidReflux,
  gerdAndSleepApnea,
  gerdAndWeightLoss,
  gerdAndCoffee,
  gerdAndAlcohol,
  hiatalHerniaAndGerd,
  gerdAndAsthma,
  eatingHabitsForGerd,
  travelingWithGerd,
  gerdFlareUp,
  gerdInChildren,
];

// Sort by date, newest first
posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export { posts };
export type { BlogPost };
