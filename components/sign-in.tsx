"use client";

import { SubmitButton } from "@/components/submit-button";
import{ Github } from "lucide-react";
import { handleSignIn } from "@/lib/actions/auth";

export function SignIn() {
  return (
    <div className="h-screen p-4 md:p-6 flex justify-center items-center">
      <div className="sm:max-w-[340px] text-center">
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight mb-2">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in with your GitHub account to access your repositories.</p>
        <form action={handleSignIn} className="grid gap-4">
          <SubmitButton type="submit" className="w-full">
            <Github className="h-4 w-4 mr-2" />
            Sign in with GitHub
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}