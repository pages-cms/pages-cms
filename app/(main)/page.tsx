import { getUser } from "@/lib/utils/user";
import { Octokit } from "octokit";
import { User } from "@/components/user";
import { ModeToggle } from "@/components/mode-toggle";
import { RepoPicker } from "@/components/repo/repo-picker";
import { About } from "@/components/about";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Page() {
	const { user, token } = await getUser();
	if (!user) return null;

	const octokit = new Octokit({ auth: token });
	const response = await octokit.rest.orgs.listForAuthenticatedUser();

	let accounts = [
		{
			login: user.githubUsername || '',
			type: "user"
		},
		...response.data.map((org: any) => ({
			login: org.login,
			type: "org"
		}))
	];

	return (
    <div className="flex flex-col h-screen">
			<main className="p-4 md:p-6 flex justify-center items-center flex-1">
				<Card className="w-full sm:max-w-[420px]">
					<CardHeader>
						<CardTitle>Select a repository</CardTitle>
					</CardHeader>
					<CardContent>
						<RepoPicker accounts={accounts}/>
					</CardContent>
				</Card>
			</main>
			<footer className="flex items-center gap-2 border-t px-2 py-2 lg:px-4 lg:py-3 mt-auto">
        <User className="mr-auto"/>
        <ModeToggle/>
        <About/>
      </footer>
		</div>
	);
}