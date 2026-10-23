"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProRequest = { _id: string; userName: string; userEmail: string; reason: string; status: string; amount: number; createdAt: string };

export default function AdminPage() {
  const [requests, setRequests] = useState<ProRequest[]>([]);
  const [message, setMessage] = useState("Loading applications…");
  const load = () => fetch("/api/admin/pro-requests", { credentials: "include" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setRequests(data.requests); setMessage(""); }).catch((error) => setMessage(error.message || "Could not load applications."));
  useEffect(() => { load(); }, []);
  const decide = async (id: string, status: "approved" | "rejected") => { const response = await fetch("/api/admin/pro-requests", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); if (!response.ok) { const data = await response.json(); setMessage(data.message || "Could not update application."); return; } load(); };
  return <main className="min-h-screen bg-[#f5f7f4] px-4 py-8 text-[#15271d]"><div className="mx-auto max-w-4xl"><Link href="/" className="text-sm font-semibold text-[#168b45]">← Back to Netizen</Link><h1 className="mt-4 text-3xl font-semibold">Admin dashboard</h1><p className="mt-1 text-sm text-[#68776f]">Review Netizen Pro applications. Set <code>ADMIN_EMAILS</code> to your administrator email address.</p>{message && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-[#5f7168]">{message}</p>}<div className="mt-5 space-y-3">{requests.map((request) => <article key={request._id} className="rounded-2xl border border-[#dfe9e2] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{request.userName}</h2><p className="text-sm text-[#68776f]">{request.userEmail} · R{request.amount}/month</p></div><span className="rounded-full bg-[#eef5f0] px-3 py-1 text-xs font-semibold capitalize text-[#2f6b4f]">{request.status}</span></div>{request.reason && <p className="mt-3 text-sm text-[#33463a]">{request.reason}</p>}{request.status === "pending" && <div className="mt-4 flex gap-2"><button onClick={() => decide(request._id, "approved")} className="rounded-lg bg-[#1c9d57] px-4 py-2 text-sm font-semibold text-white">Approve</button><button onClick={() => decide(request._id, "rejected")} className="rounded-lg border border-[#e1bdbd] px-4 py-2 text-sm font-semibold text-[#a22c2c]">Reject</button></div>}</article>)}</div></div></main>;
}
