import Form from "next/form";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { EyeOff } from "lucide-react";
import { Eye } from "lucide-react";
import {
  useMemo,
  useState,
  Children,
  isValidElement,
  cloneElement,
} from "react";
import Link from "next/link";
import { CheckedSquare, UncheckedSquare } from "@/components/icons";
import { SubmitButton } from "./submit-button";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
  fieldErrors,
  emailNeeded = true,
  passwordNeeded = true,
  forgotPasswordNeeded = true,
  showPasswordCriteria = false,
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
  showPasswordCriteria?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const passwordRules = useMemo(
    () => [
      {
        id: "len",
        label: "At least 8 characters",
        ok: password.length >= 8,
      },
      {
        id: "lower",
        label: "One lowercase letter",
        ok: /[a-z]/.test(password),
      },
      {
        id: "upper",
        label: "One uppercase letter",
        ok: /[A-Z]/.test(password),
      },
      { id: "num", label: "One number", ok: /[0-9]/.test(password) },
      {
        id: "special",
        label: "One special character (!@#$%^&*)",
        ok: /[!@#$%^&*]/.test(password),
      },
    ],
    [password]
  );

  const shouldDisableSubmit =
    passwordNeeded && showPasswordCriteria
      ? !passwordRules.every((r) => r.ok)
      : false;

  const enhancedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if ((child.type as unknown) === SubmitButton) {
      return cloneElement(child as React.ReactElement<any>, {
        disabled: shouldDisableSubmit,
      });
    }
    return child;
  });

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
              onChange={(e) => setPassword(e.target.value)}
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

          {showPasswordCriteria && (
            <div className="mt-2 rounded-md border bg-background/50 p-3 text-xs text-zinc-600 dark:text-zinc-400">
              <p className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
                Password must contain:
              </p>
              <ul className="space-y-1">
                {passwordRules.map((rule) => (
                  <li key={rule.id} className="flex items-center gap-2">
                    <span
                      className={rule.ok ? "text-emerald-500" : "text-zinc-400"}
                    >
                      {rule.ok ? (
                        <CheckedSquare size={14} />
                      ) : (
                        <UncheckedSquare size={14} />
                      )}
                    </span>
                    <span
                      className={
                        rule.ok ? "text-emerald-600 dark:text-emerald-400" : ""
                      }
                    >
                      {rule.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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

      {enhancedChildren}
    </Form>
  );
}
