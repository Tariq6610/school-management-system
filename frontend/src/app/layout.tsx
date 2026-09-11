import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { BootProvider } from "@/components/providers/BootProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SessionProvider } from "@/components/providers/SessionProvider";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <BootProvider>
          <ToastProvider>
            <SessionProvider>{children}</SessionProvider>
          </ToastProvider>
        </BootProvider>
      </body>
    </html>
  );
}
