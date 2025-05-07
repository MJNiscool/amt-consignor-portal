import './globals.css';
import ClientProviders from '@/components/ClientProviders';

export const metadata = {
  title: 'AMT Consignor Portal',
  description: 'Secure login via Google',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
