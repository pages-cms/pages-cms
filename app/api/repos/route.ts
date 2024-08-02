import { type NextRequest } from "next/server";
import { Octokit } from "octokit";
import { getUser } from "@/lib/utils/user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword");
    const login = searchParams.get("login");
    const type = searchParams.get("type");
    
    const { token } = await getUser();
    const octokit = new Octokit({ auth: token });
    
    const query = `${keyword} in:name ${type}:${login} fork:true`;
    const response = await octokit.rest.search.repos({
      q: query,
      sort: "updated",
      order: "desc",
    });

    return Response.json({
      status: "success",
      data: response.data.items,
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
}

export async function POST(request: Request) {
  try {
    const data: any = await request.json();
    const { template_owner, template_repo, owner, name } = data;

    if (!template_owner || !template_repo || !owner || !name) throw new Error("Missing required fields");
    
    const { token } = await getUser();
    const octokit = new Octokit({ auth: token });

    const response = await octokit.rest.repos.createUsingTemplate({
      template_owner,
      template_repo,
      owner,
      name,
    });

    return Response.json({
      status: "success",
      data: {
        repo: response.data.full_name,
        template_repo: response.data.template_repository?.full_name,
      },
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
};