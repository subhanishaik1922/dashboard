import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL('https://subhani-portfolio.dev'),
  title: 'Mahaboob Subhani Shaik | DevOps Engineer | Cloud & Infrastructure',
  description: 'Portfolio of Mahaboob Subhani Shaik — DevOps Engineer specializing in AWS, Azure, CI/CD Pipelines, Kubernetes, Terraform, and GitOps Automation.',
  keywords: [
    'Mahaboob Subhani Shaik',
    'Shaik Mahaboob Subhani',
    'Subhani',
    'DevOps Engineer',
    'Cloud Infrastructure',
    'AWS',
    'Azure',
    'Kubernetes',
    'Docker',
    'Terraform',
    'Ansible',
    'Jenkins',
    'CI/CD Pipelines',
    'GitOps',
    'VFSTR University',
  ],
  authors: [{ name: 'Mahaboob Subhani Shaik' }],
  icons: {
    icon: '/avatar.png',
    apple: '/avatar.png',
  },
  openGraph: {
    title: 'Mahaboob Subhani Shaik | DevOps Engineer',
    description: 'DevOps Engineer bridging the gap between automated multi-cloud infrastructure, CI/CD pipelines, and high-availability container orchestration.',
    url: 'https://subhani-portfolio.dev',
    siteName: 'Mahaboob Subhani Shaik Portfolio',
    images: [
      {
        url: '/avatar.png',
        width: 1200,
        height: 675,
        alt: 'Mahaboob Subhani Shaik',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
}

const themeBootstrap = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var theme = saved === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.classList.remove('dark');
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} data-theme="light">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
