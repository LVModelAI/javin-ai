"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";

import { login, type LoginActionState } from "../actions";
import { useTheme } from "next-themes";
import { LogoGoogle } from "@/components/icons";
import { signIn } from "next-auth/react";

export default function Page() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    }
  );

  useEffect(() => {
    if (state.status === "failed") {
      toast.error("Invalid credentials!");
    } else if (state.status === "invalid_data") {
      toast.error("Failed validating your submission!");
    } else if (state.status === "success") {
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state.status, router]);

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
        <h3 className="text-xl font-semibold dark:text-zinc-50 text-center">
          Sign In
        </h3>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="flex items-center justify-center gap-2 w-fit border px-4 py-2 rounded-md font-medium transition hover:bg-accent dark:hover:bg-zinc-800 mx-auto"
        >
          <LogoGoogle />
          Continue with Google
        </button>
        <div className="flex items-center justify-center gap-2 w-full ">
          <div className="w-1/3 border"></div>
          <div className="text-zinc-500">OR</div>
          <div className="w-1/3 border"></div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Sign In</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              href="/register"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign Up
            </Link>
            {" for free."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
