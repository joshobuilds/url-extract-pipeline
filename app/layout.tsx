import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'URL Extract — Schema-driven web scraper',
  description: 'Paste a URL, define the fields you want, get JSON and Excel back. AI-powered scraping via Gemini 2.5 Flash.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
