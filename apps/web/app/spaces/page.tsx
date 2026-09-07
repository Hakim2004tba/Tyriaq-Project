import { Suspense, type JSX } from "react";
import type { Metadata } from "next";
import { SpacesIndex } from "./spaces-index";

export const metadata: Metadata = {
  title: "Spaces",
  description: "Every space in your workspace — folders, projects and the people in them.",
};

export default function SpacesPage(): JSX.Element {
  // SpacesIndex reads ?new=1 to open the create dialog, and
  // useSearchParams needs a Suspense boundary to stay prerenderable.
  return (
    <Suspense fallback={null}>
      <SpacesIndex />
    </Suspense>
  );
}
