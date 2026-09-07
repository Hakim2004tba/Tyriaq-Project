import type { JSX } from "react";
import type { Metadata } from "next";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage(): JSX.Element {
  return <ResetForm />;
}
