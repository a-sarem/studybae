const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function safeTrim(v) {
  return (v || "").toString().trim();
}

function initialsFromName(name) {
  const parts = safeTrim(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("is-show"), 1200);
}

// ---------- profile storage ----------
function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem("studybuddy_profile") || "null");
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  localStorage.setItem("studybuddy_profile", JSON.stringify(profile));
}

// ---------- invites storage ----------
function loadInvites() {
  // Read from any key you might have used during edits
  const keys = ["studybuddy_invites", "studybuddy_invite", "invites", "study_invites"];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
  }
  return [];
}

function saveInvites(invites) {
  localStorage.setItem("studybuddy_invites", JSON.stringify(invites));
}

function addInvite(invite) {
  const invites = loadInvites();

  const key = `${invite.name}|${invite.course}|${invite.time}|${invite.style}`;
  const exists = invites.some(
    (i) => `${i.name}|${i.course}|${i.time}|${i.style}` === key
  );

  if (!exists) invites.unshift(invite);
  saveInvites(invites);
}

// ---------- INDEX: save profile then go to matches ----------
(function initIndex() {
  const form = $("#profileForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = document.getElementById("photo")?.files?.[0] || null;

    async function fileToDataUrl(f) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    }

    let photoDataUrl = null;
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Image too large. Please choose a photo under ~1.5MB for this demo.");
        return;
      }
      photoDataUrl = await fileToDataUrl(file);
    }

    const profile = {
      name: safeTrim($("#name")?.value),
      course: safeTrim($("#course")?.value),
      availability: safeTrim($("#availability")?.value),
      style: safeTrim($("#style")?.value),
      goal: safeTrim($("#goal")?.value),
      bio: safeTrim($("#bio")?.value),
      photo: photoDataUrl,
      createdAt: Date.now(),
    };

    if (!profile.name || !profile.course || !profile.availability || !profile.style) {
      alert("Please fill in Name, Course, Availability, and Study style.");
      return;
    }

    saveProfile(profile);
    window.location.href = "matches.html";
  });

  const resetBtn = document.getElementById("resetProfile");
  resetBtn?.addEventListener("click", () => {
    localStorage.removeItem("studybuddy_profile");
    form.reset();
    showToast("Profile reset");
  });
})();

// ---------- MATCHES ----------
(function initMatches() {
  const cardsWrap = $(".cards");
  if (!cardsWrap) return;

  const profile = loadProfile();

  // Insert "You" card
  if (profile) {
    const meCard = document.createElement("article");
    meCard.className = "card profile profile--me";
    meCard.dataset.course = profile.course;
    meCard.dataset.time = profile.availability;
    meCard.dataset.style = profile.style;

    meCard.innerHTML = `
      <div class="profile__top">
        <div class="avatar" aria-hidden="true">
          ${
            profile.photo
              ? `<img src="${profile.photo}" alt="Profile photo">`
              : `${initialsFromName(profile.name)}`
          }
        </div>
        <div>
          <h3 class="profile__name">${profile.name} <span class="pill pill--me">You</span></h3>
          <p class="muted">Goal: ${profile.goal ? profile.goal : "—"}</p>
        </div>
      </div>
      <div class="profile__tags">
        <span class="pill">${profile.course}</span>
        <span class="pill">${profile.availability}</span>
        <span class="pill">${profile.style}</span>
      </div>
      <p class="profile__bio">${profile.bio ? profile.bio : "No bio yet."}</p>
      <button class="btn btn--ghost btn--full js-edit" type="button">Edit my profile</button>
    `;
    cardsWrap.prepend(meCard);

    $(".js-edit", meCard)?.addEventListener("click", () => {
      window.location.href = "index.html#profile";
    });
  }

  // Planner (works whether or not profile exists)
  const genPlanBtn = document.getElementById("genPlan");
  const planTime = document.getElementById("planTime");
  const planFormat = document.getElementById("planFormat");
  const planMsg = document.getElementById("planMsg");
  const copyPlanMsg = document.getElementById("copyPlanMsg");

  function pickTime(avail) {
    const a = (avail || "").toLowerCase();
    if (a.includes("morning")) return "Tomorrow morning (9:00 AM)";
    if (a.includes("afternoon")) return "Tomorrow afternoon (2:00 PM)";
    if (a.includes("evening")) return "Tonight (7:00 PM)";
    if (a.includes("weekend")) return "This weekend (Saturday 11:00 AM)";
    return "This week (pick a time)";
  }

  function pickFormat(style) {
    const s = (style || "").toLowerCase();
    if (s.includes("quiet")) return "Quiet focus + 10-min recap";
    if (s.includes("talk")) return "Work problems out loud";
    if (s.includes("flash")) return "Flashcards + quick quiz rounds";
    if (s.includes("group")) return "Group-style accountability session";
    return "General study session";
  }

  genPlanBtn?.addEventListener("click", () => {
    const p = loadProfile();
    if (!p) {
      showToast("Create a profile first");
      window.location.href = "index.html#profile";
      return;
    }

    const time = pickTime(p.availability);
    const format = pickFormat(p.style);
    const msg = `Hey! Want to study ${p.course} together? I’m free ${time}. We can do: ${format}.`;

    if (planTime) planTime.value = time;
    if (planFormat) planFormat.value = format;
    if (planMsg) planMsg.value = msg;

    showToast("Plan generated");
  });

  copyPlanMsg?.addEventListener("click", async () => {
    const text = planMsg?.value || "";
    if (!text || text === "—") {
      showToast("Generate a plan first");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied");
    } catch {
      alert("Copy failed — you can manually copy the message.");
    }
  });

  // Filters & sorting
  const fCourse = $("#fCourse");
  const fTime = $("#fTime");
  const fStyle = $("#fStyle");
  const fSort = $("#fSort");

  function scoreCard(card) {
    if (!profile) return 0;
    let score = 0;
    if (card.dataset.course === profile.course) score += 50;
    if (card.dataset.time === profile.availability) score += 25;
    if (card.dataset.style === profile.style) score += 25;
    return score;
  }

  function attachScoreUI(card) {
    if (card.classList.contains("profile--me")) return;

    const top = card.querySelector(".profile__top");
    if (!top) return;

    const sc = scoreCard(card);
    card.dataset.score = String(sc);

    const existing = card.querySelector(".score");
    if (existing) {
      existing.innerHTML = `${sc}<small>/100</small>`;
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "profile__headerRow";
    wrapper.appendChild(top);

    const scoreEl = document.createElement("div");
    scoreEl.className = "score";
    scoreEl.innerHTML = `${sc}<small>/100</small>`;

    wrapper.appendChild(scoreEl);
    card.insertBefore(wrapper, card.firstChild);
  }

  function getCards() {
    return $$(".profile", cardsWrap);
  }

  function applyFiltersAndSort() {
    const c = fCourse?.value || "all";
    const t = fTime?.value || "all";
    const s = fStyle?.value || "all";
    const sortMode = fSort?.value || "best";

    const cards = getCards();
    cards.forEach(attachScoreUI);

    cards.forEach((card) => {
      if (card.classList.contains("profile--me")) {
        card.style.display = "";
        return;
      }
      const ok =
        (c === "all" || card.dataset.course === c) &&
        (t === "all" || card.dataset.time === t) &&
        (s === "all" || card.dataset.style === s);

      card.style.display = ok ? "" : "none";
    });

    const sortable = cards
      .filter((card) => !card.classList.contains("profile--me"))
      .filter((card) => card.style.display !== "none");

    sortable.sort((a, b) => {
      if (sortMode === "az") {
        const an = a.querySelector(".profile__name")?.textContent || "";
        const bn = b.querySelector(".profile__name")?.textContent || "";
        return an.localeCompare(bn);
      }
      return Number(b.dataset.score || 0) - Number(a.dataset.score || 0);
    });

    sortable.forEach((card) => cardsWrap.appendChild(card));
  }

  [fCourse, fTime, fStyle, fSort].forEach(
    (el) => el && el.addEventListener("change", applyFiltersAndSort)
  );

  // Modal (use existing markup if present)
  const modal = $("#inviteModal");
  const modalText = $("#modalText");
  const msgText = $("#msgText");
  const copyMsg = $("#copyMsg");

  function openModal(text, message) {
    if (!modal) return;
    if (modalText) modalText.textContent = text;
    if (msgText) msgText.textContent = message || "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  $(".modal__backdrop", modal)?.addEventListener("click", closeModal);
  $$(".js-close", modal).forEach((b) => b.addEventListener("click", closeModal));

  copyMsg?.addEventListener("click", async () => {
    const text = msgText?.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied");
    } catch {
      alert("Copy failed — you can manually copy the message.");
    }
  });

  function buildInviteMessage(targetName, targetCourse, targetTime) {
    const myName = profile?.name ? profile.name : "I";
    const courseLine =
      profile?.course && targetCourse ? `Want to study ${targetCourse} together?` : "Want to study together?";
    const timeLine =
      profile?.availability && targetTime ? `I’m usually free ${targetTime.toLowerCase()}.` : "";
    return `Hey ${targetName}! I’m ${myName}. ${courseLine} ${timeLine}`.trim();
  }

  // Single reliable invite click handler (event delegation)
  cardsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-invite");
    if (!btn) return;

    const card = btn.closest(".profile");
    const name = card?.querySelector(".profile__name")?.textContent || "this person";
    const course = card?.dataset.course || "";
    const time = card?.dataset.time || "";
    const msg = buildInviteMessage(name, course, time);

    addInvite({
      name,
      course,
      time,
      style: card?.dataset.style || "",
      note: "Invite sent from Matches page.",
      createdAt: Date.now(),
    });

    showToast("Saved to My invites");
    openModal(`Your invite was sent to ${name}.`, msg);
  });
  console.log("INVITE SAVED:", loadInvites());


  applyFiltersAndSort();
})();

// ---------- INVITES PAGE ----------
(function initInvitesPage() {
  const list = document.getElementById("inviteList");
  const empty = document.getElementById("emptyState");
  const clearBtn = document.getElementById("clearInvites");
  const demoReset = document.getElementById("demoReset");

  if (!list || !empty) return;

  function render() {
    const invites = loadInvites();

    if (invites.length === 0) {
      empty.style.display = "";
      list.style.display = "none";
      list.innerHTML = "";
      return;
    }

    empty.style.display = "none";
    list.style.display = "grid";

    list.innerHTML = invites
      .map(
        (i) => `
      <article class="card profile">
        <div class="profile__top">
          <div class="avatar" aria-hidden="true">${initialsFromName(i.name)}</div>
          <div>
            <h3 class="profile__name">${i.name}</h3>
            <p class="muted">Saved invite</p>
          </div>
        </div>
        <div class="profile__tags">
          <span class="pill">${i.course}</span>
          <span class="pill">${i.time}</span>
          <span class="pill">${i.style}</span>
        </div>
        <p class="profile__bio">${i.note || "Invite sent from Matches."}</p>
      </article>
    `
      )
      .join("");
  }

  clearBtn?.addEventListener("click", () => {
    localStorage.removeItem("studybuddy_invites");
    showToast("Cleared invites");
    render();
  });

  demoReset?.addEventListener("click", () => {
    localStorage.removeItem("studybuddy_profile");
    localStorage.removeItem("studybuddy_invites");
    showToast("Demo reset");
    setTimeout(() => (window.location.href = "index.html"), 600);
  });

  render();
})();

// Show the matches section
document.getElementById('matchesSection').style.display = 'block';



