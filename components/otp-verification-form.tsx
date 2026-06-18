"use client";

import type { FormEvent } from "react";
import { Loader } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type OtpVerificationFormProps = {
  busy: boolean;
  emailLabel: string;
  otp: string;
  pending: boolean;
  resendDisabled?: boolean;
  resendPending?: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
  resendLabel?: string;
  signInAnotherWayLabel?: string;
  onChange: (value: string) => void;
  onResend: () => void;
  onSignInAnotherWay?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function OtpVerificationForm({
  busy,
  emailLabel,
  otp,
  pending,
  resendDisabled,
  resendPending,
  title = "Verify your login",
  description,
  submitLabel = "Verify code",
  resendLabel = "Resend code",
  signInAnotherWayLabel = "Sign in another way",
  onChange,
  onResend,
  onSignInAnotherWay,
  onSubmit,
}: OtpVerificationFormProps) {
  const resolvedDescription = description || `Enter the 6-digit code sent to ${emailLabel}.`;

  return (
    <form className="flex w-full flex-col items-center gap-6" onSubmit={onSubmit}>
      <div className="space-y-2 text-center">
        <h1 className="text-lg font-medium tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {resolvedDescription}
        </p>
      </div>

      <InputOTP
        autoFocus
        disabled={pending}
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        value={otp}
        onChange={onChange}
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, index) => (
            <InputOTPSlot
              className="size-10 font-mono text-lg"
              index={index}
              key={index}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>

      <div className="w-full space-y-2">
        <Button className="w-full" disabled={busy || otp.length !== 6} type="submit">
          {submitLabel}
          {pending && <Loader className="size-4 animate-spin" />}
        </Button>
        <Button
          className="w-full"
          disabled={busy || resendDisabled}
          onClick={onResend}
          type="button"
          variant="ghost"
        >
          {resendLabel}
          {resendPending && <Loader className="size-4 animate-spin" />}
        </Button>
        {onSignInAnotherWay && (
          <Button
            className="w-full"
            disabled={busy}
            onClick={onSignInAnotherWay}
            type="button"
            variant="ghost"
          >
            {signInAnotherWayLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
