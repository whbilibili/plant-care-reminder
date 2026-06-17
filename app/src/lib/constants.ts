/**
 * 文本字段长度上限（按 JS String.length / UTF-16 码元计，与 <input maxLength> 行为一致）。
 *
 * 这是前端侧（输入端 maxLength + 前端校验）的唯一长度来源。后端 Convex 侧
 * （convex/lib/validators.ts）复用同一组数值，需保持一致避免漂移。
 */
export const PLANT_NAME_MAX_LENGTH = 30;
export const PLANT_LOCATION_MAX_LENGTH = 30;
export const PLANT_DESCRIPTION_MAX_LENGTH = 200;
export const PLANT_NOTE_MAX_LENGTH = 200;
export const CUSTOM_TASK_NAME_MAX_LENGTH = 20;
