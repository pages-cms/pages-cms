import { cache } from "react";
import { Session, User, Lucia } from "lucia";
import { DrizzleSQLiteAdapter, SQLiteSessionTable, SQLiteUserTable } from "@lucia-auth/adapter-drizzle";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { GitHub } from "arctic";
import { cookies } from "next/headers";

// TODO: why do I have to cast sessions and users???
const adapter = new DrizzleSQLiteAdapter(db, sessions as unknown as SQLiteSessionTable, users as unknown as SQLiteUserTable);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		expires: false,
		attributes: {
			secure: process.env.NODE_ENV === "production"
		}
	},
	getUserAttributes: (attributes) => {
		return {
			githubId: attributes.githubId,
			githubUsername: attributes.githubUsername,
			githubEmail: attributes.githubEmail,
			githubName: attributes.githubName
		};
	}
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

export interface DatabaseUserAttributes {
	id: string;
	githubId: number;
	githubUsername: string;
	githubEmail: string;
	githubName: string;
}

export const github = new GitHub(process.env.GITHUB_CLIENT_ID!, process.env.GITHUB_CLIENT_SECRET!);

export const getAuth = cache(
	async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
		const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
		if (!sessionId) {
			return {
				user: null,
				session: null
			};
		}

		const result = await lucia.validateSession(sessionId);
		// next.js throws when you attempt to set cookie when rendering page
		try {
			if (result.session && result.session.fresh) {
				const sessionCookie = lucia.createSessionCookie(result.session.id);
				cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			}
			if (!result.session) {
				const sessionCookie = lucia.createBlankSessionCookie();
				cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			}
		} catch {}
		return result;
	}
);