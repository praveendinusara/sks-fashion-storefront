import { getStoreState } from "../lib/catalog.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const state = await getStoreState();
    response.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    return response.status(200).json({ settings: state.settings });
  } catch (error) {
    console.error("Unable to load site settings", error);
    return response.status(500).json({ error: "Site settings are temporarily unavailable" });
  }
}

