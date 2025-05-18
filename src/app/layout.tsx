
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Changed from GeistSans
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ // Changed from geistSans to inter, and use Inter font loader
  variable: '--font-geist-sans', // Kept variable name for CSS compatibility
  subsets: ['latin'],
});

// Note: GeistMono is not explicitly used in the new design files, but kept for now.
// const geistMono = GeistMono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'DataLens - Unified Data Catalog',
  description: 'Explore and manage your data assets with DataLens.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}> {/* Use the updated font variable */}
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
