"use client";

import { Plus } from "lucide-react";

type PostButtonProps = {
  onClick: () => void;
  compact?: boolean;
};

export function PostButton({ onClick, compact = false }: PostButtonProps) {
  return (
    <button
      className={
        compact
          ? "flex h-[52px] w-[52px] shrink-0 -translate-y-3 items-center justify-center rounded-[18px] bg-[#20ad56] p-3 text-white shadow-[0_7px_16px_rgba(32,173,86,0.30)] transition duration-200 hover:-translate-y-4 hover:bg-[#168b45] active:scale-95 [&>span]:hidden [&>svg]:h-5 [&>svg]:w-5"
          : "my-[30px] mb-[18px] flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-[#20ad56] p-[15px] font-bold text-white [&>svg]:w-5"
      }
      type="button"
      onClick={onClick}
      aria-label={compact ? "Create a post" : undefined}
    >
      <Plus aria-hidden="true" />
      <span>Create post</span>
    </button>
  );
}
