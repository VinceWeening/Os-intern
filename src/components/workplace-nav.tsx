"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The shared layout stays mounted while navigating, so the active item
// follows the URL instead of a prop from each page.
export function NavLink({
  href,
  match,
  current,
  children,
}: {
  href: string;
  match: string;
  current?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCurrent = current ?? pathname.startsWith(match);
  return (
    <Link href={href} aria-current={isCurrent ? "page" : undefined}>
      {children}
    </Link>
  );
}

