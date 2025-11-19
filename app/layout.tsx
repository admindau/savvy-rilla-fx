import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savvy Rilla FX API",
  description: "Internal FX brain for SSP and beyond by Savvy Rilla Technologies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
