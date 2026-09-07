import type { JSX } from "react";
import type { Metadata } from "next";
import { Canon } from "./canon";

export const metadata: Metadata = {
  title: "Design canon",
  description: "The Tyriaq design language — tokens, primitives and the rules that govern them.",
};

export default function DesignSystemPage(): JSX.Element {
  return <Canon />;
}
