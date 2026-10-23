import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { auth } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";

const DB_NAME = "netizen";

async function findUserById(db: any, id: string) {
  let user = await db.collection("user").findOne({ id });
  if (!user && ObjectId.isValid(id)) {
    user = await db.collection("user").findOne({ _id: new ObjectId(id) });
  }
  return user;
}

function userFilterById(id: string) {
  const filters: Record<string, unknown>[] = [{ id }];
  if (ObjectId.isValid(id)) filters.push({ _id: new ObjectId(id) });
  return { $or: filters };
}

function mapUser(u: any) {
  if (!u) return null;
  return {
    id: String(u.id ?? u._id),
    name: u.name || "Netizen",
    userHandle: u.userHandle || u.username || null,
    userImage: u.image || u.avatar || null,
    interests: Array.isArray(u.interests) ? u.interests.map(String) : [],
  };
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const viewerId = session.user.id;
  const db = (await clientPromise).db(DB_NAME);
  const { searchParams } = new URL(request.url);
  const withUser = searchParams.get("userId")?.trim();
  const search = searchParams.get("search");
  const suggest = searchParams.get("suggest");

  // Look up the netizen-request status between the viewer and another user
  if (withUser) {
    const requestDoc = await db.collection("netizenRequests").findOne({
      $or: [
        { fromUserId: viewerId, toUserId: withUser },
        { fromUserId: withUser, toUserId: viewerId },
      ],
    });
    return NextResponse.json({ request: requestDoc ?? null });
  }

  // Search users / interest-based suggestions
  if (search !== null || suggest !== null) {
    const viewerDoc = await findUserById(db, viewerId);
    const myNetizens = (viewerDoc?.addedNetizens ?? []).map(String);
    const myInterests = (Array.isArray(viewerDoc?.interests) ? viewerDoc.interests : [])
      .map((i: unknown) => String(i).trim().toLowerCase())
      .filter(Boolean);

    // Pending request partners should not show as suggestions
    const pending = await db
      .collection("netizenRequests")
      .find({
        status: "pending",
        $or: [{ fromUserId: viewerId }, { toUserId: viewerId }],
      })
      .project({ fromUserId: 1, toUserId: 1 })
      .toArray();

    const pendingIds = new Set<string>();
    for (const p of pending) {
      pendingIds.add(String(p.fromUserId));
      pendingIds.add(String(p.toUserId));
    }
    pendingIds.delete(viewerId);

    const excludeIds = Array.from(new Set([...myNetizens, ...pendingIds, viewerId]));

    const q = (search ?? "").trim();
    if (q.length > 0) {
      const users = await db
        .collection("user")
        .find({
          $and: [
            { id: { $nin: excludeIds.length ? excludeIds : ["__none__"] } },
            {
              $or: [
                { name: { $regex: q, $options: "i" } },
                { userHandle: { $regex: q, $options: "i" } },
                { username: { $regex: q, $options: "i" } },
              ],
            },
          ],
        })
        .limit(20)
        .toArray()
        .then((rows) => rows.filter((u) => String(u.id ?? u._id) !== viewerId));

      return NextResponse.json({
        users: users.map((u) => mapUser(u)),
      });
    }

    // Suggested netizens: same interests first, then recent users as fallback
    let candidates: any[] = [];

    if (myInterests.length > 0) {
      candidates = await db
        .collection("user")
        .find({
          id: { $nin: excludeIds.length ? excludeIds : ["__none__"] },
          interests: { $in: myInterests },
        })
        .limit(40)
        .toArray();
    }

    if (candidates.length < 12) {
      const already = new Set(candidates.map((u) => String(u.id ?? u._id)));
      const extras = await db
        .collection("user")
        .find({
          id: { $nin: excludeIds.length ? excludeIds : ["__none__"] },
        })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();

      for (const u of extras) {
        const id = String(u.id ?? u._id);
        if (id === viewerId || already.has(id)) continue;
        candidates.push(u);
        already.add(id);
        if (candidates.length >= 20) break;
      }
    }

    const scored = candidates
      .map((u) => {
        const their = (Array.isArray(u.interests) ? u.interests : []).map((i: unknown) =>
          String(i).trim().toLowerCase()
        );
        const shared = myInterests.filter((i: string) => their.includes(i));
        return { user: u, shared, score: shared.length };
      })
      .filter((row) => String(row.user.id ?? row.user._id) !== viewerId)
      .sort((a, b) => b.score - a.score || String(b.user.createdAt || "").localeCompare(String(a.user.createdAt || "")))
      .slice(0, 15);

    return NextResponse.json({
      users: scored.map(({ user, shared }) => ({
        ...mapUser(user),
        sharedInterests: shared.slice(0, 4),
        sharedCount: shared.length,
      })),
    });
  }

  const [received, sent] = await Promise.all([
    db
      .collection("netizenRequests")
      .find({ toUserId: viewerId, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection("netizenRequests")
      .find({ fromUserId: viewerId, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);

  const receivedIds = received.map((r) => String(r.fromUserId));
  const sentIds = sent.map((r) => String(r.toUserId));
  const [receivedUsers, sentUsers] = await Promise.all([
    receivedIds.length ? Promise.all(receivedIds.map((id) => findUserById(db, id))) : [],
    sentIds.length ? Promise.all(sentIds.map((id) => findUserById(db, id))) : [],
  ]);

  return NextResponse.json({
    received: received.map((r, i) => ({
      id: String(r._id),
      _id: String(r._id),
      fromUserId: String(r.fromUserId),
      toUserId: String(r.toUserId),
      status: r.status,
      createdAt: r.createdAt,
      user: mapUser(receivedUsers[i]),
      // Flat fields for older clients
      userId: receivedUsers[i] ? String(receivedUsers[i].id ?? receivedUsers[i]._id) : String(r.fromUserId),
      userName: receivedUsers[i]?.name || "Netizen",
      userHandle: receivedUsers[i]?.userHandle || receivedUsers[i]?.username || null,
      userImage: receivedUsers[i]?.image || receivedUsers[i]?.avatar || null,
    })),
    sent: sent.map((r, i) => ({
      id: String(r._id),
      _id: String(r._id),
      fromUserId: String(r.fromUserId),
      toUserId: String(r.toUserId),
      status: r.status,
      createdAt: r.createdAt,
      user: mapUser(sentUsers[i]),
      userId: sentUsers[i] ? String(sentUsers[i].id ?? sentUsers[i]._id) : String(r.toUserId),
      userName: sentUsers[i]?.name || "Netizen",
      userHandle: sentUsers[i]?.userHandle || sentUsers[i]?.username || null,
      userImage: sentUsers[i]?.image || sentUsers[i]?.avatar || null,
    })),
    // Alias so older clients that read `requests` still work
    requests: received.map((r, i) => ({
      id: String(r._id),
      userId: receivedUsers[i] ? String(receivedUsers[i].id ?? receivedUsers[i]._id) : String(r.fromUserId),
      userName: receivedUsers[i]?.name || "Netizen",
      userHandle: receivedUsers[i]?.userHandle || receivedUsers[i]?.username || null,
      userImage: receivedUsers[i]?.image || receivedUsers[i]?.avatar || null,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const viewerId = session.user.id;
  const { toUserId } = await request.json();
  if (typeof toUserId !== "string" || !toUserId || toUserId === viewerId) {
    return NextResponse.json({ message: "Choose another user." }, { status: 400 });
  }

  const db = (await clientPromise).db(DB_NAME);

  const existing = await db.collection("netizenRequests").findOne({
    $or: [
      { fromUserId: viewerId, toUserId, status: "pending" },
      { fromUserId: toUserId, toUserId: viewerId, status: "pending" },
    ],
  });
  if (existing) {
    // If they already sent you one, tell the client to accept instead
    if (String(existing.fromUserId) === toUserId) {
      return NextResponse.json(
        { message: "They already sent you a request.", requestId: String(existing._id), incoming: true },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Request already sent." }, { status: 409 });
  }

  const viewerDoc = await findUserById(db, viewerId);
  const alreadyNetizen = (viewerDoc?.addedNetizens ?? []).map(String).includes(toUserId);
  if (alreadyNetizen) {
    return NextResponse.json({ message: "Already netizens." }, { status: 409 });
  }

  const accepted = await db.collection("netizenRequests").findOne({
    $or: [
      { fromUserId: viewerId, toUserId, status: "accepted" },
      { fromUserId: toUserId, toUserId: viewerId, status: "accepted" },
    ],
  });
  if (accepted) {
    return NextResponse.json({ message: "Already netizens." }, { status: 409 });
  }

  const targetUser = await findUserById(db, toUserId);
  if (!targetUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  // Re-open a previously rejected pair instead of colliding on the unique index
  const prior = await db.collection("netizenRequests").findOne({
    $or: [
      { fromUserId: viewerId, toUserId },
      { fromUserId: toUserId, toUserId: viewerId },
    ],
  });

  let requestId: string;

  if (prior) {
    await db.collection("netizenRequests").updateOne(
      { _id: prior._id },
      {
        $set: {
          fromUserId: viewerId,
          toUserId,
          status: "pending",
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      }
    );
    requestId = String(prior._id);
  } else {
    const created = await db.collection("netizenRequests").insertOne({
      fromUserId: viewerId,
      toUserId,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    requestId = String(created.insertedId);
  }

  await createNotification(db, {
    senderId: viewerId,
    receiverId: toUserId,
    actorId: viewerId,
    actorName: session.user.name || "Someone",
    actorImage: session.user.image ?? null,
    type: "netizen-request",
    message: `${session.user.name || "Someone"} wants to add you as a netizen`,
    link: `/profile/${viewerId}`,
  });

  return NextResponse.json(
    { success: true, message: "Netizen request sent.", requestId },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ message: "Sign in required" }, { status: 401 });

  const viewerId = session.user.id;
  const body = await request.json();
  const requestId = body?.requestId;
  // Accept "decline" as an alias of "reject" (People modal uses decline)
  const action = body?.action === "decline" ? "reject" : body?.action;

  if (!requestId || !action) {
    return NextResponse.json({ message: "Missing requestId or action." }, { status: 400 });
  }

  const db = (await clientPromise).db(DB_NAME);
  let requestObjectId: ObjectId;
  try {
    requestObjectId = new ObjectId(requestId);
  } catch {
    return NextResponse.json({ message: "Invalid request id." }, { status: 400 });
  }
  const reqDoc = await db.collection("netizenRequests").findOne({ _id: requestObjectId });
  if (!reqDoc) {
    return NextResponse.json({ message: "Request not found." }, { status: 404 });
  }

  const fromUserId = String(reqDoc.fromUserId);
  const toUserId = String(reqDoc.toUserId);

  if (action === "cancel") {
    if (fromUserId !== viewerId) {
      return NextResponse.json({ message: "Not your request to cancel." }, { status: 403 });
    }
    await db.collection("netizenRequests").deleteOne({ _id: requestObjectId });
    return NextResponse.json({ success: true, message: "Request cancelled." });
  }

  if (action === "reject") {
    if (toUserId !== viewerId) {
      return NextResponse.json({ message: "Not your request to reject." }, { status: 403 });
    }
    await db.collection("netizenRequests").updateOne(
      { _id: requestObjectId },
      { $set: { status: "rejected", updatedAt: new Date() } }
    );
    return NextResponse.json({ success: true, message: "Request rejected." });
  }

  if (action === "accept") {
    if (toUserId !== viewerId) {
      return NextResponse.json({ message: "Not your request to accept." }, { status: 403 });
    }
    if (reqDoc.status !== "pending") {
      return NextResponse.json({ message: "Request is not pending." }, { status: 409 });
    }

    await db.collection("netizenRequests").updateOne(
      { _id: requestObjectId },
      { $set: { status: "accepted", updatedAt: new Date() } }
    );

    // Make them mutual netizens (match user by id or _id)
    await db.collection("user").updateOne(userFilterById(toUserId), {
      $addToSet: { addedNetizens: fromUserId },
    });
    await db.collection("user").updateOne(userFilterById(fromUserId), {
      $addToSet: { addedNetizens: toUserId },
    });

    await createNotification(db, {
      senderId: viewerId,
      receiverId: fromUserId,
      actorId: viewerId,
      actorName: session.user.name || "Someone",
      actorImage: session.user.image ?? null,
      type: "netizen-request",
      message: `${session.user.name || "Someone"} accepted your netizen request`,
      link: `/profile/${viewerId}`,
    });

    return NextResponse.json({ success: true, message: "Netizen request accepted." });
  }

  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
