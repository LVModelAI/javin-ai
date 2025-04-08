"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";

import { forgotPassword, type ForgotPasswordActionState } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<
    ForgotPasswordActionState,
    FormData
  >(forgotPassword, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "failed") {
      toast.error("Something went wrong!");
    } else if (state.status === "invalid_data") {
      toast.error("Failed validating your submission!");
    } else if (state.status == "invalid_email") {
      toast.error("Invalid email address");
    } else if (state.status === "success") {
      setIsSuccessful(true);
      toast.success("Reset link sent to your email");
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    console.log("formData = ", formData);
    formAction(formData);
  };

  return (
    <div className="flex flex-col h-dvh w-screen pt-12 md:pt-0 items-center justify-center bg-background">
      <div className="rounded-xl p-6 flex flex-col items-center gap-2 leading-relaxed text-center max-w-2xl">
        <p className="flex flex-row justify-center gap-4 items-center text-5xl font-semibold">
          Javin.ai
        </p>
        <p className="text-lg text-muted-foreground">
          A focused, no-nonsense AI search engine for crypto and blockchain.
        </p>
      </div>
      <div className="w-fit overflow-hidden rounded-2xl gap-5 flex flex-col border m-2 p-5">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            Forgot Password ?
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email to get a reset link.
          </p>
        </div>
        <AuthForm
          action={handleSubmit}
          defaultEmail={email}
          passwordNeeded={false}
          emailNeeded={true}
          forgotPasswordNeeded={false}
          fieldErrors={state.fieldErrors}
        >
          <SubmitButton isSuccessful={isSuccessful}>Reset</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Remembered your password? "}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign In
            </Link>
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
