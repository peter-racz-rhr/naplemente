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

export function resetOnboarding() {
  try {
    window.localStorage.removeItem(ONBOARDED_KEY);
  } catch {
    // Nothing stored to clear.
  }
}

/** Show the whole first-run flow again (splash, intro, sign-up) next time. */
export function replayIntro() {
  resetOnboarding();
  try {
    window.localStorage.removeItem(TERMS_KEY);
    window.localStorage.setItem(REPLAY_KEY, "1");
  } catch {
    // Nothing stored to clear.
  }
}

const REPLAY_KEY = "naplemente:replay-intro";

/** True once after replayIntro(), so the welcome asks for location again. */
export function takeReplayFlag() {
  const replay = read(REPLAY_KEY) === "1";
  try {
    window.localStorage.removeItem(REPLAY_KEY);
  } catch {
    // Ignore.
  }
  return replay;
}
