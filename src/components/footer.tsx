import Link from "next/link";
import { NetworkMark } from "./brand";

export function Footer() {
  return (
    <footer>
      <div className="shell footer-inner">
        <div>
          <NetworkMark />
          <strong>Tambaya</strong>
          <p>Questions worth asking.</p>
        </div>
        <p className="footer-rule">
          Public Tambaya publishes context, history, and connections.
          <br />
          <strong>Never answers.</strong>
        </p>
        <nav aria-label="Footer navigation">
          <Link href="/explore">Explore</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/developers/api">Developers / API</Link>
        </nav>
      </div>
    </footer>
  );
}
