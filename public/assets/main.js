/* ===========================================================
   Newsletter signups post to /api/subscribe (src/worker.js), which
   adds the email to the Brevo list. The Brevo API key lives only in
   the Worker as a secret, never in this file.
   Set to "" to run in demo mode (nothing is sent).
   =========================================================== */
const NEWSLETTER_ENDPOINT = "/api/subscribe";

(() => {
  const root = document.documentElement;
  root.classList.remove("no-js");

  // Hero line-reveal on load
  requestAnimationFrame(() => document.body.classList.add("is-loaded"));

  // Nav background on scroll
  const nav = document.getElementById("nav");
  const onScroll = () => nav && nav.classList.toggle("is-scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Scroll reveals
  const revealEls = document.querySelectorAll(".reveal, .meter");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  // "How I work" progress line follows scroll
  const steps = document.querySelector("[data-steps]");
  if (steps) {
    const update = () => {
      const r = steps.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.6)));
      steps.style.setProperty("--progress", (p * 100).toFixed(1) + "%");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  // Pillar filters (homepage Experiments + /blog).
  // Each [data-filter-scope] has its own chips; cards carry data-pillar from the
  // Pillar field in Keystatic. An optional [data-limit] caps how many show at once.
  document.querySelectorAll("[data-filter-scope]").forEach((scope) => {
    const group = scope.querySelector("[data-filter-group]");
    if (!group) return;
    const buttons = group.querySelectorAll("[data-filter]");
    const cards = scope.querySelectorAll(".post-card[data-pillar]");
    const limitEl = scope.querySelector("[data-limit]");
    const limit = limitEl ? parseInt(limitEl.dataset.limit, 10) || 0 : 0;
    const empty = scope.querySelector("[data-filter-empty]");

    const apply = (filter, initial = false) => {
      let shown = 0;
      cards.forEach((card) => {
        const match = filter === "all" || card.dataset.pillar === filter;
        const show = match && (!limit || shown < limit);
        card.hidden = !show;
        if (show) { shown++; if (!initial) card.classList.add("is-in"); }
      });
      if (empty) empty.hidden = shown > 0;
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => {
          const on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        apply(btn.dataset.filter);
      });
    });
    apply("all", true);
  });

  // Signup forms
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  document.querySelectorAll("[data-signup]").forEach((form) => {
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector("button");
    const msg = form.querySelector(".signup__msg");

    // Honeypot field for bots (hidden from people)
    const hp = document.createElement("input");
    hp.type = "text"; hp.name = "company"; hp.tabIndex = -1; hp.autocomplete = "off";
    hp.setAttribute("aria-hidden", "true");
    hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
    form.appendChild(hp);

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const email = input.value.trim();
      msg.classList.remove("is-error");

      if (!EMAIL_RE.test(email)) {
        msg.textContent = "That email doesn't look right. Mind checking it?";
        msg.classList.add("is-error");
        input.focus();
        return;
      }

      btn.disabled = true;
      try {
        if (NEWSLETTER_ENDPOINT) {
          const res = await fetch(NEWSLETTER_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, company: hp.value }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ? data.error + (data.detail ? " (" + data.detail + ")" : "") : "Request failed");
          }
        } else {
          console.info("[newsletter] Demo mode: set NEWSLETTER_ENDPOINT in assets/main.js to collect", email);
        }
        form.classList.add("is-done");
        msg.textContent = "You're in. The next experiment lands in your inbox this week.";
      } catch (err) {
        msg.textContent = err && err.message && err.message !== "Request failed" && !/fetch|network/i.test(err.message) ? err.message : "Something went wrong. Please try again.";
        msg.classList.add("is-error");
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Freebie pop-up (/marketing-tools): email required, adds to the Brevo freebies
  // list, then opens the Google Doc. Opened by any [data-freebie="<doc url>"] button.
  const modal = document.getElementById("freebie-modal");
  if (modal) {
    const form = modal.querySelector("[data-freebie-form]");
    const input = form.querySelector('input[type="email"]');
    const submit = form.querySelector('button[type="submit"]');
    const msg = form.querySelector(".signup__msg");
    const nameEl = modal.querySelector("[data-freebie-name]");
    let docUrl = "";
    let opener = null;

    const hp = document.createElement("input");
    hp.type = "text"; hp.name = "company"; hp.tabIndex = -1; hp.autocomplete = "off";
    hp.setAttribute("aria-hidden", "true");
    hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
    form.appendChild(hp);

    const valid = () => EMAIL_RE.test(input.value.trim());
    const sync = () => { submit.disabled = !valid(); };

    const open = (btn) => {
      opener = btn;
      docUrl = btn.dataset.freebie;
      nameEl.textContent = btn.dataset.freebieTitle || "this freebie";
      form.reset(); msg.textContent = ""; msg.classList.remove("is-error"); sync();
      modal.hidden = false;
      document.documentElement.classList.add("modal-open");
      requestAnimationFrame(() => { modal.classList.add("is-open"); input.focus(); });
    };
    const close = () => {
      modal.classList.remove("is-open");
      document.documentElement.classList.remove("modal-open");
      modal.hidden = true;
      if (opener) opener.focus();
    };

    document.querySelectorAll("[data-freebie]").forEach((btn) => btn.addEventListener("click", () => open(btn)));
    modal.querySelectorAll("[data-modal-close]").forEach((el) => el.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") { // keep focus inside the pop-up
        const f = [...modal.querySelectorAll("button:not([disabled]), input:not([tabindex='-1'])")];
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    input.addEventListener("input", sync);

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      msg.classList.remove("is-error");
      if (!valid()) {
        msg.textContent = "Please enter your email to get the freebie.";
        msg.classList.add("is-error");
        input.focus();
        return;
      }
      submit.disabled = true;
      msg.textContent = "Subscribing…";
      try {
        const res = await fetch(NEWSLETTER_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: input.value.trim(), list: "freebies", company: hp.value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Something went wrong. Please try again.");
        }
        msg.textContent = "You're in! Opening your freebie…";
        window.location.href = docUrl;
      } catch (err) {
        msg.textContent = err && err.message && !/fetch|network/i.test(err.message) ? err.message : "Something went wrong. Please try again.";
        msg.classList.add("is-error");
        sync();
      }
    });
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
