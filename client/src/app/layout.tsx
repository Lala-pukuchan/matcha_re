import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "./components/nav";
import Footer from "./components/footer";
import { UserProvider } from "../../context/context";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <UserProvider>
      <html lang="en">
        <body className={inter.className}>
          <Nav />
          {children}
          <Footer />
        </body>
      </html>
    </UserProvider>
  );
}
