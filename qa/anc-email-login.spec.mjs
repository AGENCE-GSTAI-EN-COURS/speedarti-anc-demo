import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";

test("le lien e-mail ouvre la démo et termine la connexion dans un nouvel onglet", async ({ page, context, baseURL }) => {
  let challenge;
  await context.route("https://egvwiwtfkqrqlumhysuj.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/auth/v1/otp") {
      expect(url.searchParams.get("redirect_to")).toBe(baseURL + "/");
      const body = request.postDataJSON();
      expect(body).toMatchObject({
        email: "compte-fictif@example.test", create_user: false, code_challenge_method: "s256",
      });
      challenge = body.code_challenge;
      await route.fulfill({ json: {} });
    } else if (url.pathname === "/auth/v1/token") {
      const body = request.postDataJSON();
      expect(url.searchParams.get("grant_type")).toBe("pkce");
      expect(body.auth_code).toBe("code-de-test");
      expect(createHash("sha256").update(body.code_verifier).digest("base64url")).toBe(challenge);
      await route.fulfill({ json: { access_token: "jeton-fictif", user: { id: "artisan-fictif" } } });
    } else {
      expect(url.pathname).toBe("/functions/v1/anc-dev");
      expect(request.headers().authorization).toBe("Bearer jeton-fictif");
      await route.fulfill({ json: [] });
    }
  });

  await page.goto("/");
  await page.getByText("Sauvegarde ANC DEV", { exact: true }).click();
  await page.getByLabel("Adresse du compte de test").fill("compte-fictif@example.test");
  await page.getByRole("button", { name: "Recevoir un lien par e-mail" }).click();
  await expect(page.getByRole("status").filter({ hasText: "dernier e-mail" })).toBeVisible();
  const returned = await context.newPage();
  await returned.goto("/?code=code-de-test");
  await expect(returned.getByText("Compte de test connecté.", { exact: true })).toBeVisible();
  await expect(returned.getByRole("button", { name: "Sauvegarder le dossier ouvert" })).toBeVisible();
  expect(new URL(returned.url()).searchParams.has("code")).toBe(false);
});

test("un lien ouvert dans un autre navigateur invite à en demander un nouveau", async ({ page }) => {
  await page.goto("/?code=code-sans-verificateur");
  await expect(page.getByText("Redemandez un lien dans ce navigateur,", { exact: false })).toBeVisible();
  expect(new URL(page.url()).searchParams.has("code")).toBe(false);
});
