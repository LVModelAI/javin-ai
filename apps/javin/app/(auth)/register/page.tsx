"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";

import { register, type RegisterActionState } from "../actions";
import { useTheme } from "next-themes";

export default function Page() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: "idle",
    }
  );

  useEffect(() => {
    if (state.status === "user_exists") {
      toast.error("Account already exists");
    } else if (state.status === "failed") {
      toast.error("Failed to create account");
    } else if (state.status === "invalid_data") {
      toast.error("Failed validating your submission!");
    } else if (state.status === "too_small") {
      toast.error("Password should be at least 6 characters long.");
    } else if (state.status === "success") {
      toast.success("Account created successfully");
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <div className="flex flex-col h-dvh w-screen pt-12 md:pt-0 items-center justify-center bg-background">
      <div className="rounded-xl p-6 flex flex-col items-center gap-2 leading-relaxed text-center max-w-2xl">
        {resolvedTheme == "dark" ? (
          <img
            alt="Javin.ai"
            src="/images/javin/banner/javin-banner-white.svg"
            className=" w-32 sm:w-48 h-auto"
          />
        ) : (
          resolvedTheme == "light" && (
            <img
              alt="Javin.ai"
              src="/images/javin/banner/javin-banner-black.svg"
              className=" w-32 sm:w-48 h-auto"
            />
          )
        )}
        <p className="text-lg text-muted-foreground">
          A focused, no-nonsense AI search engine for crypto.
        </p>
      </div>
      <div className="w-fit overflow-hidden rounded-2xl gap-5 flex flex-col border m-2 p-5">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Already have an account? "}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
