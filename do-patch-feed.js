const fs=require('fs');
const p='c:/Users/LENOVO/Desktop/two/soundz/ALL STARS/neeteezzz/march-people-s-app-main/components/netizen/feed.tsx';
let t=fs.readFileSync(p,'utf8');
let old = `  async function handleReshare(post: FeedPost) {
    const postId = getPostId(post);

    if (!postId || !sessionUserId) return;

    try {
      const response = await fetch(\`/api/posts/\${postId}\`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reshare" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to reshare post");
      }

      // Add the reshared post to the feed
      if (data?.post) {
        prependPost(data.post);
      }
      setError("");
    } catch (err) {
      console.error("Reshare failed:", err);
      setError(err instanceof Error ? err.message : "Unable to reshare post");
    }
  }`;
if(t.includes('async function handleReshare(post: FeedPost)')){
  t=t.replace(old, `  function handleReshareSuccess(newPost: FeedPost) {
    if (!newPost) return;
    const originalId = (newPost as any).reshareOf || (newPost as any).reshareData?.originalPostId;
    if (originalId) {
      setPosts((cur)=>cur.map((p)=> String((p as any)._id ?? (p as any).id)===String(originalId) ? {...p, reshareCount: ((p as any).reshareCount ?? 0)+1} : p));
    }
    prependPost(newPost);
    setError("");
  }`);
  fs.writeFileSync(p,t);
  console.log('feed handleReshare replaced');
} else console.log('not found handleReshare');
let t2=fs.readFileSync(p,'utf8');
if(t2.includes('onReshare={handleReshare}')){
  t2=t2.replace(/onReshare=\{handleReshare\}/g,'onReshare={handleReshareSuccess}');
  fs.writeFileSync(p,t2);
  console.log('feed onReshare prop fixed');
}
