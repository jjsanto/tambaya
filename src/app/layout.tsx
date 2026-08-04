import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
import "./rich-editor.css";
import "./home-hero.css";

export const metadata: Metadata = { title: { default: "Tambaya — Questions worth asking", template: "%s — Tambaya" }, description: "Discover, connect, and explore questions worth asking. No answers—only richer questions." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Header/><main>{children}</main><Footer/></body></html>; }
