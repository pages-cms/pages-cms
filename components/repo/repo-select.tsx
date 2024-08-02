"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/loader";
import { ChevronsUpDown, LockKeyhole } from "lucide-react";
  
export function RepoSelect({ accounts } : { accounts: any }) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounce(keyword, 500);
  const [searchResults, setSearchResults] = useState<any>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function fetchResults() {
      setSearching(true);
      try {
        const params = new URLSearchParams();
        params.set("keyword", debouncedKeyword);
        params.set("login", selectedAccount.login);
        params.set("type", selectedAccount.type);
        
        const response = await fetch(`/api/repos?${params.toString()}`);
        if (!response.ok) throw new Error(`Failed to search repos: ${response.status} ${response.statusText}`);

        const data: any = await response.json();

        if (data.status !== "success") throw new Error(data.message);

        setSearchResults(data.data);
      } catch (error: any) {
        console.error(error);
        // TODO: do we display an error?
      } finally {
        setSearching(false);
      }
    }

    fetchResults(); 
  }, [debouncedKeyword, selectedAccount]);

  return (
    <div className="flex flex-col gap-y-4">
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
        <div className="relative flex-1"> 
          <Input
            placeholder="Search repositories by name"
            className="pr-8"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {searching  &&
            <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2"/>
          }
        </div>
      </div>
      <main className="flex flex-col overflow-auto h-[20rem] gap-y-1 relative scrollbar">
        {searchResults.length > 0
          ? searchResults.map((result: any) => (
            <Link
              key={result.id}
              className="rounded-lg px-3 py-2 transition-all hover:bg-accent focus:bg-accent outline-none flex flex-col gap-y-1"
              href={`/${result.owner.login}/${result.name}/${encodeURIComponent(result.default_branch)}`}
            >
              <div className="inline-flex items-center gap-x-2">
                <span className="truncate font-medium leading-none">{result.name}</span>
                {result.private && <LockKeyhole className="h-3 w-3 opacity-50"/>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Updated {formatDistanceToNow(new Date(result.updated_at))} ago
                {result.description && <span className="truncate"> • {result.description}</span>}
              </div>
            </Link>
          ))
          : <div className="text-sm text-muted-foreground py-6 flex justify-center items-center flex-1">No matches found</div>
        }
      </main>
    </div>
  );
}