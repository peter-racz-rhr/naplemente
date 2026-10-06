const ONBOARDED_KEY = "naplemente:onboarded";
const TERMS_KEY = "naplemente:terms-accepted";

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: onboarding simply shows again.
  }
}

export const hasOnboarded = () => read(ONBOARDED_KEY) === "1";
export const markOnboarded = () => write(ONBOARDED_KEY, "1");
export const hasAcceptedTerms = () => read(TERMS_KEY) === "1";
export const markTermsAccepted = () => write(TERMS_KEY, "1");
