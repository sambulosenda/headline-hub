"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

type Props = {
  href: string;
  also?: string[];
  className: string;
  activeClassName: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className">;

/**
 * A header link that knows when it's the current page. `also` lists path prefixes that count too.
 * The header is part of the static shell, so on dynamic routes the plain link renders first and the
 * highlight arrives with the pathname.
 */
export function NavLink({ also, activeClassName, ...props }: Props) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <ActiveNavLink also={also} activeClassName={activeClassName} {...props} />
    </Suspense>
  );
}

function ActiveNavLink({ href, also = [], className, activeClassName, ...rest }: Props) {
  const pathname = usePathname();
  const active = pathname === href || also.some((prefix) => pathname.startsWith(prefix));
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`${className} ${active ? activeClassName : ""}`} {...rest} />
  );
}
