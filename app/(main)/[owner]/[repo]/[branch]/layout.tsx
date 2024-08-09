import { getUser } from "@/lib/utils/user";
import { getConfig, saveConfig, updateConfig } from "@/lib/utils/config";
import { Octokit } from "octokit";
import { configVersion, parseConfig, normalizeConfig } from "@/lib/config";
import { ConfigProvider } from "@/contexts/config-context";
import { RepoLayout } from "@/components/repo/repo-layout";
import { EmptyCreate } from "@/components/empty-create";
import { Message } from "@/components/message";

export default async function Layout({
  children,
  params: { owner, repo, branch },
}: {
  children: React.ReactNode;
  params: { owner: string; repo: string; branch: string; };
}) {
  const decodedBranch = decodeURIComponent(branch);
  const { token } = await getUser();
  let config = {
    owner: owner.toLowerCase(),
    repo: repo.toLowerCase(),
    branch: decodedBranch,
    sha: "",
    version: "",
    object: {}
  }
  
  let errorMessage = null;
  
  // We try to retrieve the config file (.pages.yml)
  try {
    const octokit = new Octokit({ auth: token });
    const response = await octokit.rest.repos.getContent({
      owner: owner,
      repo: repo,
      path: ".pages.yml",
      ref: decodedBranch,
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (Array.isArray(response.data)) {
      throw new Error("Expected a file but found a directory");
    } else if (response.data.type !== "file") {
      throw new Error("Invalid response type");
    }

    const savedConfig = await getConfig(owner, repo, decodedBranch);

    // TODO: make it resilient to config not found (e.g. DB down)

    if (savedConfig && savedConfig.sha === response.data.sha && savedConfig.version === configVersion) {
      // Config in DB and up-to-date
      config = savedConfig;
    } else {
      const configFile = Buffer.from(response.data.content, "base64").toString();
      const parsedConfig = parseConfig(configFile);
      const configObject = normalizeConfig(parsedConfig.document.toJSON());
      
      config.sha = response.data.sha;
      config.version = configVersion ?? "0.0";
      config.object = configObject;

      if (!savedConfig) {
        // Config not in DB
        await saveConfig(config);
      } else {
        // Config in DB but outdated (based on sha or version)
        await updateConfig(config);
      }
    }
  } catch (error: any) {
    if (error.status === 404) {
      if (error.response.data.message === "Not Found") {
        errorMessage = (
          <Message
            title="No configuration file"
            description={`You need to add a ".pages.yml" file to this branch.`}
            className="absolute inset-0"
          >
            <EmptyCreate type="settings">Create a configuration file</EmptyCreate>
          </Message>
        );
      } else {
        // We assume the branch is not valid
        errorMessage = (
          <Message
            title="Invalid branch"
            description={`The branch "${decodedBranch}" doesn't exist. It may have been removed or renamed.`}
            className="absolute inset-0"
            href={`/${owner}/${repo}`}
            cta={"Switch to the default branch"}
          />
        );
      }
      // TODO: catch all error (it's not always just one of these two)
    }
  }

  return (
    <ConfigProvider value={config}>
      <RepoLayout>{errorMessage ? errorMessage : children}</RepoLayout>
    </ConfigProvider>
  );
}