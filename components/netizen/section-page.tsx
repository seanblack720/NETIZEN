"use client";

import { AppShell } from "./app-shell";
import { destinationPages } from "./destination-pages";
import { Messages } from "./messages";
import { type NavId } from "@/lib/netizen-data";
import { CreatePostModal } from "./create-post-modal";
import { CreateMenu, type CreateAction } from "./create-menu";
import { useState } from "react";

export function SectionPage({ section }: { section: string }) {
  const id = section as NavId;
  const Destination = destinationPages[id as keyof typeof destinationPages];
  const [composerOpen, setComposerOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  function handleCreateAction(action: CreateAction) {
    setCreateMenuOpen(false);

    if (action === "job" || action === "group") {
      const target = action === "job" ? "jobs" : "groups";
      if (target !== id) {
        window.location.href = `/${target}`;
      }
      return;
    }

    setComposerOpen(true);
  }

  return (
    <AppShell
      active={id}
      onNavigate={(next) => {
        window.location.href = next === "feed" ? "/" : `/${next}`;
      }}
      onCreate={() => setCreateMenuOpen(true)}
      rightRail={null}
    >
      {id === "messages" ? <Messages /> : Destination ? <Destination /> : null}
      {createMenuOpen && (
        <CreateMenu
          onClose={() => setCreateMenuOpen(false)}
          onSelect={handleCreateAction}
        />
      )}
      {composerOpen && <CreatePostModal onClose={() => setComposerOpen(false)} />}
    </AppShell>
  );
}
