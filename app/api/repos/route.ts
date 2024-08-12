import { type NextRequest } from "next/server";
import { Octokit } from "octokit";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user.id);
    if (!token) throw new Error("Token not found");

    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword");
    const login = searchParams.get("login");
    const type = searchParams.get("type");

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
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user.id);
    if (!token) throw new Error("GitHub token not found");
    
    const data: any = await request.json();
    const { template_owner, template_repo, owner, name } = data;

    if (!template_owner || !template_repo || !owner || !name) throw new Error("Missing required fields");

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