import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Liste de tous les ingrédients gérables depuis /admin.html
const ALL_INGREDIENTS = [
  "gin", "rhum_blanc", "rhum_ambre", "vodka", "tequila", "whisky",
  "triple_sec", "campari", "vermouth_rouge", "st_germain",
  "vin_rouge", "vin_blanc", "vin_rose",
  "biere_corona", "biere_desperados", "biere_leffe",
  "tonic", "ginger_beer", "vin_petillant", "eau_gazeuse",
  "jus_ananas", "jus_cranberry", "sirop_sucre", "angostura",
  "creme_coco", "glace_pilee", "sucre_canne", "citron_vert", "menthe", "sel",
  "coca", "redbull", "limonade", "jus_fruits", "perrier"
];

function defaultStock(): Record<string, boolean> {
  const s: Record<string, boolean> = {};
  for (const key of ALL_INGREDIENTS) s[key] = true;
  return s;
}

export default async (req: Request, context: Context) => {
  const store = getStore("tikibar-stock");

  if (req.method === "GET") {
    const existing = await store.get("ingredients", { type: "json" });
    const stock = existing || defaultStock();
    return new Response(JSON.stringify(stock), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "POST") {
    const adminKey = req.headers.get("x-admin-key");
    const expectedKey = Netlify.env.get("TIKIBAR_ADMIN_KEY");
    if (!expectedKey || adminKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    let body: Record<string, boolean>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const existing = await store.get("ingredients", { type: "json" });
    const current = existing || defaultStock();
    const updated = { ...current, ...body };
    await store.setJSON("ingredients", updated);

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/stock"
};
