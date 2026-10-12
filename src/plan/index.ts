// Ranking engine (T4). Pure functions only.
export { ageMonths, stageForAge, stageLabelKey } from "./stage";
export { rankHazards, rankWithLead, minCost, type RankedHazard, type Reason } from "./rank";
export { buildPlan, taskId } from "./build";
export { nextUnlocks } from "./unlock";
export { previewAt, shiftMonths, tasksToAdd, PREVIEW_MAX_MONTHS, type Preview } from "./preview";
export {
  planWeekend,
  taskEffort,
  suppliesFor,
  type WeekendInput,
  type WeekendPlan,
  type SupplyItem,
} from "./weekend";
