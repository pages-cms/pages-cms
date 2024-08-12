import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { Providers } from "@/components/providers";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, user } = await getAuth();
  if (!session) return redirect("/sign-in");
  
	return (
    <Providers user={user}>
      {children}
    </Providers>
  );
}