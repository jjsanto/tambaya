import Link from "next/link";
import { Logo } from "./brand";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const user = await getCurrentUser();
  return <header className="site-header"><div className="shell header-inner">
    <Logo/><nav aria-label="Main navigation"><Link href="/explore">Explore</Link><Link href="/categories">Categories</Link><Link href="/publish">Publish</Link><Link href="/#about">About</Link><Link href="/editorial">Editorial</Link></nav>
    <form action="/search" className="header-search"><label className="sr-only" htmlFor="header-q">Search questions</label><input id="header-q" name="q" placeholder="Search questions"/><button aria-label="Search">↗</button></form>
    {user ? <><Link className="text-link" href="/account/submissions">Submissions</Link><Link className="button small" href="/account">{user.username}</Link></> : <Link className="button small" href="/login">Log in</Link>}
  </div></header>;
}
