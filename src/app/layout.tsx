
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from "@/components/ui/toaster";
import { DataSourceProvider } from '@/contexts/DataSourceContext'; // Added import

const inter = Inter({
  variable: '--font-geist-sans',
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
        <DataSourceProvider> {/* Added Provider */}
          <AppShell>{children}</AppShell>
        </DataSourceProvider>
        <Toaster />
      </body>
    </html>
  );
}
