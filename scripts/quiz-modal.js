document.addEventListener("DOMContentLoaded", () => {

  const overlay = document.createElement("div");
  overlay.className = "contact-modal-overlay quiz-modal-overlay";
  overlay.innerHTML = `
    <div class="contact-modal quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quizModalTitle">
      <button type="button" class="contact-modal-close quiz-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <span class="contact-modal-tag">FIND YOUR FIT</span>
      <h3 id="quizModalTitle">What solar setup fits <span>you</span>?</h3>

      <div class="quiz-progress"><div class="quiz-progress-bar" id="quizProgressBar"></div></div>

      <div class="quiz-step" data-step="0">
        <p class="quiz-question">What's your main goal?</p>
        <div class="quiz-options">
          <button type="button" class="quiz-option" data-key="priority" data-value="bill">Lower my electric bill</button>
          <button type="button" class="quiz-option" data-key="priority" data-value="backup">Backup power during outages</button>
          <button type="button" class="quiz-option" data-key="priority" data-value="smart">Full smart home & security</button>
        </div>
      </div>

      <div class="quiz-step" data-step="1" hidden>
        <p class="quiz-question">What kind of property is it?</p>
        <div class="quiz-options">
          <button type="button" class="quiz-option" data-key="property" data-value="home">Home</button>
          <button type="button" class="quiz-option" data-key="property" data-value="business">Business</button>
          <button type="button" class="quiz-option" data-key="property" data-value="industrial">Industrial facility</button>
        </div>
      </div>

      <div class="quiz-step" data-step="2" hidden>
        <p class="quiz-question">Roughly, your monthly electric bill?</p>
        <div class="quiz-options">
          <button type="button" class="quiz-option" data-key="bill" data-value="low">Under $150</button>
          <button type="button" class="quiz-option" data-key="bill" data-value="mid">$150–400</button>
          <button type="button" class="quiz-option" data-key="bill" data-value="high">$400+</button>
        </div>
      </div>

      <div class="quiz-step quiz-result" data-step="3" hidden>
        <span class="contact-modal-tag">RECOMMENDED FOR YOU</span>
        <h3 id="quizResultTitle">Independence</h3>
        <p id="quizResultDesc">Full backup power &amp; smart control</p>
        <button type="button" class="contact-submit-btn" id="quizGetQuoteBtn">
          <span class="contact-submit-text">Get My Exact Quote</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector(".quiz-close");
  const steps = overlay.querySelectorAll(".quiz-step");
  const progressBar = overlay.querySelector("#quizProgressBar");
  const resultTitle = overlay.querySelector("#quizResultTitle");
  const resultDesc = overlay.querySelector("#quizResultDesc");
  const getQuoteBtn = overlay.querySelector("#quizGetQuoteBtn");

  const answers = {};
  let currentStep = 0;

  const plans = {
    starter: { name: "Starter", desc: "Solar essentials for lower bills" },
    independence: { name: "Independence", desc: "Full backup power & smart control" },
    full: { name: "Full Control", desc: "Complete smart home ecosystem" }
  };

  function openQuiz(){
    currentStep = 0;
    for (const key in answers) delete answers[key];
    showStep(0);
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
  function closeQuiz(){
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  function showStep(index){
    steps.forEach(step => step.hidden = Number(step.dataset.step) !== index);
    progressBar.style.width = ((index) / (steps.length - 1) * 100) + "%";
  }

  function computePlan(){
    if (answers.priority === "smart") return plans.full;
    if (answers.priority === "backup") return plans.independence;
    if (answers.bill === "high") return plans.independence;
    return plans.starter;
  }

  overlay.querySelectorAll(".quiz-option").forEach(btn => {
    btn.addEventListener("click", () => {
      answers[btn.dataset.key] = btn.dataset.value;
      if (currentStep < 2) {
        currentStep++;
        showStep(currentStep);
      } else {
        const plan = computePlan();
        resultTitle.textContent = plan.name;
        resultDesc.textContent = plan.desc;
        currentStep = 3;
        showStep(3);
      }
    });
  });

  getQuoteBtn.addEventListener("click", () => {
    closeQuiz();
    const plan = computePlan();
    window.openContactModal({
      subject: "Request a Quote",
      message: `Quiz result — recommended plan: ${plan.name}. Property: ${answers.property || "n/a"}. Goal: ${answers.priority || "n/a"}. Monthly bill: ${answers.bill || "n/a"}.`
    });
  });

  document.querySelectorAll(".quote-quiz-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openQuiz();
    });
  });

  closeBtn.addEventListener("click", closeQuiz);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeQuiz(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) closeQuiz();
  });
});