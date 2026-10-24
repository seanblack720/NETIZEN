"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, Trash2, ShieldAlert, Menu, X, ChevronRight } from "lucide-react";

type AdminTab = "overview" | "posts" | "users" | "pro-requests";

type AdminPost = {
  id: string;
  userId: string;
  userName: string;
  userHandle?: string | null;
  userImage?: string | null;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  highlightedBy: number;
  createdAt: string | Date;
};

type AdminUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  userHandle?: string | null;
  email?: string | null;
  role?: string;
  isPro?: boolean;
  image?: string | null;
  createdAt?: string | Date;
};

type ProRequest = {
  _id: string;
  userName: string;
  userEmail: string;
  reason: string;
  status: string;
  amount: number;
  createdAt: string;
};

function formatDate(value?: string | Date) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeAgo(value?: string | Date) {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function truncate(text: string, len = 140) {
  return text.length > len ? text.slice(0, len) + "…" : text;
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  // Overview
  const [stats, setStats] = useState<{ posts: number; users: number; pendingRequests: number } | null>(null);

  // Posts
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  // Pro requests
  const [requests, setRequests] = useState<ProRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const loadStats = async () => {
    try {
      const [pRes, uRes, rRes] = await Promise.all([
        fetch("/api/admin/posts", { credentials: "include" }),
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/pro-requests", { credentials: "include" }),
      ]);
      const pData = (await pRes.json()) as { posts: AdminPost[] };
      const uData = (await uRes.json()) as { users: AdminUser[] };
      const rData = (await rRes.json()) as { requests: ProRequest[] };
      setStats({
        posts: pData.posts?.length ?? 0,
        users: uData.users?.length ?? 0,
        pendingRequests: rData.requests?.filter((r) => r.status === "pending").length ?? 0,
      });
    } catch {}
  };

  const loadPosts = async () => {
    setPostsLoading(true);
    setPostsError("");
    try {
      const res = await fetch("/api/admin/posts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load posts");
      const data = (await res.json()) as { posts: AdminPost[] };
      setPosts(data.posts ?? []);
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : "Could not load posts.");
    } finally {
      setPostsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users");
      const data = (await res.json()) as { users: AdminUser[] };
      setUsers(data.users ?? []);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await fetch("/api/admin/pro-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load pro requests");
      const data = (await res.json()) as { requests: ProRequest[] };
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    if (tab === "posts") loadPosts();
    if (tab === "users") loadUsers();
    if (tab === "pro-requests") loadRequests();
  }, [tab]);

  const deletePost = async (id: string) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/posts", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setMessage("Post deleted.");
      setMessageType("success");
      setPosts((cur) => cur.filter((p) => p.id !== id));
      if (stats) setStats({ ...stats, posts: Math.max(0, stats.posts - 1) });
    } catch {
      setMessage("Could not delete post.");
      setMessageType("error");
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm("Delete this user and all their posts? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Delete failed");
      }
      setMessage("User deleted.");
      setMessageType("success");
      setUsers((cur) => cur.filter((u) => u.id !== id));
      if (stats) setStats({ ...stats, users: Math.max(0, stats.users - 1) });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete user.");
      setMessageType("error");
    }
  };

  const decideProRequest = async (id: string, status: "approved" | "rejected") => {
    const res = await fetch("/api/admin/pro-requests", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || "Could not update application.");
      setMessageType("error");
      return;
    }
    setMessage(`Pro request ${status}.`);
    setMessageType("success");
    await loadRequests();
    await loadStats();
  };

  const TabButton = ({ label, icon, value, count }: { label: string; icon: React.ReactElement; value: AdminTab; count?: number | null }) => {
    const active = tab === value;
    return (
      <button
        type="button"
        onClick={() => setTab(value)}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-[#1c9d57] text-white shadow-md"
            : "text-[#68776f] hover:bg-[#f0f4f2] dark:text-[#9bb0a8] dark:hover:bg-[#1f332b]"
        }`}
      >
        {icon}
        <span>{label}</span>{count !== null && count !== undefined ? <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-white/20" : "bg-[#eef3f0] text-[#4a5a50] dark:bg-[#1a2e26] dark:text-[#7ee0b0]"}`}>{count}</span> : null}
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-[#f4f7f4] px-4 py-8 text-[#15271d]">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#168b45] hover:underline">
              ← Back to Netizen
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-[#68776f]">Manage posts, users, and pro applications.</p>
          </div>
          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
              messageType === "success"
                ? "border-[#bfe3cb] bg-[#eef7f0] text-[#2f6b4f]"
                : "border-[#f3d7d0] bg-[#fff4f1] text-[#a22c2c]"
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl border border-[#dfe9e2] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#68776f] uppercase tracking-wider">Posts</p>
                  <p className="text-2xl font-bold">{stats.posts}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#eef3f0] flex items-center justify-center text-[#168b45]">
                  <ShieldAlert size={20} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[#dfe9e2] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#68776f] uppercase tracking-wider">Users</p>
                  <p className="text-2xl font-bold">{stats.users}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#eef3f0] flex items-center justify-center text-[#168b45]">
                  <Users size={20} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[#dfe9e2] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#68776f] uppercase tracking-wider">Pending pro requests</p>
                  <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#eef3f0] flex items-center justify-center text-[#c14b4b]">
                  <Menu size={20} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[#dfe9e2] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#68776f] uppercase tracking-wider">Access</p>
                  <p className="text-xl font-bold">Admin only</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#eef3f0] flex items-center justify-center text-[#2f6b4f]">
                  <X size={20} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-6 no-scrollbar">
          <TabButton
            label="Overview"
            icon={<ShieldAlert size={18} strokeWidth={2} />}
            value="overview"
            count={stats ? stats.posts + stats.users : null}
          />
          <TabButton
            label="Posts"
            icon={<Menu size={18} strokeWidth={2} />}
            value="posts"
            count={posts.length}
          />
          <TabButton
            label="Users"
            icon={<Users size={18} strokeWidth={2} />}
            value="users"
            count={users.length}
          />
          <TabButton
            label="Pro requests"
            icon={<Menu size={18} strokeWidth={2} />}
            value="pro-requests"
            count={requests.length}
          />
        </div>

        {/* Overview tab */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-[#dfe9e2] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Recent posts</h2>
              {posts.length === 0 ? (
                <p className="text-sm text-[#68776f]">No posts yet.</p>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 8).map((post) => (
                    <div key={post.id} className="flex gap-3 rounded-xl border border-[#eef3f0] bg-[#fafbfa] p-3 hover:bg-[#f0f4f2] transition">
                      <div className="shrink-0 rounded-full bg-[#e8efe8] text-[10px] font-semibold text-[#2f6b4f] flex items-center justify-center h-8 w-8">
                        {(post.userName || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{post.userName}</p>
                        <p className="text-xs text-[#68776f] truncate">{truncate(post.content)}</p>
                        <p className="mt-1 text-xs text-[#68776f]">{formatTimeAgo(post.createdAt)} · {post.likes} ❤ · {post.comments} ✎</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        className="h-9 w-9 shrink-0 rounded-full border border-[#f3d7d0] text-[#a22c2c] hover:bg-[#fff4f1] transition"
                        title="Delete post"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#dfe9e2] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Recent users</h2>
              {users.length === 0 ? (
                <p className="text-sm text-[#68776f]">No users yet.</p>
              ) : (
                <div className="space-y-3">
                  {users.slice(0, 8).map((user) => (
                    <div key={user.id} className="flex items-center gap-3 rounded-xl border border-[#eef3f0] bg-[#fafbfa] p-3 hover:bg-[#f0f4f2] transition">
                      <div className="shrink-0 rounded-full bg-[#e8efe8] text-[10px] font-semibold text-[#2f6b4f] flex items-center justify-center h-8 w-8">
                        {(user.name || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{user.name || "Unknown"}</p>
                        <p className="text-xs text-[#68776f] truncate">{user.email || "—"} · {(user.userHandle || user.username || "—")}</p>
                        <p className="mt-1 text-xs text-[#68776f]">
                          Role: <span className="capitalize text-[#168b45] font-medium">{user.role}</span>{user.isPro ? " · Pro" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteUser(user.id)}
                        className="h-9 w-9 shrink-0 rounded-full border border-[#f3d7d0] text-[#a22c2c] hover:bg-[#fff4f1] transition"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Posts tab */}
        {tab === "posts" && (
          <section className="rounded-2xl border border-[#dfe9e2] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">All posts</h2>
              {postsLoading && <span className="text-xs text-[#68776f] animate-pulse">Loading…</span>}
            </div>
            {postsError && <p className="mb-4 text-sm text-[#a22c2c]">{postsError}</p>}
            {posts.length === 0 && !postsLoading ? (
              <p className="text-sm text-[#68776f]">No posts found.</p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="flex items-start gap-3 rounded-xl border border-[#eef3f0] bg-[#fafbfa] p-3 hover:bg-[#f0f4f2] transition">
                    <div className="shrink-0 rounded-full bg-[#e8efe8] text-[10px] font-semibold text-[#2f6b4f] flex items-center justify-center h-8 w-8 mt-0.5">
                      {(post.userName || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">{post.userName}</p>
                        <span className="text-[10px] font-semibold text-[#168b45]">{post.userHandle ? `@${post.userHandle}` : ""}</span>
                      </div>
                      <p className="text-sm truncate">{truncate(post.content)}</p>
                      <p className="mt-1 text-xs text-[#68776f]">
                        {formatTimeAgo(post.createdAt)} · {post.likes} ❤ · {post.comments} ✎ · {post.shares} ↗
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="shrink-0 rounded-full border border-[#f3d7d0] text-[#a22c2c] hover:bg-[#fff4f1] transition"
                      title="Delete post"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <section className="rounded-2xl border border-[#dfe9e2] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">All users</h2>
              {usersLoading && <span className="text-xs text-[#68776f] animate-pulse">Loading…</span>}
            </div>
            {usersError && <p className="mb-4 text-sm text-[#a22c2c]">{usersError}</p>}
            {users.length === 0 && !usersLoading ? (
              <p className="text-sm text-[#68776f]">No users found.</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 rounded-xl border border-[#eef3f0] bg-[#fafbfa] p-3 hover:bg-[#f0f4f2] transition">
                    <div className="shrink-0 rounded-full bg-[#e8efe8] text-[10px] font-semibold text-[#2f6b4f] flex items-center justify-center h-8 w-8">
                      {(user.name || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{user.name || "Unknown user"}</p>
                      <p className="text-xs text-[#68776f] truncate">{user.email || "—"} · {user.userHandle || user.username || "—"}</p>
                      <p className="mt-1 text-xs text-[#68776f]">
                        Role:{" "}
                        <span className={`font-semibold capitalize ${user.role === "admin" ? "text-[#c14b4b]" : "text-[#168b45]"}`}>
                          {user.role}
                        </span>
                        {user.isPro ? " · Pro" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteUser(user.id)}
                      className="shrink-0 rounded-full border border-[#f3d7d0] text-[#a22c2c] hover:bg-[#fff4f1] transition"
                      title="Delete user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Pro requests tab */}
        {tab === "pro-requests" && (
          <section className="rounded-2xl border border-[#dfe9e2] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Pro applications</h2>
            {requestsLoading && <span className="text-xs text-[#68776f] animate-pulse">Loading…</span>}
            {requests.length === 0 && !requestsLoading ? (
              <p className="text-sm text-[#68776f]">No pro applications.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request._id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#eef3f0] bg-[#fafbfa] p-3">
                    <div>
                      <h2 className="font-semibold">{request.userName}</h2>
                      <p className="text-sm text-[#68776f]">{request.userEmail} · R{request.amount}/month</p>
                      {request.reason && <p className="mt-2 text-sm text-[#33463a]">{request.reason}</p>}
                    </div>
                    <div className="flex items-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          request.status === "pending"
                            ? "bg-[#eef5f0] text-[#2f6b4f]"
                            : request.status === "approved"
                              ? "bg-[#eef7f0] text-[#168b45]"
                              : "bg-[#fdf0ee] text-[#a22c2c]"
                        }`}
                      >
                        {request.status}
                      </span>
                      {request.status === "pending" && (
                        <>
                          <button
                            onClick={() => decideProRequest(request._id, "approved")}
                            className="rounded-lg bg-[#1c9d57] px-4 py-2 text-sm font-semibold text-white"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => decideProRequest(request._id, "rejected")}
                            className="rounded-lg border border-[#e1bdbd] px-4 py-2 text-sm font-semibold text-[#a22c2c]"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
