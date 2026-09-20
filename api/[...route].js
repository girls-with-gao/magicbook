import { handleRequest } from "../server.js";

export default async function handler(req, res) {
  const requestUrl = String(req.url || "/");
  const [pathname, query = ""] = requestUrl.split("?", 2);
  if (!pathname.startsWith("/api/")) {
    req.url = `/api${pathname.startsWith("/") ? pathname : `/${pathname}`}${query ? `?${query}` : ""}`;
  }
  await handleRequest(req, res);
}
