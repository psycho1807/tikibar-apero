import { getStore } from "@netlify/blobs";
import webpush from "web-push";

function page(title, message) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #1b1410; color: #f4e8d8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 24px; box-sizing: border-box; }
  .card { max-width: 360px; }
  h1 { font-size: 48px; margin: 0 0 12px; }
  p { font-size: 18px; line-height: 1.4; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function htmlResponse(status, title, message) {
  return new Response(page(title, message), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export default async (req, context) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order_id");

  if (!orderId) {
    return htmlResponse(400, "⚠️", "Aucune commande spécifiée.");
  }

  const store = getStore("push-subscriptions");
  const record = await store.get(orderId, { type: "json" });

  if (!record || !record.subscription) {
    return htmlResponse(200, "🤷", "Commande introuvable ou déjà notifiée.");
  }

  const publicKey = Netlify.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Netlify.env.get("VAPID_PRIVATE_KEY");
  const subject = Netlify.env.get("VAPID_SUBJECT") || "mailto:patrice.becasseau@gmail.com";

  if (!publicKey || !privateKey) {
    return htmlResponse(500, "❌", "Clés VAPID manquantes côté serveur.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const cocktail = record.cocktail || "ta commande";
  const payload = JSON.stringify({
    title: "🍹 En préparation !",
    body: `${cocktail} arrive, ça se prépare !`,
  });

  try {
    await webpush.sendNotification(record.subscription, payload);
    await store.delete(orderId);
    return htmlResponse(200, "✅", `Notification envoyée à ${record.guest || "l'invité"} pour ${cocktail}.`);
  } catch (err) {
    // 404/410 means the guest's subscription has expired (they closed the tab, etc.)
    await store.delete(orderId);
    return htmlResponse(200, "😕", "Impossible d'envoyer la notif (l'invité a peut-être fermé la page).");
  }
};

export const config = {
  path: "/api/mark-preparing",
};
