import { redirect } from "next/navigation";
import { getAuth, getLucia, github } from "@/lib/auth";
import { cookies } from "next/headers";
import { OAuth2RequestError } from "arctic";
import { generateIdFromEntropySize } from "lucia";
import { encrypt } from "@/lib/crypto";
import { createDb } from "@/db";
import { userTable, githubUserTokenTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Handles GitHub OAuth authentication.
 * 
 * GET /api/auth/github
 * 
 * Requires GitHub OAuth code and state.
 */

export async function GET(request: Request): Promise<Response> {
	const { session } = await getAuth();
	const url = new URL(request.url);
	console.info("[auth] GitHub callback received", {
		pathname: url.pathname,
		hasExistingSession: Boolean(session),
		hasCode: Boolean(url.searchParams.get("code")),
		hasState: Boolean(url.searchParams.get("state"))
	});
  if (session) return redirect("/");

	const cookieStore = await cookies();
	const db = await createDb();
	const lucia = await getLucia();
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = cookieStore.get("github_oauth_state")?.value ?? null;
	if (!code || !state || !storedState || state !== storedState) {
		console.warn("[auth] GitHub callback validation failed", {
			hasCode: Boolean(code),
			hasState: Boolean(state),
			hasStoredState: Boolean(storedState),
			stateMatches: state === storedState
		});
		return new Response(null, {
			status: 400
		});
	}

	try {
    const token = await github.validateAuthorizationCode(code);
		console.info("[auth] GitHub authorization code validated", {
			hasAccessToken: Boolean(token.accessToken)
		});
		const githubUserResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
				Accept: "application/vnd.github+json",
				"User-Agent": process.env.GITHUB_APP_NAME ?? "pages-cms"
			}
		});
		console.info("[auth] GitHub user response", {
			status: githubUserResponse.status,
			ok: githubUserResponse.ok
		});
		if (!githubUserResponse.ok) {
			const errorText = await githubUserResponse.text();
			console.error("[auth] GitHub user fetch failed", {
				status: githubUserResponse.status,
				body: errorText
			});
			throw new Error(`GitHub user fetch failed: ${githubUserResponse.status}`);
		}
		const githubUser: GitHubUser = await githubUserResponse.json();
		console.info("[auth] GitHub user loaded", {
			githubId: githubUser.id,
			login: githubUser.login,
			hasEmail: Boolean(githubUser.email)
		});
    
    const { ciphertext, iv } = await encrypt(token.accessToken);

		const existingUser = await db.query.userTable.findFirst({
			where: eq(userTable.githubId, Number(githubUser.id))
		});
		console.info("[auth] existing GitHub user lookup", {
			found: Boolean(existingUser),
			userId: existingUser?.id ?? null
		});

		if (existingUser) {
			await db.update(githubUserTokenTable).set({
				ciphertext, iv
			}).where(
				eq(githubUserTokenTable.userId, existingUser.id)
			);
			const session = await lucia.createSession(existingUser.id as string, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			cookieStore.delete("github_oauth_state");
			console.info("[auth] existing user session created", {
				userId: existingUser.id,
				sessionCookieName: sessionCookie.name
			});
			return Response.redirect(new URL("/", request.url), 302);
		}

		const userId = generateIdFromEntropySize(10); // 16 characters long

		await db.insert(userTable).values({
			id: userId,
			githubId: Number(githubUser.id),
			githubUsername: githubUser.login,
			githubEmail: githubUser.email,
			githubName: githubUser.name
		});
    await db.insert(githubUserTokenTable).values({
			ciphertext,
			iv,
			userId
		});

		const session = await lucia.createSession(userId, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		cookieStore.delete("github_oauth_state");
		console.info("[auth] new user session created", {
			userId,
			sessionCookieName: sessionCookie.name
		});
		return Response.redirect(new URL("/", request.url), 302);
	} catch (e) {		
		console.error("GitHub auth error:", e);
		if (e instanceof OAuth2RequestError) {
			// invalid code
			return new Response(null, { status: 400 });
		}
		return new Response(null, { status: 500 });
	}
}

interface GitHubUser {
	id: string;
	login: string;
	email: string;
	name: string;
}
