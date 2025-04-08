"use client";
import type { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChatHeader } from "@/components/chat-header";
import type { Vote } from "@/lib/db/schema";
import {
  fetcher,
  generateUUID,
  SearchGroupId,
} from "@javin/shared/lib/utils/utils";
import { MultimodalInput } from "./Input/multimodal-input";
import { Messages } from "./messages";
import { VisibilityType } from "./visibility-selector";
import { toast } from "sonner";
import { User } from "next-auth";
import { InstallPrompt } from "./install-prompt";
// import { Trophy } from "lucide-react";

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
  user,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  user?: User;
}) {
  const { mutate } = useSWRConfig();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate("/api/history");
    },
    onError: (error: any) => {
      console.log(error);
      toast.error(error.message);
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher
  );
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [selectedGroup, setSelectedGroup] = useState<SearchGroupId>("search");
  const [isAtBottom, setIsAtBottom] = useState(true);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <InstallPrompt />
        <ChatHeader
          messages={messages}
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
          user={user}
        />
        {messages.length == 0 && <div className=" h-[15vh]"></div>}
        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          setIsAtBottom={setIsAtBottom}
          selectedGroup={selectedGroup}
          reload={reload}
          isReadonly={isReadonly}
        />
        <form className="flex flex-col mx-auto px-4 pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              isReadonly={isReadonly}
              selectedModelId={selectedChatModel}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              user={user}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              isAtBottom={isAtBottom}
            />
          )}
          {/* {messages.length == 0 && (
            <div className="flex justify-center sm:justify-start w-full mt-10">
              <div className="flex gap-2 p-2 px-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
                <Trophy
                  className="text-javinOrange"
                  size={20}
                  strokeWidth={1.8}
                />
                <span className="text-sm">
                  Finalist at ETH San Francisco 2025
                </span>
              </div>
            </div>
          )} */}
        </form>
      </div>

      {/* <Block
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        selectedModelId={selectedChatModel}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
      /> */}
    </>
  );
}
