/* ===========================================================
   CONFIG — connect your email provider here.
   Paste the form endpoint from ConvertKit / Beehiiv / Buttondown /
   MailerLite etc. Every signup form on the site posts to it with
   a single "email" field. Leave empty to run in demo mode.
   =========================================================== */
const NEWSLETTER_ENDPOINT = "";

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

  // "How I work" flow: the active node advances as you scroll through it
  const flow = document.querySelector("[data-flow]");
  if (flow) {
    const nodes = [...flow.children];
    const update = () => {
      const r = flow.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.6)));
      const active = Math.min(nodes.length - 1, Math.floor(p * nodes.length));
      nodes.forEach((li, i) => {
        li.classList.toggle("is-active", i === active);
        li.classList.toggle("is-done", i < active);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  // Experiment filters
  const filters = document.querySelectorAll("[data-filter]");
  const exps = document.querySelectorAll(".exp[data-pillar]");
  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => b.classList.toggle("is-active", b === btn));
      exps.forEach((el) => { el.hidden = f !== "all" && el.dataset.pillar !== f; });
    });
  });

  // Signup forms
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  document.querySelectorAll("[data-signup]").forEach((form) => {
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector("button");
    const msg = form.querySelector(".signup__msg");

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
          const body = new FormData();
          body.append("email", email);
          await fetch(NEWSLETTER_ENDPOINT, { method: "POST", body, mode: "no-cors" });
        } else {
          console.info("[newsletter] Demo mode: set NEWSLETTER_ENDPOINT in assets/main.js to collect", email);
        }
        form.classList.add("is-done");
        msg.textContent = "You're in. The next experiment lands in your inbox this week.";
      } catch (err) {
        msg.textContent = "Something went wrong. Please try again.";
        msg.classList.add("is-error");
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
