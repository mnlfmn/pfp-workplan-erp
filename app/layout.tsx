import type { Metadata } from "next";

import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from "@/app/chatgpt-auth";
import { getAppSessionForIdentity } from "@/lib/app-auth";

import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PFP 2026 Workplan Monitor",
  description:
    "Track PFP 2026 workplan activities, progress, deadlines, and follow-up needs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getChatGPTUser();
  let session = null;
  if (user) {
    try {
      session = await getAppSessionForIdentity(
        {
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
        },
        { localPreview: user.userId === "local-preview-admin" },
      );
    } catch (error) {
      console.error("Unable to check PFP workplan access", error);
    }
  }

  return (
    <html lang="en">
      <body className="antialiased">
        {!user ? (
          <main className="grid min-h-screen place-items-center bg-[#eef3ed] px-5 text-[#14241b]">
            <section className="w-full max-w-md rounded-3xl border border-[#d4ded4] bg-white p-8 text-center shadow-[0_24px_70px_rgba(20,36,27,0.12)]">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#0c3b2d] font-black text-[#dbf081]">
                PFP
              </div>
              <h1 className="mt-5 text-2xl font-black">PFP Workplan Monitor</h1>
              <p className="mt-2 text-sm leading-6 text-[#66776d]">
                Sign in with the email address invited by a workplan administrator.
              </p>
              <a
                href={chatGPTSignInPath("/")}
                target="_top"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#0c3b2d] px-5 font-bold text-white hover:bg-[#174d3a]"
              >
                Sign in with ChatGPT
              </a>
            </section>
          </main>
        ) : !session ? (
          <main className="grid min-h-screen place-items-center bg-[#eef3ed] px-5 text-[#14241b]">
            <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(20,36,27,0.12)]">
              <h1 className="text-2xl font-black">Invitation required</h1>
              <p className="mt-3 text-sm leading-6 text-[#66776d]">
                {user.email} is signed in, but this email is not on the PFP team list. Ask an administrator to add it in the Team menu.
              </p>
              <a
                href={chatGPTSignOutPath("/")}
                target="_top"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-[#cbd6cc] px-5 font-bold hover:bg-[#f5f8f4]"
              >
                Sign in with another email
              </a>
            </section>
          </main>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
