import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans, Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { BootProvider } from "@/components/providers/BootProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { BrandingProvider } from "@/components/providers/BrandingProvider";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "School Management Platform",
  description: "Phase 0 Prototype — Clickable school ERP and LMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${inter.variable} h-full antialiased`} data-font="noto">
      <body className="min-h-full flex flex-col font-sans">
        <BootProvider>
          <ToastProvider>
            <SessionProvider>
              <BrandingProvider>{children}</BrandingProvider>
            </SessionProvider>
          </ToastProvider>
        </BootProvider>
      </body>
    </html>
  );
}
