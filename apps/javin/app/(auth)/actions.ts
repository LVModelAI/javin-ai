"use server";

import { z } from "zod";

import {
  createUser,
  getUser,
  getPasswordResetToken,
  savePasswordResetToken,
  updateUserPassword,
  deletePasswordResetToken,
} from "@/lib/db/queries";

import { signIn } from "./auth";
import { generateUUID } from "@javin/shared/lib/utils/utils";
import { nanoid } from "nanoid";
import { sendResetEmail } from "@/lib/utils/email";
import * as Sentry from "@sentry/nextjs";

// For login: only check required + min length
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// For registration: enforce full strength rules
const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[a-z]/, "Must include at least one lowercase letter")
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[0-9]/, "Must include at least one number")
    .regex(
      /[!@#$%^&*]/,
      "Must include at least one special character (!@#$%^&*)"
    ),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[a-z]/, "Must include at least one lowercase letter")
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[0-9]/, "Must include at least one number")
    .regex(
      /[!@#$%^&*]/,
      "Must include at least one special character (!@#$%^&*)"
    ),
});

export interface LoginActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
}

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }
    Sentry.captureException(error);
    return { status: "failed" };
  }
};

export interface RegisterActionState {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data"
    | "too_small";
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
}

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = registerSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return { status: "user_exists" } as RegisterActionState;
    }
    const id = generateUUID();
    await createUser(id, validatedData.email, validatedData.password);
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.flatten().fieldErrors;

      return {
        status: "invalid_data",
        fieldErrors: {
          email: fieldErrors.email,
          password: fieldErrors.password,
        },
      };
    }
    Sentry.captureException(error);
    return { status: "failed" };
  }
};

export interface ForgotPasswordActionState {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "invalid_data"
    | "invalid_email";
  fieldErrors?: {
    email?: string[];
  };
}

export async function forgotPassword(
  _: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  try {
    const email = formData.get("email") as string;

    const user = await getUser(email);
    if (user.length === 0) {
      return {
        status: "invalid_email",
        fieldErrors: { email: ["Email not found"] },
      };
    }

    const resetToken = nanoid();
    await savePasswordResetToken(email, resetToken);

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/forgotpassword/${resetToken}`;
    console.log("Reset URL:", resetUrl);

    await sendResetEmail(email, resetUrl); // 💌 Send the actual email

    return { status: "success" };
  } catch (err) {
    console.log("Error while running forgotPassword action = ", err);
    Sentry.captureException(err);
    return { status: "failed" };
  }
}

export interface VerifyAndResetPasswordActionState {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "redirect_to_forgot_password"
    | "expired_token"
    | "invalid_data";
  fieldErrors?: {
    password?: string[];
  };
}

export async function verifyAndResetPassword(
  _: VerifyAndResetPasswordActionState,
  formData: FormData
): Promise<VerifyAndResetPasswordActionState> {
  try {
    const form = {
      token: formData.get("token") as string,
      password: formData.get("password") as string,
    };

    // Validate the input using Zod
    const validated = resetPasswordSchema.safeParse(form);

    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors;
      return {
        status: "invalid_data",
        fieldErrors: {
          password: fieldErrors.password || [],
        },
      };
    }

    const tokens = await getPasswordResetToken(validated.data.token);
    if (!tokens) {
      return { status: "redirect_to_forgot_password" };
    }

    if (tokens.expiry < new Date()) {
      console.log("expired_token");
      return { status: "expired_token" };
    }

    const email = tokens.email;
    await updateUserPassword(email, validated.data.password);
    await deletePasswordResetToken(validated.data.token);

    return { status: "success" };
  } catch (err) {
    console.log("Error while running verifyAndResetPassword action = ", err);
    Sentry.captureException(err);
    return { status: "failed" };
  }
}
