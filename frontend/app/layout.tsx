import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoom - Video Conferencing, Web Events, Live Chat",
  description: "Zoom Video Conferencing Web Application",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-[#0E71EB] selection:text-white">
        {children}
      </body>
    </html>
  );
}
