"use client";
import { startTransition, useMemo, useOptimistic, useState } from "react";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { chatModels } from "@javin/shared/lib/ai/models";
import { cn } from "@javin/shared/lib/utils/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { CheckCircleFillIcon, ChevronDownIcon } from "@/components/icons";
import BottomSheet from "../bottom-sheet";
import { useWindowSize } from "usehooks-ts";

const tailwindMd = 768;

export function ModelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const { width } = useWindowSize();

  const selectedChatModel = useMemo(
    () => chatModels.find((chatModel) => chatModel.id === optimisticModelId),
    [optimisticModelId]
  );

  return (
    <>
      <DropdownMenu
        open={open && width > tailwindMd}
        onOpenChange={() => {
          setTimeout(() => setOpen((prev) => !prev), 300);
        }}
      >
        <DropdownMenuTrigger
          asChild
          className={cn(
            "w-fit data-[state=open]:bg-accent bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-200 data-[state=open]:text-accent-foreground rounded-full",
            className
          )}
        >
          <Button variant="outline" className="px-2 h-[32px] md:h-[34px]">
            {selectedChatModel?.name}
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[300px] bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-200"
        >
          {chatModels.map((chatModel) => {
            const { id } = chatModel;

            return (
              <DropdownMenuItem
                key={id}
                onSelect={() => {
                  setOpen(false);

                  startTransition(() => {
                    setOptimisticModelId(id);
                    saveChatModelAsCookie(id);
                  });
                }}
                className="gap-4 group/item flex flex-row justify-between items-center"
                data-active={id === optimisticModelId}
              >
                <div className="flex flex-col gap-1 items-start">
                  <div>{chatModel.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {chatModel.description}
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
      {/* bottom sheet opens in mobile */}
      <BottomSheet
        isOpen={open && width < tailwindMd}
        onClose={() => {
          setOpen(false);
        }}
      >
        <div className="flex flex-col pt-5 gap-2">
          {chatModels.map((chatModel) => {
            const { id } = chatModel;

            return (
              <div
                key={id}
                onClick={() => {
                  setOpen(false);

                  startTransition(() => {
                    setOptimisticModelId(id);
                    saveChatModelAsCookie(id);
                  });
                }}
                className="gap-4 group/item flex flex-row justify-between items-center cursor-pointer"
                data-active={id === optimisticModelId}
              >
                <div className="flex flex-col gap-1 items-start">
                  <div>{chatModel.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {chatModel.description}
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
}
