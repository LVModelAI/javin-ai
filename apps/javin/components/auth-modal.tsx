"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";

import { login, type LoginActionState } from "@/app/(auth)/actions";
import { X } from "lucide-react";
export default function AuthModal({
  isOpen,
  onClose,
  mode,
  setMode,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "signup";
  setMode: (mode: "login" | "signup") => void;
}) {
  const router = useRouter();
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

  if (!isOpen) return null;

  return (
    <div
      id="auth-modal"
      className="w-screen 
      h-screen flex items-center justify-center fixed top-0 left-0 bg-background bg-opacity-90
    "
    >
      {mode === "login" ? (
        <div
          className="w-full md:w-fit overflow-hidden rounded-2xl flex flex-col gap-5 border p-5 mx-auto relative"
          style={{ zIndex: 1000 }}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-500 dark:text-zinc-400"
          >
            <X />
          </button>
          <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
            <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Use your email and password to sign in
            </p>
          </div>
          <AuthForm action={handleSubmit} defaultEmail={email}>
            <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              {"Don't have an account? "}
              <button
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
              {" for free."}
            </p>
          </AuthForm>
        </div>
      ) : (
        <div className="flex flex-col h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
          <div className="rounded-xl p-6 flex flex-col gap-2 leading-relaxed text-center max-w-2xl">
            <p className="flex flex-row justify-center gap-4 items-center text-5xl font-semibold">
              Javin.ai
            </p>
            <p className="text-lg text-muted-foreground">
              A focused, no-nonsense AI search engine for crypto and blockchain.
            </p>
          </div>
          <div className="w-fit overflow-hidden rounded-2xl gap-5 flex flex-col border mx-auto p-5">
            <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16  ">
              <h3 className="text-xl font-semibold dark:text-zinc-50">
                Sign Up
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Create an account with your email and password
              </p>
            </div>
            <AuthForm action={handleSubmit} defaultEmail={email}>
              <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>
              <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
                {"Already have an account? "}
                <button
                  className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
                {" instead."}
              </p>
            </AuthForm>
          </div>
        </div>
      )}
    </div>
  );
}
