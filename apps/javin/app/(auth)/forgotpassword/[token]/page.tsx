"use client";

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  verifyAndResetPassword,
  VerifyAndResetPasswordActionState,
} from "../../actions";
import { toast } from "sonner";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

export default function ResetPassword() {
  const { token } = useParams(); // Get token from dynamic route
  const router = useRouter();

  // const [password, setPassword] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<
    VerifyAndResetPasswordActionState,
    FormData
  >(verifyAndResetPassword, {
    status: "idle",
  });

  const handleSubmit = (formData: FormData) => {
    if (typeof token !== "string") {
      toast.error("Invalid token");
      return;
    }
    // setPassword(formData.get("password") as string);
    formData.set("token", token);
    console.log(formData);
    formAction(formData);
  };

  useEffect(() => {
    if (state.status === "failed") {
      toast.error("Something went wrong!");
    } else if (state.status === "expired_token") {
      toast.error(
        "Token has expired, please forget password again to get a new link."
      );
    } else if (state.status == "redirect_to_forgot_password") {
      toast.error("Wrong token. Redirecting to forgot password.");
      router.push("/forgotpassword");
    } else if (state.status === "success") {
      setIsSuccessful(true);
      toast.success("Reset succesfully, Redirecting to login.");
      router.push("/login");
    }
  }, [state.status, router]);

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
            Reset your password.
          </h3>
        </div>
        <AuthForm
          action={handleSubmit}
          emailNeeded={false}
          forgotPasswordNeeded={false}
          passwordNeeded={true}
          fieldErrors={state.fieldErrors}
        >
          <SubmitButton isSuccessful={isSuccessful}>Reset</SubmitButton>
        </AuthForm>
      </div>
    </div>
  );
}
