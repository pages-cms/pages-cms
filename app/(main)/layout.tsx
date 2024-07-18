import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { User } from "@/types/user";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuth();
  const user = auth.user as User | null;
  const session = auth.session;
  
  if (!session) {
    return redirect("/sign-in");
  }
  
	return (
    <Providers user={user}>
      {children}
    </Providers>
  );
}