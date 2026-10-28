import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TEKEL • Bayi Yönetim",
  description: "Satış, stok, kasa ve veresiye yönetimi",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
