import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xinference — Run any model with total control',
  description:
    'Effortlessly deploy any or your own models with one command. Xinference empowers you to unleash the full potential of AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
