export const CREATE_PLANT_SUCCESS_FLAG = "plant-care-reminder:create-plant-success";

export function hasCreatePlantSuccessFlag() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(CREATE_PLANT_SUCCESS_FLAG) === "1";
}

export function markCreatePlantSuccess() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(CREATE_PLANT_SUCCESS_FLAG, "1");
}

export function clearCreatePlantSuccess() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CREATE_PLANT_SUCCESS_FLAG);
}
