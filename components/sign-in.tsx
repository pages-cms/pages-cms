"use client";

import { handleGithubSignIn } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import{ Github } from "lucide-react";


export function SignIn() {
  return (
    <div className="h-screen p-4 md:p-6 flex justify-center items-center">
      <div className="sm:max-w-[340px] w-full text-center space-y-6">
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight mb-6">Sign in to Pages CMS</h1>
        <form action={handleGithubSignIn} className="space-y-2">
          <SubmitButton type="submit" className="w-full">
            <Github className="h-4 w-4 mr-2" />
            Sign in with GitHub
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}