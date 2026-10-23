import type { ReactNode } from "react";

type DestinationContentProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function DestinationContent({
  title,
  description,
  children,
}: DestinationContentProps) {
  return (
    <div className="mx-auto max-w-[880px]">
      <div className="flex flex-col items-center gap-3 rounded-[20px] border border-[#dfe7e4] bg-white px-5 py-[70px] text-center text-[#5f7073] [&>svg]:w-[45px] [&>svg]:text-[#20ad56]">
        <h2>{title}</h2>
        <p>{description}</p>
        {children ?? (
          <span>Explore local people, groups, services and opportunities.</span>
        )}
      </div>
    </div>
  );
}
