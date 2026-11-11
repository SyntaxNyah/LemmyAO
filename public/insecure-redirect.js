// Browsers upgrade http links to https, and a cached client.html never reaches the server's
// redirect, so send a page for an unencrypted server (connect=ws://) back to http here.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode !== "navigate" || url.protocol !== "https:") return;
  if (!url.searchParams.get("connect")?.startsWith("ws://")) return;
  url.protocol = "http:";
  event.respondWith(Response.redirect(url.href, 302));
});
