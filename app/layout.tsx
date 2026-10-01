import type { Metadata } from "next";
import "./globals.css";
import "./date-range.css";

export const metadata: Metadata = {
  title: "Agrícola Marasca | Vendas e rentabilidade",
  description: "Painel privado de vendas, custos e rentabilidade da Agrícola Marasca.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
