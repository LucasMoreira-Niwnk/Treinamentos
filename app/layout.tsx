import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Segurança em Foco · Casa & Terra",
  description: "Portal de treinamentos de segurança da Casa & Terra.",
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
  <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
