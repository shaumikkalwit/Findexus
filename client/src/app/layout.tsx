import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Findexus',
  description: 'Financial Statement Analysis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* This new body structure uses flexbox to make the footer
        stick to the bottom of the page, even on short pages.
      */}
      <body className={`min-h-screen bg-gray-900 font-sans text-gray-200 antialiased flex flex-col ${inter.variable}`}>
        <Providers>
          <Header />
          {/* The 'flex-grow' class makes the main content expand to fill available space */}
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

