import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header"; // Import the new Header component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Findexus",
  description: "Financial Statement Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900`}>
        <Header /> {/* Add the Header here */}
        <main>{children}</main>
      </body>
    </html>
  );
}
