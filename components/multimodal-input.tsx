"use client";

import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from "ai";
import cx from "classnames";
import type React from "react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

import { sanitizeUIMessages } from "@/lib/utils";

import { ArrowUpIcon, PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { SuggestedActions } from "./suggested-actions";
import equal from "fast-deep-equal";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { cn, SearchGroup, SearchGroupId, searchGroups } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/hover-card";
import { AnimatePresence, motion } from "framer-motion";

interface GroupSelectorProps {
  selectedGroup: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
}
interface ToolbarButtonProps {
  group: SearchGroup;
  isSelected: boolean;
  onClick: () => void;
}

const GroupSelector = ({
  selectedGroup,
  onGroupSelect,
}: GroupSelectorProps) => {
  return (
    <SelectionContent
      selectedGroup={selectedGroup}
      onGroupSelect={onGroupSelect}
    />
  );
};

const SelectionContent = ({ ...props }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        width: isExpanded ? "auto" : "30px",
        gap: isExpanded ? "0.5rem" : 0,
        paddingRight: isExpanded ? "0.5rem" : 0,
      }}
      transition={{
        layout: { duration: 0.4 },
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1],
        width: { type: "spring", stiffness: 300, damping: 30 },
        gap: { type: "spring", stiffness: 300, damping: 30 },
        paddingRight: { type: "spring", stiffness: 300, damping: 30 },
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
      className={cn(
        "inline-flex items-center",
        "min-w-[38px]",
        "p-0.5",
        "rounded-full border border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-900",
        "shadow-sm overflow-visible",
        "relative z-10"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <AnimatePresence>
        {searchGroups.map((group, index) => {
          const showItem = isExpanded || props.selectedGroup === group.id;
          return (
            <motion.div
              key={group.id}
              animate={{
                width: showItem ? "28px" : 0,
                opacity: showItem ? 1 : 0,
                x: showItem ? 0 : -10,
              }}
              exit={{ opacity: 1, x: 0, transition: { duration: 0 } }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                delay: index * 0.05,
                opacity: { duration: 0.2, delay: showItem ? index * 0.05 : 0 },
              }}
              style={{ margin: 0 }}
            >
              <ToolbarButton
                group={group}
                isSelected={props.selectedGroup === group.id}
                onClick={() => props.onGroupSelect(group)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

const ToolbarButton = ({ group, isSelected, onClick }: ToolbarButtonProps) => {
  const Icon = group.icon;
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
            "transition-colors duration-300",
            isSelected
              ? "bg-neutral-500 dark:bg-neutral-600 text-white dark:text-neutral-300"
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80"
          )}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Icon className="size-4" />
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

function PureAttachmentsButton({
  fileInputRef,
  isLoading,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isLoading: boolean;
}) {
  return (
    <Button
      className="rounded-full rounded-bl-full p-2 h-fit   dark:bg-neutral-600  dark:border-zinc-700   "
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={isLoading}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
}) {
  return (
    <Button
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  user,
  selectedGroup,
  setSelectedGroup,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions
  ) => void;
  className?: string;
  user?: User;
  selectedGroup: SearchGroupId;
  setSelectedGroup: React.Dispatch<React.SetStateAction<SearchGroupId>>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const session = useSession();

  const MIN_HEIGHT = 72;
  const MAX_HEIGHT = 400;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${
        textareaRef.current.scrollHeight + 2
      }px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = "98px";
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const submitForm = useCallback(() => {
    if (!user || !user.email) {
      toast.error("Please login to continue");
      return;
    }
    window.history.replaceState({}, "", `/chat/${chatId}`);

    handleSubmit(undefined, {
      body: {
        group: selectedGroup,
      },
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error("Failed to upload file, please try again!");
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments]
  );

  const handleGroupSelect = useCallback(
    async (group: SearchGroup) => {
      console.log("selectd grup", group);
      setSelectedGroup(group.id);
    },
    [setSelectedGroup]
  );

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // console.log("selectedgroup", selectedGroup);
  return (
    <>
      <motion.div
        layout
        transition={{
          layout: { duration: 0.4 },
          duration: 0.4,
          ease: [0.4, 0.0, 0.2, 1],
          width: { type: "spring", stiffness: 300, damping: 30 },
          gap: { type: "spring", stiffness: 300, damping: 30 },
          padding: { type: "spring", stiffness: 300, damping: 30 },
        }}
        className={cn(
          "relative w-full flex flex-col gap-2 rounded-lg transition-all duration-300 !font-sans",
          attachments.length > 0 || uploadQueue.length > 0
            ? "bg-gray-100/70 dark:bg-neutral-800 p-1"
            : "bg-transparent"
        )}
      >
        <Textarea
          ref={textareaRef}
          placeholder={
            messages.length > 0 ? "Ask a new question..." : "Ask a question..."
          }
          value={input}
          onChange={handleInput}
          disabled={isLoading}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "min-h-[72px] w-full resize-none rounded-lg",
            "text-base leading-relaxed",
            "bg-neutral-100 dark:bg-neutral-900",
            "border !border-neutral-200 dark:!border-neutral-700",
            "focus:!border-neutral-300 dark:focus:!border-neutral-600",
            isFocused ? "!border-neutral-300 dark:!border-neutral-600" : "",
            "text-neutral-900 dark:text-neutral-100",
            "focus:!ring-1 focus:!ring-neutral-300 dark:focus:!ring-neutral-600",
            "px-4 pt-4 pb-16",
            "overflow-y-auto",
            "touch-manipulation"
          )}
          style={{
            maxHeight: `${MAX_HEIGHT}px`,
            WebkitUserSelect: "text",
            WebkitTouchCallout: "none",
          }}
          rows={1}
          autoFocus={width ? width > 768 : true}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();

              if (isLoading) {
                toast.error(
                  "Please wait for the model to finish its response!"
                );
              } else {
                submitForm();
              }
            }
          }}
        />

        <input
          type="file"
          className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
          ref={fileInputRef}
          multiple
          onChange={handleFileChange}
          tabIndex={-1}
        />

        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div className="flex flex-row gap-2 overflow-x-scroll items-end">
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                key={filename}
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
              />
            ))}
          </div>
        )}

        <div className="absolute bottom-0 p-3 w-fit flex flex-row justify-start gap-2 items-center">
          {/* <AttachmentsButton fileInputRef={fileInputRef} isLoading={isLoading} /> */}

          <div className="w-full">
            <GroupSelector
              selectedGroup={selectedGroup}
              onGroupSelect={handleGroupSelect}
            />
          </div>
        </div>

        <div className="absolute bottom-0 right-0 p-3 w-fit flex flex-row justify-end">
          {isLoading ? (
            <StopButton stop={stop} setMessages={setMessages} />
          ) : (
            <SendButton
              input={input}
              submitForm={submitForm}
              uploadQueue={uploadQueue}
            />
          )}
        </div>
      </motion.div>
    </>
  );
}

export const MultimodalInput = PureMultimodalInput;
