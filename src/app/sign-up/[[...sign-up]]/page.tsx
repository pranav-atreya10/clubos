import { redirect } from "next/navigation";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/clerk";
import { Logo } from "@/components/app/logo";

export default function Page() {
  if (!clerkEnabled) redirect("/app");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-4 py-16">
      <Link href="/"><Logo /></Link>
      <SignUp />
    </div>
  );
}
