import './globals.css';
import { SessionProvider } from 'next-auth/react';

export const metadata = {
  title: 'AMT Consignor Portal',
  description: 'Secure login via Google',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
