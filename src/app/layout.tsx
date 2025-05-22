
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from "@/components/ui/toaster";
import { DataSourceProvider } from '@/contexts/DataSourceContext';
import { RegionProvider } from '@/contexts/RegionContext'; // Added import

const inter = Inter({
  variable: '--font-geist-sans', // Keep existing variable name
  subsets: ['latin'],
});

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
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <DataSourceProvider>
          <RegionProvider> {/* Added RegionProvider */}
            <AppShell>{children}</AppShell>
          </RegionProvider>
        </DataSourceProvider>
        <Toaster />
      </body>
    </html>
  );
}
