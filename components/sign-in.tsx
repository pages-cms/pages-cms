"use client";

import { handleGithubSignIn, handleEmailSignIn } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
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
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <hr className="border-t w-full"/>
          </div>
          <div className="relative flex justify-center items-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <form action={handleEmailSignIn} className="space-y-2">
          <Input placeholder="name@example.com" />
          <SubmitButton type="submit" className="w-full">
            Sign in with email
          </SubmitButton>
        </form>
        <p className="text-sm text-muted-foreground">By signing in, you agree to our <a className="underline hover:decoration-muted-foreground/50 text-offset-2" href="https://pagescms.org/terms/" target="_blank">Terms of Service</a> and <a className="underline hover:decoration-muted-foreground/50 text-offset-2" href="https://pagescms.org/privacy/" target="_blank">Privacy Policy</a>.</p>
      </div>
    </div>
  );
}