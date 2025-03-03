import { motion } from "framer-motion";
import Link from "next/link";

import { MessageIcon, VercelIcon } from "./icons";

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-2 leading-relaxed text-center max-w-2xl">
        <p className="flex flex-row justify-center gap-4 items-center text-5xl font-semibold">
          Javin.ai
        </p>
        <p className="text-lg text-muted-foreground">
          A focused, no-nonsense AI search engine for crypto and blockchain.
        </p>
      </div>
    </motion.div>
  );
};
