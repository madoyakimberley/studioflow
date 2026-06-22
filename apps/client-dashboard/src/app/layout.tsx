import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import AuthProvider from "@/components/AuthProvider"; // ✨ THIS IS THE NEW IMPORT
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudioFlow",
  description: "Reduce Repetitive Work",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-theme-bg text-theme-text transition-colors duration-300">
        {/* ✨ WRAP EVERYTHING IN AUTHPROVIDER */}
        <AuthProvider>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="active-systems-light"
            enableSystem={true}
            themes={[
              "active-systems-light",
              "night-matrix",
              "aetheric-foundry",
              "aetheric-foundry-light",
            ]}
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
