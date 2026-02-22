import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERIDOC — AI Content Detector',
  description: 'Forensic analysis of AI-generated content in documents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
