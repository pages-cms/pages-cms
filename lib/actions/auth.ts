"use server";

import { lucia, getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { generateState } from "arctic";
import { github } from "@/lib/auth";
import { cookies } from "next/headers";

const handleSignIn = async () => {
  const state = generateState();
	const url = await github.createAuthorizationURL(state, { scopes: ["repo", "user:email"] });

	cookies().set("github_oauth_state", state, {
		path: "/",
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: "lax"
	});

	return redirect(url.href);
}

const handleSignOut = async () => {
	const { session } = await getAuth();
	if (!session) {
		return {
			error: "Unauthorized"
		};
	}
	
	await lucia.invalidateSession(session.id);
	
	const sessionCookie = lucia.createBlankSessionCookie();
	cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
	
	return redirect("/");
}

export { handleSignIn, handleSignOut };