import Link from "next/link";
import { Logo } from "./brand";

export function Header() {
  return <header className="site-header"><div className="shell header-inner">
    <Logo/><nav aria-label="Main navigation"><Link href="/explore">Explore</Link><Link href="/categories">Categories</Link><Link href="/#about">About</Link></nav>
    <form action="/search" className="header-search"><label className="sr-only" htmlFor="header-q">Search questions</label><input id="header-q" name="q" placeholder="Search questions"/><button aria-label="Search">↗</button></form>
    <Link className="button small" href="/editorial">Editorial</Link>
  </div></header>;
}
