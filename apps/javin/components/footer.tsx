"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Don't show footer on /chat/:id routes
  const hideFooter = pathname.startsWith("/chat/");

  if (hideFooter) return null;

  return (
    <div className="flex flex-col gap-2 p-4 text-white fixed bottom-0 w-full z-40 bg-background">
      <div className="flex justify-center gap-4 items-center text-sm text-zinc-600">
        <Link href="/" className="hover:text-muted-foreground">
          Home
        </Link>
        <Link href="/pricing" className="hover:text-muted-foreground">
          Pricing
        </Link>
        <Link href="/about" className="hover:text-muted-foreground">
          About Us
        </Link>
        <Link href="/contact" className="hover:text-muted-foreground">
          Contact
        </Link>
      </div>
    </div>
  );
}
