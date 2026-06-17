export const CREATE_FAMILY_SUCCESS_FLAG = "plant-care-reminder:create-family-success";

export function hasCreateFamilySuccessFlag() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(CREATE_FAMILY_SUCCESS_FLAG) === "1";
}

export function markCreateFamilySuccess() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(CREATE_FAMILY_SUCCESS_FLAG, "1");
}

export function clearCreateFamilySuccess() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CREATE_FAMILY_SUCCESS_FLAG);
}
