import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { StoreProvider } from "@/store/provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Survivor Quest Admin Panel",
  description: "Panel administratora SurvivorQuest",
  icons: {
    icon: [{ url: "/admin/admin_icon_sq.png", type: "image/png" }],
    shortcut: [{ url: "/admin/admin_icon_sq.png", type: "image/png" }],
    apple: [{ url: "/admin/apple-touch-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
