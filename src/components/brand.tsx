import Link from "next/link";
import Image from "next/image";

export function NetworkMark({ size = 38 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="mark">
    <path d="M11 10 26 8m0 0 4 12m0 0-12 11M11 10l7 21" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="11" cy="10" r="4"/><circle cx="26" cy="8" r="4"/><circle cx="30" cy="20" r="4"/><circle cx="18" cy="31" r="4"/>
  </svg>;
}

export function Logo() {
  return <Link className="logo" href="/" aria-label="Tambaya home"><NetworkMark/><span>Tambaya<small>Questions worth asking.</small></span></Link>;
}

export function MeerkatExplorer() {
  return <Image className="meerkat" src="/images/tambaya-meerkat-hero-v2.webp" width={1536} height={1024} priority sizes="(max-width: 900px) 100vw, 62vw" alt="A curious meerkat observes a network of connected questions"/>;
}
