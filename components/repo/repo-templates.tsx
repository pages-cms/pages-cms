"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import templates from "@/lib/utils/templates";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, ArrowUpRight } from "lucide-react";
  
export function RepoTemplates({ accounts } : { accounts: any }) {
  const router = useRouter();

  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [selectedRepo, setSelectedRepo] = useState(templates[0].repository);
  const [name, setName] = useState(templates[0].suggested);
  const [isValidName, setIsValidName] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const validateName = (name: string) => {
    if (!name || name.length > 100) return false;
    const validNameRegex = /^(?!\.|\.\.|.*\/|.*\/\.|.*\.\.|.*\/\.)(?!@)(?!.*[~^:?*[\]{}()<>#%&!\\$'"|;,])[^\x20\x7f]*[^\x20\x7f\.]$/;
    return validNameRegex.test(name);
  };

  useEffect(() => {
    setIsValidName(validateName(name));
  }, [name]);

  const handleCreate = async () => {
    if (!isValidName) {
      toast.error("Invalid repository name");
      return;
    }
    
    const [ template_owner, template_repo ] = selectedRepo.split('/');
    const owner = selectedAccount.login;
    const repo = name;

    const createPromise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/repos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_owner,
            template_repo,
            owner,
            name: repo,
          }),
        });
        if (!response.ok) throw new Error(`Failed to create the repo: ${response.status} ${response.statusText}`);
        const data: any = await response.json();
      
        if (data.status !== "success") throw new Error(data.message);

        await waitForRepoReady(owner, repo);

        router.push(`/${selectedAccount.login}/${name}`);

        resolve(data);
      } catch (error) {
        reject(error);
      }
    });

    toast.promise(createPromise, {
      loading: "Creating your repository",
      success: (response: any) => {
        return `New repository successfully created from template. You will be redirected.`;
      },
      error: (error: any) => error.message,
    });

    try {
      setIsCreating(true);
      await createPromise;
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const waitForRepoReady = async (owner: string, repo: string) => {
    let attempt = 0;

    while (attempt < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await fetch(`/api/${selectedAccount.login}/${name}/main/entries/${encodeURIComponent(".pages.yml")}?name=settings`);
      if (response.ok) {
        const data: any = await response.json();
        if (data.status === "success") return "success";
      }
      attempt++;
    }

    return "failure";
  };
  
  return (
    <div className="flex flex-col gap-y-4">
      <main className="flex flex-col overflow-auto h-[20rem] gap-y-1 relative scrollbar">
        {templates.map((template: any) => (
          <button
            key={template.repository}
            className={cn("rounded-lg px-3 py-2 transition-all hover:bg-accent focus:bg-accent outline-none flex gap-x-3 items-center", selectedRepo === template.repository ? "bg-accent" : "")}
            onClick={() => {
              setSelectedRepo(template.repository);
              setName(template.suggested);
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: template.icon }} className="w-10 h-10" />
            <div className="text-left flex flex-col gap-y-1">
              <div className="truncate font-medium leading-none">{template.name}</div>
              <div className="flex gap-x-1 items-center text-xs text-muted-foreground truncate">
                {template.repository}
                <a href={`https://github.com/${template.repository}`} target="_blank" className="opacity-50 hover:opacity-100">
                  <ArrowUpRight className="h-3 w-3"/>
                </a>
              </div>
            </div>
          </button>
        ))
        }
      </main>
      <div className="flex w-full max-w items-center gap-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="px-3">
              <img className="h-6 w-6 rounded mr-2" src={`https://github.com/${selectedAccount.login}.png`} alt={`${selectedAccount.login}'s avatar`}/>
              <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50"/>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {accounts.map((account: any) => (
              <DropdownMenuItem key={account.login} onSelect={() => setSelectedAccount(account)}>
                <img className="h-6 w-6 rounded mr-2" src={`https://github.com/${account.login}.png`} alt={`${account.login}'s avatar`}/>
                {account.login}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>      
        <Input
          placeholder="Name for your new repository"
          className="pr-8 flex-1"
          value={name}
          disabled={isCreating}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={isCreating || !isValidName}>Create</Button>
      </div>
    </div>
  );
}