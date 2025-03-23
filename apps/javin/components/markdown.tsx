import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import "./markdown.css";

const components: Partial<Components> = {
  // @ts-expect-error
  code: CodeBlock,
  small: ({ children }) => (
    <small className="break-long-words">{children}</small>
  ),
  pre: ({ children }) => <>{children}</>,

  span: ({ children }) => <span className="break-long-words">{children}</span>,
  p: ({ children }) => <p className="break-long-words">{children}</p>,

  ol: ({ node, children, ...props }) => {
    return (
      <ol
        className="break-long-words list-decimal list-outside ml-4"
        {...props}
      >
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="break-long-words py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="break-long-words list-disc list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="break-long-words font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="break-long-words text-blue-500 hover:underline inline-block"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1
        className="break-long-words text-3xl font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2
        className="break-long-words text-2xl font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3
        className="break-long-words text-xl font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4
        className="break-long-words text-lg font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5
        className="break-long-words text-base font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6
        className="break-long-words text-sm font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h6>
    );
  },
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
