"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Footer() {
  const pathname = usePathname();

  // Don't show footer on /chat/:id routes
  const hideFooter =
    pathname.startsWith("/chat/") ||
    pathname === "/login" ||
    pathname === "/register";
  if (hideFooter) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <AnimatePresence>
      {/* Only render the footer if it's not hidden */}
      {!hideFooter && (
        <motion.div
          key="footer" // Key to trigger exit animation
          initial={{ opacity: 0 }} // Fade-in from 0 opacity
          animate={{ opacity: 1 }} // Fade-in to 100% opacity
          exit={{ opacity: 0 }} // Fade-out to 0 opacity
          transition={{ duration: 0.5 }} // Duration of the fade effect
          className="flex flex-col gap-2 p-2 text-white fixed bottom-0 w-full z-40"
        >
          <div className="flex w-fit mx-auto justify-center gap-4 items-center text-sm text-zinc-600 bg-background border px-5 py-2 rounded-full border-zinc-700">
            <Link
              href="/"
              className={`hover:text-muted-foreground ${
                isActive("/") ? "text-javinOrange" : ""
              }`}
            >
              Home
            </Link>
            <Link
              href="/pricing"
              className={`hover:text-muted-foreground ${
                isActive("/pricing") ? "text-javinOrange" : ""
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className={`hover:text-muted-foreground ${
                isActive("/about") ? "text-javinOrange" : ""
              }`}
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className={`hover:text-muted-foreground ${
                isActive("/contact") ? "text-javinOrange" : ""
              }`}
            >
              Contact
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
