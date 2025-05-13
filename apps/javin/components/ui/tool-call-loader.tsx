import React from "react";
import cx from "classnames";
import { LucideLoader2, CheckCircle2, XCircle } from "lucide-react";

export default function ToolCallLoader({
  agentResponse,
  loadingMessage,
  isFinished,
  errorMessage,
}: {
  agentResponse?: string;
  loadingMessage?: string;
  isFinished?: boolean;
  errorMessage?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        {!agentResponse && !isFinished && !errorMessage && (
          <LucideLoader2
            className="animate-spin dark:text-gray-400 text-gray-600"
            size={24}
          />
        )}

        {isFinished && !errorMessage && (
          <CheckCircle2 className="text-green-500" size={24} />
        )}

        {errorMessage && <XCircle className="text-red-500" size={24} />}

        <div
          className={cx("font-medium", {
            "text-gray-600 dark:text-gray-400": !errorMessage && !isFinished,
            "text-green-600 dark:text-green-400": isFinished && !errorMessage,
            "text-red-600 dark:text-red-400": errorMessage,
          })}
        >
          {loadingMessage}
        </div>
      </div>
    </div>
  );
}
