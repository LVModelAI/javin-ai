import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/hover-card";
import { cn, SearchGroup } from "@/lib/utils";
import {motion} from "framer-motion";
import Image from "next/image";

interface ToolbarButtonProps {
  group: SearchGroup;
  isSelected: boolean;
  onClick: () => void;
}

export const ToolbarButton = ({ group, isSelected, onClick }: ToolbarButtonProps) => {
  const Icon = group.icon;
  const iconImg = group.img;
  return (
    <HoverCard openDelay={100} closeDelay={50}>
      <HoverCardTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClick}
          className={cn(
            "relative flex items-center justify-center",
            "size-8",
            "rounded-full",
            "overflow-clip",
            "transition-colors duration-300",
            isSelected
              ? "bg-neutral-300 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300"
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80"
          )}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {iconImg ? (
            <div className="w-7 h-7 rounded-full  p-0 m-0 object-cover object-center overflow-clip">
              <Image
                src={iconImg}
                alt={iconImg}
                width={50}
                height={50}
                className="bg-white w-full h-full "
              />
            </div>
          ) : (
            <Icon className="size-4" />
          )}
        </motion.button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="center"
        sideOffset={6}
        className={cn(
          "z-[100]",
          "w-44 p-2 rounded-lg",
          "border border-neutral-200 dark:border-neutral-700",
          "bg-white dark:bg-neutral-800 shadow-md",
          "transition-opacity duration-300"
        )}
      >
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {group.name}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-normal">
            {group.description}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
