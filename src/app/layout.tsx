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
  title: "MeetWith - Booking links for your Google Calendar",
  description: "Connect a Google Calendar, set the hours you are free, and share a link like meetwith.dev/yourname. In private beta, access by request.",
  keywords: ["scheduling", "calendar", "booking", "meetings", "appointment"],
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
