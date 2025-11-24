import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Talentwithus Blogging Platform",
  description: "Tenant Blogging Platform by Talentwithus",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Place any custom head tags or meta here */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
       
        {children}
      </body>
    </html>
  );
}