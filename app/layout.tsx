import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeterBuy",
  description:
    "A personal desk that buys one ranked Telegraph fact on Sepolia, then turns it into a briefing, a send-or-hold gate, or a note.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=chillax@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {children}
      </body>
    </html>
  );
}
