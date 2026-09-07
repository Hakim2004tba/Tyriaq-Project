import type { JSX } from "react";
import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage(): JSX.Element {
  return <ForgotForm />;
}
