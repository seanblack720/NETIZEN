import pathlib
p = pathlib.Path(r"c:\Users\LENOVO\Desktop\two\soundz\ALL STARS\neeteezzz\march-people-s-app-main\components\netizen\post-detail-modal.tsx")
t = p.read_text(encoding="utf-8")
old = t[t.find("      {/* Reshare indicator */}"):t.find("      {/* =========================================================\n          MAIN SCROLL AREA")+t.find("        {(post.reshareOf && post.reshareData?.originalContent?.trim()) || post.content?.trim() ? ("):t.find("        {/* =======================================================\n            IMAGES")]
# Simpler: use known string pieces
target1 = "      {/* Reshare indicator */}\n{post.reshareOf && post.reshareData && ("
if target1 in t:
    # Replace click handler to open original
    t = t.replace("onClick={() => onSelectPost?.(post)}", "onClick={async () => { const originalId = post.reshareData?.originalPostId || post.reshareOf; if (!originalId) return; try { const res = await fetch(\"/api/posts/\" + originalId, { cache: \"no-store\" }); const data = await res.json(); if (res.ok && data?.post && onSelectPost) onSelectPost(data.post); } catch {} }}")
    t = t.replace('aria-label="Reshared post"', 'aria-label="Open original post"')
    # Add sharer description above indicator if not exists
    if "Sharer description - above" not in t:
        t = t.replace("      {/* Reshare indicator */}", "      {/* Sharer description - above reshare indicator */}\n      {post.reshareOf && post.content?.trim() ? (\n        <div className={`shrink-0 px-3 py-3 ${ui.page}`}>\n          <p className={`whitespace-pre-wrap break-words text-[15px] leading-[1.55] ${ui.text}`}>\n            {post.content}\n          </p>\n        </div>\n      ) : null}\n\n      {/* Reshare indicator - opens ORIGINAL post */}")
    # Change description block to show originalContent only when reshared, not mix
    old_desc = "        {/* Description: show reshared post content if it's a reshare, otherwise own content */}\n        {(post.reshareOf && post.reshareData?.originalContent?.trim()) || post.content?.trim() ? (\n          <div className={`shrink-0 px-3 py-3 ${ui.page}`}>\n            <p className={`whitespace-pre-wrap break-words text-[15px] leading-[1.55] ${ui.text}`}>\n              {post.reshareOf && post.reshareData?.originalContent?.trim()\n                ? post.reshareData.originalContent\n                : post.content}\n            </p>\n          </div>\n        ) : null}"
    new_desc = "        {/* Original content - below indicator; own content if not reshare */}\n        {post.reshareOf ? (\n          post.reshareData?.originalContent?.trim() ? (\n            <div className={`shrink-0 px-3 py-3 ${ui.page}`}>\n              <p className={`whitespace-pre-wrap break-words text-[15px] leading-[1.55] ${ui.text}`}>\n                {post.reshareData.originalContent}\n              </p>\n            </div>\n          ) : null\n        ) : post.content?.trim() ? (\n          <div className={`shrink-0 px-3 py-3 ${ui.page}`}>\n            <p className={`whitespace-pre-wrap break-words text-[15px] leading-[1.55] ${ui.text}`}>\n              {post.content}\n            </p>\n          </div>\n        ) : null}"
    if old_desc in t:
        t = t.replace(old_desc, new_desc)
        print("desc replaced")
    p.write_text(t, encoding="utf-8")
    print("modal patched")
else:
    print("target1 not found")
