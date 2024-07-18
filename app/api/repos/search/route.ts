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