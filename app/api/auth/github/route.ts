import { github, lucia } from "@/lib/auth";
import { cookies } from "next/headers";
import { OAuth2RequestError } from "arctic";
import { generateIdFromEntropySize } from "lucia";
import { encrypt } from "@/lib/crypto";
import { db } from "@/db";
import { users, tokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = cookies().get("github_oauth_state")?.value ?? null;
	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, {
			status: 400
		});
	}

	try {
    const token = await github.validateAuthorizationCode(code);
		const githubUserResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${token.accessToken}`
			}
		});
		const githubUser: GitHubUser = await githubUserResponse.json();
    
    const { ciphertext, iv } = await encrypt(token.accessToken);

		const existingUser = await db.query.users.findFirst({ where: eq(users.githubId, Number(githubUser.id)) });

		if (existingUser) {
			await db.update(tokens).set({ ciphertext, iv }).where(eq(tokens.userId, existingUser.id));
			const session = await lucia.createSession(existingUser.id as string, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			return new Response(null, {
				status: 302,
				headers: {
					Location: "/"
				}
			});
		}

		const userId = generateIdFromEntropySize(10); // 16 characters long

		await db.insert(users).values({
			id: userId,
			githubId: Number(githubUser.id),
			githubUsername: githubUser.login,
			githubEmail: githubUser.email,
			githubName: githubUser.name
		});
    await db.insert(tokens).values({ ciphertext, iv, userId });

		const session = await lucia.createSession(userId, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/"
			}
		});
	} catch (e) {		
    // the specific error message depends on the provider
		if (e instanceof OAuth2RequestError) {
			// invalid code
			return new Response(null, {
				status: 400
			});
		}
		return new Response(null, {
			status: 500
		});
	}
}

interface GitHubUser {
	id: string;
	login: string;
	email: string;
	name: string;
}