/* Career Connect front end.
   No ambassador email or phone number lives in this file. The roster is in
   netlify/lib/contacts.mjs, which only the server-side functions can read.
   send-request delivers email; contact-link hands the browser a phone number
   only when a student opens that ambassador's panel, so the "Text in
   Messages" button can open the phone's texting app.

   textRelay: true for ambassadors who gave a number. The number itself stays
   in the roster file. */

const ambassadors = [
  { id: 1, name: "Anthony Blunt", emailRelay: true, textRelay: false },
  { id: 2, name: "Ashari Claybrooks", emailRelay: true, textRelay: true },
  { id: 3, name: "Sinaya Gaston", emailRelay: true, textRelay: false },
  { id: 4, name: "Naiim Helaire", emailRelay: true, textRelay: true },
  { id: 5, name: "Victoria Kalenga", emailRelay: true, textRelay: true },
  { id: 6, name: "Emmanuel Nnanna", emailRelay: true, textRelay: true },
  { id: 7, name: "Ojuolape Esther Onatola", emailRelay: true, textRelay: false },
  { id: 8, name: "Omarion Rushing", emailRelay: true, textRelay: true }
];

const SCHOOL_DOMAIN = "gsumail.gram.edu";
const ENDPOINT = "/.netlify/functions/send-request";
const CONTACT_ENDPOINT = "/.netlify/functions/contact-link";
const phoneCache = new Map();

let selectedId = 1;
let sentRequest = null;
const ambassadorList = document.querySelector("#ambassadorList");
const bookingPanel = document.querySelector("#bookingPanel");

function selectedAmbassador() {
  return ambassadors.find(person => person.id === selectedId) || ambassadors[0];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
}

/* Direct texting. An sms: link opens Messages on iPhone and Mac (iMessage or
   SMS, the phone decides) and the default texting app on Android, with the
   body already typed. "?&body=" is the one form both platforms accept. */
function smsLink(person, phone, studentName, message) {
  const first = person.name.split(" ")[0];
  const intro = studentName ? `Hi ${first}, this is ${studentName} from Career Connect. ` : `Hi ${first}, I found you on Career Connect. `;
  return `sms:${phone}?&body=${encodeURIComponent(intro + message)}`;
}

/* Asks the relay for the number. Resolves null when the ambassador has no
   number or the relay is not deployed, and the panel stays email only. */
async function fetchPhone(person) {
  if (!person.textRelay) return null;
  if (phoneCache.has(person.id)) return phoneCache.get(person.id);
  try {
    const response = await fetch(`${CONTACT_ENDPOINT}?id=${person.id}`);
    const data = response.ok ? await response.json() : {};
    const phone = /^\+\d{8,15}$/.test(data.phone || "") ? data.phone : null;
    phoneCache.set(person.id, phone);
    return phone;
  } catch {
    return null;
  }
}

/* A vCard the student can save so the thread shows the ambassador's name.
   iPhone opens it as a contact preview; Android and desktop download it. */
function vcardLink(person, phone) {
  const parts = person.name.split(" ");
  const last = parts.pop();
  const card = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${parts.join(" ")};;;`,
    `FN:${person.name}`,
    "ORG:Grambling State University;Professional Development Center",
    "TITLE:Student Ambassador",
    `TEL;TYPE=CELL:${phone}`,
    "NOTE:Career Connect resume review ambassador",
    "END:VCARD"
  ].join("\r\n");
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(card)}`;
}

function vcardFilename(person) {
  return person.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + ".vcf";
}

let renderAmbassadors = function () {
  const query = document.querySelector("#searchInput").value.trim().toLowerCase();
  const matches = ambassadors.filter(person => person.name.toLowerCase().includes(query));
  document.querySelector("#matchCount").textContent = matches.length;

  ambassadorList.innerHTML = matches.length ? matches.map(person => `
    <article class="ambassador-card ${person.id === selectedId ? "selected" : ""}">
      <div>
        <h3>${escapeHtml(person.name)}</h3>
        <p>Student Ambassador. ${person.textRelay ? "Reachable by email or text." : "Reachable by email."}</p>
      </div>
      <button class="select-reviewer" data-id="${person.id}" type="button" aria-pressed="${person.id === selectedId}">
        ${person.id === selectedId ? "Selected" : "Start a request"}
      </button>
    </article>`).join("")
  : `<div class="empty-state"><strong>No ambassador found.</strong><p>Check the spelling or clear your search.</p></div>`;

  document.querySelectorAll(".select-reviewer").forEach(button => button.addEventListener("click", () => {
    selectedId = Number(button.dataset.id);
    sentRequest = null;
    renderAmbassadors();
    renderMessagePanel();
    if (window.innerWidth < 1000) bookingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

function renderMessagePanel() {
  const person = selectedAmbassador();
  const first = person.name.split(" ")[0];

  if (sentRequest && sentRequest.ambassadorId === person.id) {
    renderConfirmation(person);
    return;
  }

  bookingPanel.innerHTML = `
    <div class="booking-identity">
      <h3>${escapeHtml(person.name)}</h3>
      <p>Student Ambassador</p>
    </div>
    <form class="message-form" id="messageForm" novalidate>
      <label>Your name<input id="studentName" name="studentName" autocomplete="name" placeholder="Jordan Lee" required /></label>
      <label>Your university email
        <input id="studentEmail" name="studentEmail" type="email" autocomplete="email" placeholder="jordan.lee@${SCHOOL_DOMAIN}" required />
        <span class="field-hint">Use your @${SCHOOL_DOMAIN} address. ${escapeHtml(first)} replies here.</span>
      </label>
      <label>How should the tool notify ${escapeHtml(first)}?</label>
      <div class="channel-choice" role="radiogroup" aria-label="Ambassador notification method">
        <label class="channel-option"><input type="radio" name="channel" value="email" checked /> Email relay</label>
        <label class="channel-option ${person.textRelay ? "" : "disabled"}"><input type="radio" name="channel" value="text" ${person.textRelay ? "" : "disabled"} /> ${person.textRelay ? "Text relay" : "Text unavailable"}</label>
      </div>
      <label>Your message<textarea id="requestMessage" name="message" rows="6" required>I would like help reviewing my resume and would like to find a virtual meeting time that works for both of us.</textarea></label>
      <div id="formError" class="form-error" hidden></div>
      <button class="button button-gold full" id="secureSendButton" type="submit">Send securely through Career Connect</button>
      <div id="directSlot"></div>
      <p class="trust-note" id="trustNote">Neither person&rsquo;s email address or phone number appears in the conversation. Replies come to your university email.</p>
    </form>`;

  const form = document.querySelector("#messageForm");
  form.addEventListener("submit", handleSubmit);
  if (person.textRelay) addDirectText(form, person);
}

/* Fills the slot under the send button once the relay confirms a number.
   The number is never printed; it only rides inside the two links. */
async function addDirectText(form, person) {
  const phone = await fetchPhone(person);
  if (!phone || !form.isConnected || selectedId !== person.id) return;
  const first = person.name.split(" ")[0];

  form.querySelector("#directSlot").innerHTML = `
    <div class="or-divider" aria-hidden="true"><span>or</span></div>
    <div class="direct-text">
      <a class="button button-black full" id="textLink" href="#">Text ${escapeHtml(first)} in Messages</a>
      <p class="field-hint">Opens iMessage or your texting app with your message already typed. Works from your phone or a Mac.</p>
      <a class="contact-link" id="vcardLink" href="${vcardLink(person, phone)}" download="${vcardFilename(person)}">Save ${escapeHtml(first)} to Contacts</a>
    </div>`;
  form.querySelector("#trustNote").textContent = `Your email stays private when you use the secure send. Texting shares your number with ${first}, the same as any text.`;

  const textLink = form.querySelector("#textLink");
  const refreshTextLink = () => {
    textLink.href = smsLink(person, phone, form.studentName.value.trim(), form.message.value.trim());
  };
  refreshTextLink();
  form.studentName.addEventListener("input", refreshTextLink);
  form.message.addEventListener("input", refreshTextLink);
  textLink.addEventListener("click", () => showToast(`Opening Messages for ${first}`));
}

function renderConfirmation(person) {
  const first = person.name.split(" ")[0];
  bookingPanel.innerHTML = `
    <div class="booking-identity">
      <h3>${escapeHtml(person.name)}</h3>
      <p>Student Ambassador</p>
    </div>
    <div class="confirmation" role="status">
      <h3>Sent to ${escapeHtml(first)}.</h3>
      <p>Watch <strong>${escapeHtml(sentRequest.studentEmail)}</strong> for a reply, usually within two business days.</p>
      <button class="button button-black full" type="button" id="newRequestButton">Send another request</button>
    </div>`;
  document.querySelector("#newRequestButton").addEventListener("click", () => {
    sentRequest = null;
    renderMessagePanel();
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const person = selectedAmbassador();
  const errorBox = form.querySelector("#formError");
  const button = form.querySelector("#secureSendButton");

  const payload = {
    ambassadorId: person.id,
    studentName: form.studentName.value.trim(),
    studentEmail: form.studentEmail.value.trim().toLowerCase(),
    helpType: "Resume review",
    channel: new FormData(form).get("channel"),
    message: form.message.value.trim()
  };

  const problem = validate(payload);
  if (problem) return showError(errorBox, problem);

  errorBox.hidden = true;
  button.disabled = true;
  button.textContent = "Sending";

  try {
    const response = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if ([404, 405, 501].includes(response.status)) {
      throw new Error("The relay is not connected yet. Deploy the Netlify function to send for real.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "We could not send your request. Please try again in a moment.");

    sentRequest = { ...payload };
    renderConfirmation(person);
    bookingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`Request sent to ${person.name.split(" ")[0]}`);
  } catch (error) {
    showError(errorBox, error.message);
    button.disabled = false;
    button.textContent = "Send securely through Career Connect";
  }
}

function validate(p) {
  if (!p.studentName) return "Please enter your name.";
  if (!p.studentEmail.endsWith(`@${SCHOOL_DOMAIN}`)) return `Please use your @${SCHOOL_DOMAIN} email address.`;
  if (p.message.length < 10) return "Please write a short message so your ambassador knows what you need.";
  return null;
}

function showError(box, text) {
  box.textContent = text;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

/* Mobile nav */
const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector("#primaryNav");
navToggle.addEventListener("click", () => {
  const open = primaryNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
primaryNav.addEventListener("click", event => {
  if (event.target.tagName === "A") {
    primaryNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

/* Scroll reveal: sections and rows fade up once as they enter the viewport */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealObserver = reduceMotion || !("IntersectionObserver" in window) ? null : new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

function reveal(elements, stagger = 0) {
  elements.forEach((el, index) => {
    if (!revealObserver) return;
    el.classList.add("reveal");
    el.style.setProperty("--delay", `${index * stagger}s`);
    revealObserver.observe(el);
  });
}

reveal(document.querySelectorAll(".promise p"), 0.08);
reveal(document.querySelectorAll(".section-head, .filters, .booking-panel, .support-image, .steps li, footer"), 0);
document.querySelectorAll(".steps li").forEach((li, i) => li.style.setProperty("--delay", `${i * 0.12}s`));

const originalRenderAmbassadors = renderAmbassadors;
renderAmbassadors = function () {
  originalRenderAmbassadors();
  reveal(ambassadorList.querySelectorAll(".ambassador-card"), 0.06);
};

document.querySelector("#searchInput").addEventListener("input", renderAmbassadors);
renderAmbassadors();
renderMessagePanel();
