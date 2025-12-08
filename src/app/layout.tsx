import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { FeedbackButton } from "@/components/FeedbackButton";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "MeetWith - Free AI-Powered Scheduling",
  description: "Free scheduling made simple. Share your link, let others book time with you. No more back-and-forth emails.",
  keywords: ["scheduling", "calendar", "booking", "meetings", "free", "appointment"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
        <Providers>
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
          <FeedbackButton />
        </Providers>
      </body>
    </html>
  );
}
