import type { JSX } from "react";
import { THEME_STORAGE_KEY } from "./theme-provider";

/**
 * The anti-flash script.
 *
 * This has to be a blocking inline <script> in <head>, and it has to
 * run before the browser paints anything. React cannot do this job: by
 * the time any component — provider included — executes, the first
 * frame is already on screen, and a dark-to-light flip at that point is
 * exactly the white flash this avoids.
 *
 * It is deliberately tiny and deliberately wrapped in try/catch. It
 * runs before the error boundary, before hydration, before the stylesheet
 * finishes; anything it throws is an unstyled blank page, so the failure
 * mode is "keep the default theme", never "stop".
 */
export function ThemeScript(): JSX.Element {
  const script = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var d=s==="light"?false:s==="dark"?true:!window.matchMedia("(prefers-color-scheme: light)").matches;
var r=document.documentElement;
r.dataset.theme=d?"dark":"light";
r.classList.toggle("dark",d);
}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
