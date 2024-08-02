import { getUser } from "@/lib/utils/user";
import { Octokit } from "octokit";
import { User } from "@/components/user";
import { ModeToggle } from "@/components/mode-toggle";
import { RepoSelect } from "@/components/repo/repo-select";
import { RepoTemplates } from "@/components/repo/repo-templates";
import { About } from "@/components/about";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from "@/components/ui/tabs";

export default async function Page() {
	// TODO: is it the best place to handle that?
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
				<Tabs defaultValue="account" className="w-full max-w-[400px]">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="account">Repositories</TabsTrigger>
						<TabsTrigger value="password">Templates</TabsTrigger>
					</TabsList>
					<TabsContent value="account">
						<Card className="w-full sm:max-w-[420px]">
							<CardHeader>
								<CardTitle>Select a repository</CardTitle>
							</CardHeader>
							<CardContent>
								<RepoSelect accounts={accounts}/>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="password">
						<Card className="w-full sm:max-w-[420px]">
							<CardHeader>
								<CardTitle>Create from a template</CardTitle>
							</CardHeader>
							<CardContent>
								<RepoTemplates accounts={accounts}/>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</main>
			<footer className="flex items-center gap-2 border-t px-2 py-2 lg:px-4 lg:py-3 mt-auto">
        <User className="mr-auto"/>
        <ModeToggle/>
        <About/>
      </footer>
		</div>
	);
}