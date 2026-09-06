import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "katex/dist/katex.min.css";
import PwaRegister from "./PwaRegister";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Samjho | AI that teaches, not just answers",
    template: "%s | Samjho",
  },
  description: "Samjho is an adaptive AI tutor that explains concepts clearly, in your language, until they click.",
  applicationName: "Samjho",
  authors: [{ name: "Vedang Soni" }],
  creator: "Vedang Soni",
  publisher: "Vedang Soni",
  keywords: ["AI tutor", "adaptive learning", "learning assistant", "Hinglish tutor", "Samjho"],
  alternates: { canonical: "/" },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Samjho",
    title: "Samjho | AI that teaches, not just answers",
    description: "An adaptive AI tutor that helps concepts click.",
    images: [{ url: "/logo.png", alt: "Samjho logo" }],
  },
  twitter: {
    card: "summary",
    title: "Samjho | AI that teaches, not just answers",
    description: "An adaptive AI tutor that helps concepts click.",
    images: ["/logo.png"],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f6960",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Samjho",
          url: siteUrl,
          description: "An adaptive AI tutor that teaches concepts clearly until they click.",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          author: { "@type": "Person", name: "Vedang Soni" },
        }) }} />
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
