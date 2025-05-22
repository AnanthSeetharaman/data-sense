
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from "@/components/ui/toaster";
import { DataSourceProvider } from '@/contexts/DataSourceContext';
import { RegionProvider } from '@/contexts/RegionContext';
import { ThemeProvider } from 'next-themes';
import { FilterProvider } from '@/contexts/FilterContext'; // Added FilterProvider

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
    // Ensure no whitespace between <html> and <body> tags
    <html lang="en" className={inter.variable} suppressHydrationWarning><body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <DataSourceProvider>
            <RegionProvider>
              <FilterProvider> {/* Added FilterProvider wrapper */}
                <AppShell>{children}</AppShell>
              </FilterProvider>
            </RegionProvider>
          </DataSourceProvider>
          <Toaster />
        </ThemeProvider>
      </body></html>
  );
}
