import { ViewTransition, type ReactNode } from "react";

/*
  Screens slide left when you go deeper into the flow and right when you
  come back. Navigations without a direction (browser back, swipe) crossfade.
*/
const motion = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "page-fade",
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={motion} exit={motion} default="none">
      {children}
    </ViewTransition>
  );
}

/** Pass to Link `transitionTypes` or router.push options. */
export const FORWARD = ["nav-forward"];
export const BACK = ["nav-back"];
