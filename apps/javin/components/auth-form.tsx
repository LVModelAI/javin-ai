import Form from "next/form";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { EyeOff } from "lucide-react";
import { Eye } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
  fieldErrors,
  emailNeeded = true,
  passwordNeeded = true,
  forgotPasswordNeeded = true,
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  emailNeeded?: boolean;
  passwordNeeded?: boolean;
  forgotPasswordNeeded?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
      {emailNeeded && (
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="email"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Email Address
          </Label>

          <Input
            id="email"
            name="email"
            className="bg-muted text-md md:text-sm"
            type="email"
            placeholder="user@acme.com"
            autoComplete="email"
            required
            autoFocus
            defaultValue={defaultEmail}
          />
          {fieldErrors?.email?.map((error, i) => (
            <p key={i} className="text-sm text-red-500 mt-1">
              {error}
            </p>
          ))}
        </div>
      )}

      {passwordNeeded && (
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="password"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Password
          </Label>

          <div className="relative">
            <Input
              id="password"
              name="password"
              className="bg-muted text-md md:text-sm pr-10"
              type={showPassword ? "text" : "password"}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {forgotPasswordNeeded && (
            <div className="flex w-full justify-end">
              <Link
                href="/forgotpassword"
                className="text-xs underline text-black dark:text-white hover:text-blue-600"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {fieldErrors?.password?.map((error, i) => (
            <p key={i} className="text-sm text-red-500 mt-1">
              {error}
            </p>
          ))}
        </div>
      )}

      {children}
    </Form>
  );
}
