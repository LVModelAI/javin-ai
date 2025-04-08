"use client";
import { getWithExpiry, setWithExpiry } from "@javin/shared/lib/utils/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  text: string;
};

function TextStrip() {
  const [show, setShow] = useState(false);

  const hideStrip = () => {
    const time = 24 * 60 * 60 * 1000; // 24 hour
    // const time = 10 * 1000; // 10 seconds
    setWithExpiry("RewardSystemNotifDismissed", "true", time);
    setShow(false);
  };

  useEffect(() => {
    const isDismissed = getWithExpiry("RewardSystemNotifDismissed");
    if (isDismissed) {
      setShow(false);
    } else {
      setShow(true);
      setTimeout(() => {
        hideStrip();
      }, 10000);
    }
  }, []);

  return (
    <>
      {show && (
        <div className="z-50 w-full flex justify-center items-center bg-javinOrange rounded-b-md py-1 px-3">
          <div className="flex flex-col sm:flex-row items-center">
            <span className=" font-semibold text-sm md:text-base text-center">
              A new rewards system is arriving
            </span>
            <span className=" font-semibold text-sm md:text-base text-center">
              {" "}
              - Stay Tuned
            </span>
          </div>
          <button className="ml-5 hover:scale-110" onClick={hideStrip}>
            <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
          </button>
        </div>
      )}
    </>
  );
}

export default TextStrip;
