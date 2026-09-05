import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Samjho | AI that teaches, not just answers",
  description: "An adaptive AI tutor that helps concepts click.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-0C4FBTH604" strategy="afterInteractive" />
        <Script id="google-analytics">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-0C4FBTH604');`}
        </Script>
      </body>
    </html>
  );
}
