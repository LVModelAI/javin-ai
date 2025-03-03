import { cn, SearchGroup, SearchGroupId, searchGroups } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ForwardRefExoticComponent,
  RefAttributes,
  startTransition,
  useState,
} from "react";
import { ToolbarButton } from "./ToolbarButton";
import BottomSheet from "../bottom-sheet";
import { useWindowSize } from "usehooks-ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { CheckCircleFillIcon } from "../icons";
import Image from "next/image";
import { LucideProps } from "lucide-react";

interface GroupSelectorProps {
  selectedGroupId: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
}

export const GroupSelector = ({
  selectedGroupId,
  onGroupSelect,
}: GroupSelectorProps) => {
  return (
    <SelectionContent
      selectedGroupId={selectedGroupId}
      onGroupSelect={onGroupSelect}
    />
  );
};

const tailwindMd = 768;

const SelectionContent = ({
  selectedGroupId,
  onGroupSelect,
}: GroupSelectorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { width } = useWindowSize();

  const selectedGroup = searchGroups.find(
    (group) => group.id === selectedGroupId
  );
  const Icon = selectedGroup?.icon as ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  return (
    <>
      <DropdownMenu
        open={isExpanded && width > tailwindMd}
        onOpenChange={() => {
          setTimeout(() => setIsExpanded((prev) => !prev), 300);
        }}
      >
        <DropdownMenuTrigger
          asChild
          className={cn(
            "w-fit data-[state=open]:bg-accent bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-200 data-[state=open]:text-accent-foreground rounded-full"
          )}
        >
          <Button variant="outline" className="px-3 md:px-2  md:h-[34px]">
            {selectedGroup?.img ? (
              <Image
                src={selectedGroup.img || ""}
                alt="icon"
                width={24}
                height={24}
                className="bg-white rounded-full"
              />
            ) : (
              <Icon />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[300px] bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-200"
        >
          {searchGroups.map((group) => {
            const IconLocal = group.icon;
            const iconImg = group.img;

            return (
              <DropdownMenuItem
                key={group.id}
                onSelect={() => {
                  // startTransition(() => {
                  onGroupSelect(group);
                  setIsExpanded(false);
                  // });
                }}
                className="gap-4 group/item flex flex-row justify-start items-center"
                data-active={selectedGroupId === group.id}
              >
                {iconImg ? (
                  <Image
                    src={iconImg || ""}
                    alt="icon"
                    width={20}
                    height={20}
                    className="bg-white rounded-full "
                  />
                ) : (
                  <IconLocal className="size-4" />
                )}
                <div className="flex flex-col gap-1 items-start">
                  <div>{group.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {group.description}
                  </div>
                </div>

                <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                  <CheckCircleFillIcon />
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <BottomSheet
        isOpen={isExpanded && width < tailwindMd}
        onClose={() => setIsExpanded(false)}
      >
        <div className="flex flex-col pt-5 gap-2">
          {searchGroups.map((group) => {
            const IconLocal = group.icon;
            const iconImg = group.img;

            return (
              <div
                key={group.id}
                onClick={() => {
                  startTransition(() => {
                    onGroupSelect(group);
                    setIsExpanded(false);
                  });
                }}
                className="gap-4 group/item flex flex-row justify-start items-start cursor-pointer"
                data-active={selectedGroupId === group.id}
              >
                <div className=" pt-1">
                  {iconImg ? (
                    <Image
                      src={iconImg || ""}
                      alt="icon"
                      width={18}
                      height={18}
                    />
                  ) : (
                    <IconLocal className="size-4" />
                  )}
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <div>{group.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {group.description}
                  </div>
                </div>

                <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                  <CheckCircleFillIcon />
                </div>
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
};
