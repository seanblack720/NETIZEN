"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileModal } from "@/components/netizen/profile-modal";
import {
  AppShell,
  Avatar,
  CreatePostModal,
} from "@/components/netizen/app-shell";
import { Feed } from "@/components/netizen/feed";
import { CreateMenu, type CreateAction } from "@/components/netizen/create-menu";
import { Messages } from "@/components/netizen/messages";
import { destinationPages } from "@/components/netizen/destination-pages";
import { suggestedPeople, type NavId } from "@/lib/netizen-data";
import { SettingsModal } from "@/components/netizen/settings-modal";
import { ProfileEditorModal } from "@/components/netizen/profile-editor-modal";

function RightRail() {
  return (
    <>
      <section className="mb-[18px] rounded-[18px] border border-[#dfe7e4] bg-white p-5">
        <h3 className="mb-4 flex justify-between text-base font-bold">
          Suggested for you{" "}
          <button className="border-0 bg-transparent font-bold text-[#07843b]">
            See all
          </button>
        </h3>
        {suggestedPeople.map((name, index) => (
          <p className="my-[14px] flex items-center gap-3" key={name}>
            <Avatar src={`/avatar-${index + 1}.png`} alt={name} />
            <b className="flex-1">
              {name}
              <small className="mt-1 block font-normal text-[#5f7073]">
                Suggested friend
              </small>
            </b>
            <button className="rounded-[20px] border-0 bg-[#e7f7ed] px-[14px] py-[9px] font-bold text-[#087a3a]">
              Add
            </button>
            
          </p>
        ))}
      </section>
      <section className="mb-[18px] rounded-[18px] border border-[#dfe7e4] bg-white p-5">
        <h3>Upcoming events</h3>
        <p>
          <b>
            Farmers Market<small>Sat · 8:00 AM</small>
          </b>
        </p>
        <p>
          <b>
            Park Clean-up Drive<small>Sun · 9:00 AM</small>
          </b>
        </p>
      </section>
      <section className="mb-[18px] rounded-[18px] border border-[#dfe7e4] bg-white p-5">
        <h3>Trending petitions</h3>
        <p>
          <b>
            Fix Main St potholes<small>4,213 signatures</small>
          </b>
        </p>
        <p>
          <b>
            More library hours<small>1,890 signatures</small>
          </b>
        </p>
      </section>
    </>
  );
}

export default function HomePage() {
  const [active, setActive] = useState<NavId>("feed");
  const [createMenu, setCreateMenu] = useState(false);
  const [composer, setComposer] = useState(false);
  const [postsVersion, setPostsVersion] = useState(0);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<{
    id: string;
    name?: string | null;
    image?: string | null;
  } | null>(null);
  const [latestCreatedPost, setLatestCreatedPost] = useState<{
    id?: string;
    _id?: string;
    content?: string;
    images?: string[] | null;
    userId?: string;
    userName?: string | null;
    userImage?: string | null;
    likes?: number;
    comments?: number;
    shares?: number;
    likedBy?: string[];
    createdAt?: string | Date;
  } | null>(null);
  const router = useRouter();

  function handleCreateAction(action: CreateAction) {
    setCreateMenu(false);

    if (action === "job") {
      setActive("jobs");
      return;
    }

    if (action === "group") {
      setActive("groups");
      return;
    }

    setComposer(true);
  }

  async function openMyProfile() {
    try {
      const response = await fetch("/api/auth/get-session", {
        credentials: "include",
      });
      if (!response.ok) {
        router.push("/login");
        return;
      }

      const data = await response.json();
      if (!data?.user?.id) {
        router.push("/login");
        return;
      }

      setProfileUser({
        id: data.user.id,
        name: data.user.name ?? null,
        image: data.user.image ?? null,
      });
      setProfileModalOpen(true);
    } catch (err) {
      console.error("Open profile failed:", err);
      router.push("/login");
    }
  }

  function openProfile(
    userId: string,
    userName?: string | null,
    userImage?: string | null
  ) {
    if (!userId) return;
    setProfileUser({ id: userId, name: userName ?? null, image: userImage ?? null });
    setProfileModalOpen(true);
  }

  const CurrentDestination =
    active === "feed" || active === "messages"
      ? null
      : destinationPages[active];

  return (
    <>
      <AppShell
        active={active}
        onNavigate={setActive}
        onCreate={() => setCreateMenu(true)}
        onCreateBottomNav={() => setComposer(true)}
        mobileOnly={true}
        rightRail={<RightRail />}
        onOpenProfile={openMyProfile}
        onOpenSettings={() => setSettingsModalOpen(true)}
      >
        {active === "feed" ? (
          <Feed
            refreshKey={postsVersion}
            incomingPost={latestCreatedPost}
            onNavigate={(id) => setActive(id)}
            onCreate={() => setComposer(true)}
            onOpenProfile={(id, name, image) => openProfile(id, name, image)}
          />
        ) : active === "messages" ? (
          <Messages />
        ) : CurrentDestination ? (
          <CurrentDestination />
        ) : null}
      </AppShell>
      {createMenu && (
        <CreateMenu
          onClose={() => setCreateMenu(false)}
          onSelect={handleCreateAction}
        />
      )}
      {composer && (
        <CreatePostModal
          onClose={() => setComposer(false)}
          onPost={(newPost) => {
            setLatestCreatedPost(newPost);
            setPostsVersion((v) => v + 1);
          }}
        />
      )}
      {profileModalOpen && profileUser && (
        <ProfileModal
          userId={profileUser.id}
          userName={profileUser.name}
          userImage={profileUser.image}
          onClose={() => setProfileModalOpen(false)}
        />
      )}
      {settingsModalOpen && (
        <SettingsModal
          onClose={() => setSettingsModalOpen(false)}
          onOpenProfileEditor={() => {
            setSettingsModalOpen(false);
            setProfileEditorOpen(true);
          }}
        />
      )}
      {profileEditorOpen && (
        <ProfileEditorModal onClose={() => setProfileEditorOpen(false)} />
      )}
    </>
  );
}
