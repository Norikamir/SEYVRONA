// ==========================================================
//          CONTACT MODAL — works on every page
// ==========================================================

const CONTACT_FORM_ENDPOINT = "https://formspree.io/f/mppzgpyn";
const CONTACT_REQUEST_TIMEOUT_MS = 15000;

// ----------------------------------------------------------
// Shared dialog behaviour (also used by quiz-modal.js):
// focus moves into the dialog, Tab stays inside, the page behind is
// inert, and focus returns to the button that opened it.
// ----------------------------------------------------------
window.SeyvronaDialog = (function () {
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let current = null;

  function focusables(dialog) {
    return [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function onKeydown(e) {
    if (!current || e.key !== "Tab") return;
    const items = focusables(current.dialog);
    if (!items.length) {
      e.preventDefault();
      current.dialog.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !current.dialog.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !current.dialog.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  }

  function setBackgroundInert(overlay, on) {
    [...document.body.children].forEach((el) => {
      if (el === overlay || el.tagName === "SCRIPT") return;
      if (on) {
        if (el.hasAttribute("inert")) return;
        el.setAttribute("inert", "");
        el.dataset.dialogInert = "1";
      } else if (el.dataset.dialogInert) {
        el.removeAttribute("inert");
        delete el.dataset.dialogInert;
      }
    });
  }

  return {
    open(overlay, dialog, initialFocus) {
      if (current) this.close(current.overlay, { restoreFocus: false });
      current = { overlay, dialog, returnTo: document.activeElement };
      setBackgroundInert(overlay, true);
      document.addEventListener("keydown", onKeydown, true);
      requestAnimationFrame(() => {
        const target = initialFocus && initialFocus.offsetParent !== null ? initialFocus : dialog;
        target.focus({ preventScroll: true });
      });
    },
    close(overlay, opts = {}) {
      if (!current || current.overlay !== overlay) return;
      const returnTo = current.returnTo;
      current = null;
      setBackgroundInert(overlay, false);
      document.removeEventListener("keydown", onKeydown, true);
      if (opts.restoreFocus !== false && returnTo && document.contains(returnTo) && returnTo.focus) {
        returnTo.focus({ preventScroll: true });
      }
    }
  };
})();

// Links that act as buttons (role="button") also respond to the Space key.
document.addEventListener("keydown", (e) => {
  if (e.key !== " " && e.key !== "Spacebar") return;
  const el = e.target.closest ? e.target.closest('a[role="button"]') : null;
  if (!el) return;
  e.preventDefault();
  el.click();
});

document.addEventListener("DOMContentLoaded", () => {

  const overlay = document.createElement("div");
  overlay.className = "contact-modal-overlay";
  overlay.innerHTML = `
    <div class="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle" aria-describedby="contactModalDesc" tabindex="-1">
      <button type="button" class="contact-modal-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <span class="contact-modal-tag">GET IN TOUCH</span>
      <h3 id="contactModalTitle">Let's power your <span>future</span></h3>
      <p id="contactModalDesc">Tell us about your project and our team will get back to you within 24 hours.</p>

      <form class="contact-form" id="contactForm" novalidate>
        <div class="contact-form-row">
          <div class="contact-field" data-field="name">
            <label for="cf-name">Name</label>
            <input type="text" id="cf-name" name="name" placeholder="John Doe" autocomplete="name" required aria-describedby="cf-name-error">
            <span class="contact-field-error" id="cf-name-error">Please enter your name</span>
          </div>
          <div class="contact-field" data-field="email">
            <label for="cf-email">Email</label>
            <input type="email" id="cf-email" name="email" placeholder="john@example.com" autocomplete="email" required aria-describedby="cf-email-error">
            <span class="contact-field-error" id="cf-email-error">Please enter a valid email</span>
          </div>
        </div>

        <div class="contact-form-row">
          <div class="contact-field" data-field="phone">
            <label for="cf-phone">Phone (optional)</label>
            <input type="tel" id="cf-phone" name="phone" placeholder="+1(212)..." autocomplete="tel">
          </div>
          <div class="contact-field" data-field="subject">
            <label for="cf-subject">Subject</label>
            <select id="cf-subject" name="subject">
              <option value="General Inquiry">General Inquiry</option>
              <option value="Request a Quote">Request a Quote</option>
              <option value="Partnership">Partnership / Dealer</option>
              <option value="Other support">Other</option>
            </select>
          </div>
        </div>

        <div class="contact-field" data-field="message">
          <label for="cf-message">Message</label>
          <textarea id="cf-message" name="message" maxlength="1000" placeholder="Tell us about your project..." required aria-describedby="cf-message-error"></textarea>
          <span class="contact-field-error" id="cf-message-error">Please enter a message</span>
        </div>

        <input type="hidden" name="product" value="">
        <div class="contact-hp" aria-hidden="true">
          <label for="cf-company-site">Leave this field empty</label>
          <input type="text" id="cf-company-site" name="_gotcha" tabindex="-1" autocomplete="off">
        </div>

        <div class="contact-form-status" id="contactFormStatus" role="status" aria-live="polite"></div>

        <button type="submit" class="contact-submit-btn" id="contactSubmitBtn">
          <span class="spinner" aria-hidden="true"></span>
          <span class="contact-submit-text">Send Message</span>
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const modal = overlay.querySelector(".contact-modal");
  const closeBtn = overlay.querySelector(".contact-modal-close");
  const form = overlay.querySelector("#contactForm");
  const submitBtn = overlay.querySelector("#contactSubmitBtn");
  const statusBox = overlay.querySelector("#contactFormStatus");
  const subjectSelect = form.querySelector("#cf-subject");
  const productInput = form.querySelector('input[name="product"]');
  const honeypot = form.querySelector('input[name="_gotcha"]');
  const DEFAULT_SUBJECT = subjectSelect.value;

  let lastPrefill = "";
  let isSubmitting = false;
  let closeTimer = 0;

  function setSubject(subject) {
    subjectSelect.querySelectorAll("option[data-dynamic]").forEach((o) => o.remove());
    if (!subject) {
      subjectSelect.value = DEFAULT_SUBJECT;
      return;
    }
    const match = [...subjectSelect.options].find((o) => o.value === subject);
    if (!match) {
      // e.g. "Schedule a Consultation": shown as the selected subject
      const option = new Option(subject, subject);
      option.dataset.dynamic = "1";
      subjectSelect.add(option);
    }
    subjectSelect.value = subject;
  }

  function setMessage(text) {
    const current = form.message.value;
    if (text) {
      // Never overwrite what the visitor typed themselves.
      if (!current.trim() || current === lastPrefill) {
        form.message.value = text;
        lastPrefill = text;
      }
    } else if (lastPrefill && current === lastPrefill) {
      form.message.value = "";
      lastPrefill = "";
    }
  }

  function applyOptions(options = {}) {
    const product = options.product || "";
    productInput.value = product;
    setSubject(options.subject || (product ? "Request a Quote" : ""));
    let message = options.message || "";
    if (!message && product) message = `I'm interested in ${product}. Please contact me with a quote.`;
    setMessage(message);
  }

  function openModal(e, options) {
    if (e) e.preventDefault();
    clearTimeout(closeTimer);
    const trigger = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget : null;
    applyOptions(options || (trigger ? {
      subject: trigger.dataset.subject,
      message: trigger.dataset.message,
      product: trigger.dataset.product
    } : {}));
    if (overlay.classList.contains("active")) return;
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new Event("contactModalOpen"));
    document.getElementById("webgl")?.style.setProperty("visibility", "hidden");
    document.querySelector(".navbar")?.classList.add("blur-paused");
    const fine = window.matchMedia("(pointer: fine)").matches;
    window.SeyvronaDialog.open(overlay, modal, fine ? form.name : null);
  }

  function closeModal() {
    clearTimeout(closeTimer);
    if (!overlay.classList.contains("active")) return;
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    statusBox.className = "contact-form-status";
    statusBox.textContent = "";
    window.dispatchEvent(new Event("contactModalClose"));
    document.getElementById("webgl")?.style.setProperty("visibility", "visible");
    document.querySelector(".navbar")?.classList.remove("blur-paused");
    window.SeyvronaDialog.close(overlay);
  }

  window.openContactModal = function (options = {}) {
    openModal(null, options);
  };

  // Any element with class "contact-btn" (or data-contact-open) opens the modal;
  // data-subject / data-message / data-product prefill the form.
  document.querySelectorAll(".contact-btn, [data-contact-open]").forEach((btn) => {
    btn.addEventListener("click", openModal);
  });

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) closeModal();
  });

  // ---------- Validation ----------

  const fields = {
    name: form.querySelector('[data-field="name"]'),
    email: form.querySelector('[data-field="email"]'),
    message: form.querySelector('[data-field="message"]')
  };

  function showFieldError(key, show, text) {
    const field = fields[key];
    if (!field) return;
    field.classList.toggle("error", show);
    const input = field.querySelector("input, textarea");
    if (input) input.setAttribute("aria-invalid", show ? "true" : "false");
    const msg = field.querySelector(".contact-field-error");
    if (msg && text) msg.textContent = text;
  }

  function validate() {
    const nameOk = form.name.value.trim().length > 1;
    showFieldError("name", !nameOk, "Please enter your name");

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim());
    showFieldError("email", !emailOk, "Please enter a valid email");

    const messageOk = form.message.value.trim().length > 5;
    showFieldError("message", !messageOk, "Please enter a message");

    const firstInvalid = !nameOk ? form.name : !emailOk ? form.email : !messageOk ? form.message : null;
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  // Live re-validate once user starts fixing a field

  form.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      const field = el.closest(".contact-field");
      if (field && field.classList.contains("error")) {
        field.classList.remove("error");
        el.setAttribute("aria-invalid", "false");
      }
    });
  });

  // ---------- Submit ----------

  function showStatus(text, kind) {
    statusBox.textContent = text;
    statusBox.className = "contact-form-status show " + kind;
    statusBox.setAttribute("role", kind === "error" ? "alert" : "status");
  }

  function setLoading(on) {
    isSubmitting = on;
    submitBtn.classList.toggle("loading", on);
    submitBtn.disabled = on;
    form.setAttribute("aria-busy", on ? "true" : "false");
  }

  function onSuccess() {
    showStatus("Thanks! Your message has been sent — we'll be in touch soon.", "success");
    form.reset();
    productInput.value = "";
    lastPrefill = "";
    setSubject("");
    closeTimer = setTimeout(closeModal, 2200);
  }

  // Formspree answers with JSON: { ok, next } or { errors: [{ field, code, message }] }.
  async function describeFailure(res) {
    let data = null;
    try { data = await res.json(); } catch (_) { /* not JSON */ }
    if (res.status === 429) {
      return "Too many messages were sent just now. Please wait a minute and try again.";
    }
    const errors = data && Array.isArray(data.errors) ? data.errors : [];
    const fieldErrors = errors.filter((er) => er && fields[er.field]);
    if (fieldErrors.length) {
      fieldErrors.forEach((er) => showFieldError(er.field, true, er.message ? er.message.charAt(0).toUpperCase() + er.message.slice(1) : undefined));
      return "Please check the highlighted fields.";
    }
    if (res.status === 403 || res.status === 404 || res.status === 410) {
      return "The form is temporarily unavailable. Please try again later.";
    }
    if (res.status >= 500) {
      return "Our message service is having trouble. Please try again in a few minutes.";
    }
    return "Your message could not be sent. Please try again.";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    statusBox.className = "contact-form-status";
    statusBox.textContent = "";

    if (!validate()) return;

    // Honeypot: real visitors never see or fill this field.
    if (honeypot.value) {
      onSuccess();
      return;
    }

    setLoading(true);
    const controller = "AbortController" in window ? new AbortController() : null;
    const timer = setTimeout(() => controller && controller.abort(), CONTACT_REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(CONTACT_FORM_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form),
        signal: controller ? controller.signal : undefined
      });

      if (res.ok) {
        onSuccess();
      } else {
        showStatus(await describeFailure(res), "error");
      }
    } catch (err) {
      const timedOut = err && err.name === "AbortError";
      showStatus(timedOut
        ? "The request took too long. Please check your connection and try again."
        : "Network error — please check your connection and try again.", "error");
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  });
});
