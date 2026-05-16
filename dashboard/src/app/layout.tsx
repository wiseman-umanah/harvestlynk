import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Harvestlynk Dashboard",
  description: "Manage your farm, orders, and wallet on Harvestlynk",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${workSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
