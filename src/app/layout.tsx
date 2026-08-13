import type { Metadata } from "next";
import { Geist } from "next/font/google";
// Design System CSS registered BEFORE globals.css so `tokens.css` +
// `globals.css` can override any DS defaults that conflict with the app's
// token model. Loose CSS cascade — later wins.
import "@navanta-ai/design-system/styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shaw · Manufacturing agents",
  description:
    "One engine across every plant — the agents raise what needs a person, and resolve the rest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
