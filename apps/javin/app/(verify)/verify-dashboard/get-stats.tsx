"use client";

import VerifyPageHeader from "@/app/(verify)/verify/verify-header";
import { InstallPrompt } from "@/components/install-prompt";
import React, { useEffect, useState } from "react";
import { User } from "next-auth";
import { CheckCheckIcon, RefreshCcw } from "lucide-react";
import { CheckCircleFillIcon } from "@/components/icons";

export default function GetStats({ user }: { user?: User }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleGetCount() {
    setLoading(true);
    try {
      const res = await fetch("/api/get-total-hash-count", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      console.log("data.count", data.count);

      setResult(data.count); // Access the count value inside the first element
    } catch (err) {
      setResult({ success: false, error: "Verification failed. Try again." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleGetCount(); // Fetch data initially

    // Set up the interval to fetch every 10 seconds (10000 ms)
    const intervalId = setInterval(() => {
      handleGetCount();
    }, 10000); // Fetch every 10 seconds

    // Clean up the interval when the component is unmounted
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array to run only once on mount

  return (
    <div className="min-h-screen w-full bg-background">
      <InstallPrompt />
      <VerifyPageHeader user={user} />

      <div className="p-5 flex justify-between items-center">
        <div className="text-lg border px-5 py-6 rounded-lg">
          {result !== null ? (
            <div className="flex gap-3 items-center">
              <p>
                <span className="font-bold">{result}</span> responses verfied
                on-chain{" "}
              </p>
              <p className="text-green-600">
                <CheckCircleFillIcon size={24} />
              </p>
            </div>
          ) : (
            <p>{result?.error || "No data available"}</p>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleGetCount}
          disabled={loading} // Disable button while loading
          className="relative flex items-center justify-center p-2 border text-white rounded-lg disabled:opacity-50"
        >
          {loading ? (
            <RefreshCcw className="animate-spin w-6 h-6 text-white" />
          ) : (
            <RefreshCcw className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
