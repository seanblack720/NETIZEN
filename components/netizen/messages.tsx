"use client";
import { Send } from "lucide-react";
import { useState } from "react";
import { messageThreads } from "@/lib/netizen-data";
import { Avatar, PageHeading } from "./app-shell";
export function Messages() {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeading id="messages" />
      <div className="grid h-[600px] grid-cols-[300px_1fr] overflow-hidden rounded-[18px] border border-[#dfe7e4] bg-white max-md:block max-md:h-auto max-md:min-h-[calc(100vh-300px)]">
        <div className="border-r border-[#dfe7e4] max-md:w-full max-md:border-0">
          <input className="m-3 w-[calc(100%-24px)] rounded-[20px] border border-[#dfe7e4] p-[11px]" placeholder="Search messages" aria-label="Search messages" />
          {messageThreads.map((name, index) => (
            <button className={`flex w-full items-center gap-2.5 border-0 p-[14px] text-left ${index === 0 ? "bg-[#e7f7ed]" : "bg-transparent"}`} key={name}>
              <Avatar
                src={index % 2 ? "/group-1.png" : "/avatar-1.png"}
                alt={name}
              />
              <span>
                <b>{name}</b>
                <small className="mt-1 block text-[#5f7073]">
                  {index
                    ? "New event details posted"
                    : "Are you joining the market this weekend?"}
                </small>
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col max-md:hidden">
          <div className="flex items-center gap-3 border-b border-[#dfe7e4] p-4">
            <Avatar src="/avatar-1.png" alt="Lerato Khumalo" />
            <b>
              Lerato Khumalo<small className="mt-[3px] block text-[13px] font-normal text-[#5f7073]">Active now</small>
            </b>
          </div>
          <div className="flex-1 p-[18px]">
            <p className="w-max max-w-[80%] rounded-2xl bg-[#f3f7f5] px-[14px] py-2.5">Hey! Are you joining the market this weekend?</p>
            <p className="ml-auto w-max max-w-[80%] rounded-2xl bg-[#e7f7ed] px-[14px] py-2.5">Absolutely. I&apos;ll see you there.</p>
            {sent.map((message) => (
              <p className="ml-auto w-max max-w-[80%] rounded-2xl bg-[#e7f7ed] px-[14px] py-2.5" key={message}>
                {message}
              </p>
            ))}
          </div>
          <form className="flex gap-2 border-t border-[#dfe7e4] p-[15px]"
            onSubmit={(event) => {
              event.preventDefault();
              if (value.trim()) {
                setSent((current) => [...current, value.trim()]);
                setValue("");
              }
            }}
          >
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Write a message..."
              aria-label="Write a message"
              className="flex-1 rounded-[20px] border border-[#dfe7e4] p-3"
            />
            <button className="grid w-11 place-items-center rounded-full bg-[#20ad56] text-white" aria-label="Send message">
              <Send />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
