// ==========================================================
//          CONTACT MODAL — works on every page
// ==========================================================

const CONTACT_FORM_ENDPOINT = "https://formspree.io/f/mppzgpyn";

document.addEventListener("DOMContentLoaded", () => {

  const overlay = document.createElement("div");
  overlay.className = "contact-modal-overlay";
  overlay.innerHTML = `
    <div class="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle">
      <button type="button" class="contact-modal-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <span class="contact-modal-tag">GET IN TOUCH</span>
      <h3 id="contactModalTitle">Let's power your <span>future</span></h3>
      <p>Tell us about your project and our team will get back to you within 24 hours.</p>

      <form class="contact-form" id="contactForm" novalidate>
        <div class="contact-form-row">
          <div class="contact-field" data-field="name">
            <label for="cf-name">Name</label>
            <input type="text" id="cf-name" name="name" placeholder="John Doe" autocomplete="name">
            <span class="contact-field-error">Please enter your name</span>
          </div>
          <div class="contact-field" data-field="email">
            <label for="cf-email">Email</label>
            <input type="email" id="cf-email" name="email" placeholder="john@example.com" autocomplete="email">
            <span class="contact-field-error">Please enter a valid email</span>
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
          <textarea id="cf-message" name="message" maxlength="1000" placeholder="Tell us about your project..."></textarea>
          <span class="contact-field-error">Please enter a message</span>
        </div>

        <div class="contact-form-status" id="contactFormStatus"></div>

        <button type="submit" class="contact-submit-btn" id="contactSubmitBtn">
          <span class="spinner"></span>
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


 function openModal(e){

  if(e) e.preventDefault();
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
  window.dispatchEvent(new Event("contactModalOpen"));
  document.getElementById("webgl")?.style.setProperty("visibility", "hidden");
}
function closeModal(){
  
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  statusBox.className = "contact-form-status";
  statusBox.textContent = "";
  window.dispatchEvent(new Event("contactModalClose"));
  document.getElementById("webgl")?.style.setProperty("visibility", "visible");
}

  window.openContactModal = function(options = {}){
    openModal();
    if(options.subject && form.subject.querySelector(`option[value="${options.subject}"]`)){
      form.subject.value = options.subject;
    }
    if(options.message){
      form.message.value = options.message;
  }
};

  // Any button/link with class "contact-btn" opens the modal

  document.querySelectorAll(".contact-btn").forEach(btn => {
    btn.addEventListener("click", openModal);
  });

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if(e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && overlay.classList.contains("active")) closeModal();
  });

  // ---------- Validation ----------

  function showFieldError(field, show){
    field.classList.toggle("error", show);
  }
  function validate(){
    let valid = true;
    const nameField = form.querySelector('[data-field="name"]');
    const emailField = form.querySelector('[data-field="email"]');
    const messageField = form.querySelector('[data-field="message"]');

    const nameOk = form.name.value.trim().length > 1;
    showFieldError(nameField, !nameOk);
    if(!nameOk) valid = false;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim());
    showFieldError(emailField, !emailOk);
    if(!emailOk) valid = false;

    const messageOk = form.message.value.trim().length > 5;
    showFieldError(messageField, !messageOk);
    if(!messageOk) valid = false;

    return valid;
  }

  // Live re-validate once user starts fixing a field

  form.querySelectorAll("input, textarea").forEach(el => {
    el.addEventListener("input", () => {
      el.closest(".contact-field")?.classList.remove("error");
    });
  });

  // ---------- Submit ----------

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusBox.className = "contact-form-status";
    statusBox.textContent = "";

    if(!validate()) return;

    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    try {
      const res = await fetch(CONTACT_FORM_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form)
      });

      if(res.ok){
        statusBox.textContent = "Thanks! Your message has been sent — we'll be in touch soon.";
        statusBox.className = "contact-form-status show success";
        form.reset();
        setTimeout(closeModal, 2200);
      } else {
        throw new Error("Request failed");
      }
    } catch(err){
      statusBox.textContent = "Something went wrong. Please try again or email us directly.";
      statusBox.className = "contact-form-status show error";
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });
});