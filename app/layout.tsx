import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PFP 2026 Workplan Monitor",
  description:
    "Track PFP 2026 workplan activities, progress, deadlines, and follow-up needs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
