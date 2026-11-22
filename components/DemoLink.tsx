"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { isDemo } from "@/lib/flow";

// Carries ?demo=1 across pages without making the home page dynamic.
export default function DemoLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const demo = useSyncExternalStore(() => () => {}, isDemo, () => false);
  return (
    <Link href={demo ? `${href}?demo=1` : href} className={className}>
      {children}
    </Link>
  );
}
