import type { SetStateAction } from "react";
import { supabase } from "../../../../supabase-client";

const CUNY_EMAIL_DOMAIN = "@login.cuny.edu";

const isCunyEmail = (value: string) =>
  value.trim().toLowerCase().endsWith(CUNY_EMAIL_DOMAIN);

export default async function handleDealSignup(
  dealEmail: string,
  setDealLoading: React.Dispatch<SetStateAction<boolean>>,
  setDealSent: React.Dispatch<SetStateAction<boolean>>,
  setDealEmail: React.Dispatch<SetStateAction<string>>
) {
  const normalizedEmail = dealEmail.trim().toLowerCase();

  if (!normalizedEmail) return;

  if (!isCunyEmail(normalizedEmail)) {
    alert("Only CUNY emails ending with @login.cuny.edu are allowed.");
    return;
  }

  setDealLoading(true);

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    console.warn("Deal signup note:", error.message);
  }

  setDealSent(true);
  setDealLoading(false);

  setTimeout(() => {
    setDealSent(false);
    setDealEmail("");
  }, 4000);
}