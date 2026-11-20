/* Adaptateur de l’interface ANC vers son projet de développement. */
(() => {
  "use strict";
  const flow = document.currentScript.dataset.flow;
  const endpoint = "https://egvwiwtfkqrqlumhysuj.supabase.co";
  const publishableKey = "sb_publishable_ksCwF5dwHuwstHuO1vTAnQ_jgWrk52u";
  const root = document.createElement("details");
  root.className = "card";
  root.style.cssText = "margin:12px auto;max-width:1100px;padding:12px 16px";
  root.innerHTML = `
    <summary><strong>Sauvegarde ANC DEV</strong></summary>
    <p>Compte de test requis. Utilisez uniquement des dossiers fictifs.</p>
    <form method="post" data-anc-signin>
      <label>Adresse du compte de test <input class="input" type="email" name="email" autocomplete="username" required></label>
      <label>Mot de passe <input class="input" type="password" name="password" autocomplete="current-password" required></label>
      <button class="btn primary" type="submit">Se connecter</button>
    </form>
    <div data-anc-session hidden>
      <p><label><input type="checkbox" data-anc-fictif> Je confirme que le dossier ne contient que des données fictives.</label></p>
      <div>
        <button class="btn primary" type="button" data-anc-action="save">Sauvegarder le dossier ouvert</button>
        <label>Étude sauvegardée <select class="select" data-anc-studies></select></label>
        <button class="btn secondary" type="button" data-anc-action="load">Ouvrir</button>
        <button class="btn secondary" type="button" data-anc-action="list">Actualiser</button>
        <button class="btn secondary" type="button" data-anc-action="logout">Se déconnecter</button>
      </div>
    </div>
    <p role="status" aria-live="polite" data-anc-status></p>`;
  document.querySelector("#app")?.before(root);
  const form = root.querySelector("[data-anc-signin]");
  const panel = root.querySelector("[data-anc-session]");
  const studies = root.querySelector("[data-anc-studies]");
  const fictional = root.querySelector("[data-anc-fictif]");
  const message = root.querySelector("[data-anc-status]");
  let session;
  let busy = false;

  function logout() {
    session = null;
    fictional.checked = false;
    studies.replaceChildren();
    form.hidden = false;
    panel.hidden = true;
  }

  async function perform(operation) {
    if (busy) return;
    busy = true;
    root.setAttribute("aria-busy", "true");
    try {
      await operation();
    } catch (error) {
      if (error.status === 401 || error.status === 403) logout();
      message.textContent = error.message || "Sauvegarde ANC indisponible.";
    } finally {
      root.removeAttribute("aria-busy");
      busy = false;
    }
  }

  async function api(path, input) {
    let response;
    try {
      response = await fetch(endpoint + path, {
        method: "POST",
        headers: {
          apikey: publishableKey,
          "Content-Type": "application/json",
          ...(session ? { Authorization: "Bearer " + session.access_token } : {}),
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new Error("Connexion indisponible. Le dossier reste enregistré dans ce navigateur.");
    }
    if (response.status === 204) return null;
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(typeof result.error === "string" && result.error !== "invalid_grant"
        ? result.error
        : "Connexion refusée ou service indisponible.");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function service(action, body = {}) {
    return api("/functions/v1/anc-dev", { flow, action, ...body });
  }

  function linksKey(localId) {
    return "speedarti-anc-dev:" + flow + ":" + session.user.id + ":" + localId;
  }

  async function refresh(selectedId) {
    const rows = await service("list");
    const options = rows.map(({ id, reference, revision }) => {
      const label = reference.slice(flow.length + 1, -9);
      return new Option(label + " · révision " + revision, id);
    });
    studies.replaceChildren(...options);
    if (selectedId && rows.some((row) => row.id === selectedId)) studies.value = selectedId;
  }

  function adapter() {
    return flow === "src" ? window.SpeedArtiANC : window.ANCRealWorkflow;
  }

  async function saveStudy() {
    if (!fictional.checked) throw new Error("Confirmez que le dossier est fictif.");
    const data = adapter().cloudExport();
    const localId = data?.studyId || data?.id;
    if (!localId) throw new Error("Ouvrez une étude à sauvegarder.");
    const key = linksKey(localId);
    const link = JSON.parse(localStorage.getItem(key) || "null") || {
      id: crypto.randomUUID(),
      revision: 0,
    };
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data)));
    const signature = Array.from(new Uint8Array(digest)).join(",");
    if (link.signature !== signature || !link.requestId) {
      link.signature = signature;
      link.requestId = crypto.randomUUID();
    }
    // Garder le même identifiant si la réponse réseau n’arrive pas.
    localStorage.setItem(key, JSON.stringify(link));
    const result = await service("save", {
      id: link.id,
      revision: link.revision,
      requestId: link.requestId,
      fiction: true,
      data,
    });
    localStorage.setItem(key, JSON.stringify({ id: result.id, revision: result.revision }));
    await refresh(result.id);
    message.textContent = "Dossier sauvegardé dans Supabase · révision " + result.revision + ".";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    perform(async () => {
      const inputs = new FormData(form);
      try {
        session = await api("/auth/v1/token?grant_type=password", {
          email: String(inputs.get("email")).trim(),
          password: inputs.get("password"),
        });
      } finally {
        form.elements.password.value = "";
      }
      await refresh();
      form.hidden = true;
      panel.hidden = false;
      message.textContent = "Compte de test connecté.";
    });
  });

  panel.addEventListener("click", (event) => {
    const action = event.target.closest("[data-anc-action]")?.dataset.ancAction;
    if (!session || !action) return;
    perform(async () => {
      if (action === "save") return saveStudy();
      if (action === "list") {
        await refresh(studies.value);
        message.textContent = "Liste des sauvegardes mise à jour.";
      }
      if (action === "load" && studies.value) {
        if (!window.confirm("Ouvrir cette version Supabase sur cet appareil ?")) return;
        const saved = await service("load", { id: studies.value });
        const localId = await adapter().cloudImport(saved.data);
        localStorage.setItem(linksKey(localId), JSON.stringify({ id: saved.id, revision: saved.revision }));
        message.textContent = "Dossier ouvert depuis Supabase · révision " + saved.revision + ".";
      }
      if (action === "logout") {
        try {
          await api("/auth/v1/logout?scope=local", {});
        } finally {
          logout();
        }
        message.textContent = "Compte de test déconnecté.";
      }
    });
  });
})();
