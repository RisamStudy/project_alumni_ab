import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "../components/ui/toaster";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Portal Alumni Al Bahjah",
  description: "Wadah resmi untuk menjalin silaturahmi antar alumni Pondok Pesantren Al Bahjah",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} min-h-screen overflow-x-hidden font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
