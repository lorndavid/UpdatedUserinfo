// *** REPLACE WITH YOUR DEPLOYMENT URL ***
const API_URL =
  "https://script.google.com/macros/s/AKfycbzgh10Xqkw8rzXxxUOKvtMAfyA1VQ6zAy4TVi59WGO_jggKvFUbJojhD3TiqEbcooWz/exec";

const DB_NAME = "EmpAppDB_V6"; // New version to clear cache
const STORE_NAME = "employees";
const DB_VERSION = 1;
const PLACEHOLDER_IMG =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==";

const DROPDOWN_OPTIONS = {
  វត្តមាន: ["NO", "Scan"],
  ស្ថានភាព: ["កំពុងសិក្សា", "បានបញ្ចប់ការសិក្សា", "បានឈប់រៀន"],
  ជំនាន់: ["ទី១", "ទី២", "ទី៣", "ទី៤"],
  ឆ្នាំសិក្សា: ["ឆ្នាំទី១", "ឆ្នាំទី២", "ឆ្នាំទី៣", "ឆ្នាំទី៤", "ឈប់រៀន"],
  ចន្ទ: ["Uptime", "ពេញម៉ោង", "ពេលយប់", "មួយព្រឹក", "មួយរសៀល"],
  អង្គារ៍: ["Uptime", "ពេញម៉ោង", "ពេលយប់", "មួយព្រឹក", "មួយរសៀល"],
  ពុធ: ["Uptime", "ពេញម៉ោង", "ពេលយប់", "មួយព្រឹក", "មួយរសៀល"],
  ប្រហសប្បត្តិ៍: ["Uptime", "ពេញម៉ោង", "ពេលយប់", "មួយព្រឹក", "មួយរសៀល"],
  សុក្រ: ["Uptime", "ពេញម៉ោង", "ពេលយប់", "មួយព្រឹក", "មួយរសៀល"],
  សៅរ៍: ["Uptime", "ពេញម៉ោង", "ពេលយប់", "មួយព្រឹក", "មួយរសៀល"],
  អាទិត្យ: ["Uptime", "ពេញម៉ោង", "ពេលយប់", "មួយព្រឹក", "មួយរសៀល"],
};

// DOM Elements
const mainContainer = document.getElementById("mainContainer");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const loader = document.getElementById("loader");
const editView = document.getElementById("editView");
const editForm = document.getElementById("editForm");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const scrollTopBtn = document.getElementById("scrollTopBtn");

// Mobile Search Elements
const mobileSearchBtn = document.getElementById("mobileSearchBtn");
const closeSearchBtn = document.getElementById("closeSearchBtn");
const appHeader = document.getElementById("appHeader");

// Views
const navAll = document.getElementById("navAll");
const navFilter = document.getElementById("navFilter");
const navStats = document.getElementById("navStats");
const filterView = document.getElementById("filterView");
const statsView = document.getElementById("statsView");
const classFilterContainer = document.getElementById("classFilterContainer");
const classSearchInput = document.getElementById("classSearchInput");
const filterBackdrop = document.getElementById("filterBackdrop");

let globalData = [];
let displayedData = [];
let renderCount = 0;
const BATCH_SIZE = 50;
let currentEditRow = null;
let db = null;

window.onload = async () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  window.addEventListener("scroll", handleScroll);
  window.addEventListener("scroll", toggleScrollBtn);

  try {
    await initDB();
    await loadData();
  } catch (e) {
    fetchDataFromAPI();
  }
};

// --- MOBILE SEARCH LOGIC ---
mobileSearchBtn.onclick = () => {
  appHeader.classList.add("search-active");
  setTimeout(() => searchInput.focus(), 100); // Auto focus (Alert Keyboard)
};

closeSearchBtn.onclick = () => {
  appHeader.classList.remove("search-active");
  searchInput.value = ""; // Optional: Clear search on close
  resetGrid(globalData);
};

// --- VIEW SWITCHING LOGIC ---
function switchView(viewId) {
  filterView.classList.remove("active");
  statsView.classList.remove("active");
  editView.classList.remove("active");

  [navAll, navFilter, navStats].forEach((btn) =>
    btn.classList.remove("active")
  );

  if (viewId === "filter") {
    filterView.classList.add("active");
    navFilter.classList.add("active");
    setTimeout(() => classSearchInput.focus(), 300);
  } else if (viewId === "stats") {
    statsView.classList.add("active");
    navStats.classList.add("active");
    renderStats();
  } else {
    navAll.classList.add("active");
    if (viewId === "reset") resetGrid(globalData);
  }
}

navAll.onclick = () => switchView("reset");
navFilter.onclick = () => {
  switchView("filter");
  renderFilterButtons();
};
navStats.onclick = () => switchView("stats");

document.getElementById("closeFilterBtn").onclick = () => switchView("home");
filterBackdrop.onclick = () => switchView("home");
document.getElementById("closeStatsBtn").onclick = () => switchView("home");
document.getElementById("backBtn").onclick = () =>
  editView.classList.remove("active");

// --- THEME ---
themeToggleBtn.onclick = () => {
  const current = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
};
function updateThemeIcon(theme) {
  themeToggleBtn.querySelector("i").className =
    theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

// --- SCROLL & DB ---
function toggleScrollBtn() {
  if (window.scrollY > 300) {
    scrollTopBtn.classList.remove("hidden");
    scrollTopBtn.classList.add("visible");
  } else {
    scrollTopBtn.classList.remove("visible");
    setTimeout(() => {
      if (window.scrollY <= 300) scrollTopBtn.classList.add("hidden");
    }, 300);
  }
}
scrollTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

function initDB() {
  return new Promise((r, j) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME))
        e.target.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    req.onsuccess = (e) => {
      db = e.target.result;
      r();
    };
    req.onerror = j;
  });
}
function saveToDB(data) {
  if (db)
    db.transaction([STORE_NAME], "readwrite")
      .objectStore(STORE_NAME)
      .put({ key: "data", value: data });
}
async function loadData() {
  return new Promise((r) => {
    if (!db) return r(null);
    db
      .transaction([STORE_NAME], "readonly")
      .objectStore(STORE_NAME)
      .get("data").onsuccess = (e) => {
      if (e.target.result) {
        globalData = e.target.result.value;
        resetGrid(globalData);
        r();
      } else fetchDataFromAPI();
    };
  });
}
function fetchDataFromAPI() {
  loader.style.display = "block";
  mainContainer.innerHTML = "";
  mainContainer.appendChild(loader);
  fetch(API_URL)
    .then((res) => res.json())
    .then((data) => {
      globalData = data;
      resetGrid(globalData);
      saveToDB(data);
    })
    .catch(() => {
      loader.style.display = "none";
      alert("Connection Failed.");
    });
}

// --- RENDER & SEARCH ---
function resetGrid(data) {
  mainContainer.innerHTML = "";
  displayedData = data;
  renderCount = 0;
  if (!data || data.length === 0) {
    mainContainer.innerHTML =
      '<div class="empty-state"><i class="fa-solid fa-box-open empty-icon"></i><p>No Data Found</p></div>';
    return;
  }
  loadMoreItems();
}
function loadMoreItems() {
  if (renderCount >= displayedData.length) return;
  const frag = document.createDocumentFragment();
  const nextLimit = Math.min(renderCount + BATCH_SIZE, displayedData.length);
  for (let i = renderCount; i < nextLimit; i++) {
    frag.appendChild(createCard(displayedData[i]));
  }
  mainContainer.appendChild(frag);
  renderCount = nextLimit;
}
function handleScroll() {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200)
    loadMoreItems();
}

function createCard(item) {
  const card = document.createElement("div");
  card.className = "card";
  const img =
    item.image && item.image.startsWith("http") ? item.image : PLACEHOLDER_IMG;
  card.innerHTML = `<img src="${img}" class="card-img" loading="lazy"><div class="card-name">${
    item.name
  }</div><div class="card-id">${item.id || ""}</div>`;
  card.onclick = () => openEditView(item);
  return card;
}

searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  resetGrid(
    globalData.filter(
      (item) =>
        (item.name || "").toLowerCase().includes(term) ||
        (String(item.id) || "").toLowerCase().includes(term)
    )
  );
});
document.getElementById("clearSearch").onclick = () => {
  searchInput.value = "";
  resetGrid(globalData);
};

// --- FEATURES ---
function renderFilterButtons() {
  classFilterContainer.innerHTML = "";
  const classes = [
    ...new Set(
      globalData.map((i) => i.class_name || i["ថ្នាក់រៀន"] || "Unknown")
    ),
  ].sort();
  const allBtn = document.createElement("button");
  allBtn.className = "class-chip";
  allBtn.innerHTML = `<i class="fa-solid fa-border-all"></i> Show All`;
  allBtn.onclick = () => {
    resetGrid(globalData);
    switchView("home");
  };
  classFilterContainer.appendChild(allBtn);
  classes.forEach((cls) => {
    if (!cls || cls.trim() === "") return;
    const btn = document.createElement("button");
    btn.className = "class-chip";
    btn.innerText = cls;
    btn.onclick = () => {
      resetGrid(
        globalData.filter((i) => i.class_name == cls || i["ថ្នាក់រៀន"] == cls)
      );
      switchView("home");
      navFilter.classList.add("active");
      navAll.classList.remove("active");
    };
    classFilterContainer.appendChild(btn);
  });
}
classSearchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  Array.from(classFilterContainer.children).forEach((chip) => {
    if (chip.innerText.includes("Show All")) return;
    chip.style.display = chip.innerText.toLowerCase().includes(term)
      ? "block"
      : "none";
  });
});

function renderStats() {
  document.getElementById("totalCount").innerText = globalData.length;
  document.getElementById("maleCount").innerText = globalData.filter(
    (i) => i.gender == "ប្រុស" || i["ភេទ"] == "ប្រុស" || i.gender == "Male"
  ).length;
  document.getElementById("femaleCount").innerText = globalData.filter(
    (i) => i.gender == "ស្រី" || i["ភេទ"] == "ស្រី" || i.gender == "Female"
  ).length;
  renderStatList("jobStatsList", "job_section", "ផ្នែកការងារ");
  renderStatList("placeStatsList", "birthplace", "ទីកន្លែងកំណើត");
}
function renderStatList(eid, k1, k2) {
  const container = document.getElementById(eid);
  container.innerHTML = "";
  const counts = {};
  globalData.forEach((i) => {
    const val = i[k1] || i[k2] || "Unspecified";
    counts[val] = (counts[val] || 0) + 1;
  });
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([l, c]) => {
      const d = document.createElement("div");
      d.className = "stat-row";
      d.innerHTML = `<span>${l}</span><span class="stat-val">${c}</span>`;
      container.appendChild(d);
    });
}

function openEditView(item) {
  currentEditRow = item.row_index;
  const img =
    item.image && item.image.startsWith("http") ? item.image : PLACEHOLDER_IMG;
  document.getElementById("editProfileImg").src = img;
  document.getElementById("editProfileName").innerText = item.name;
  document.getElementById("editProfileID").innerText =
    "ID: " + (item.id || "N/A");
  editForm.innerHTML = "";
  createInput("គោត្តនាមនិងនាម", "name", item.name);
  createInput("អត្តលេខ-DI", "id", item.id);
  createInput(
    "ថ្នាក់រៀន (Class)",
    "class_name",
    item.class_name || item["ថ្នាក់រៀន"]
  );
  createInput("Link-code (Image)", "image", item.image);
  const priorityKeys = ["វត្តមាន", "ស្ថានភាព", "ជំនាន់", "ឆ្នាំសិក្សា"];
  priorityKeys.forEach((key) => {
    if (DROPDOWN_OPTIONS[key]) createSelect(key, key, item[key] || "");
    else createInput(key, key, item[key] || "");
  });
  const days = [
    "ចន្ទ",
    "អង្គារ៍",
    "ពុធ",
    "ប្រហសប្បត្តិ៍",
    "សុក្រ",
    "សៅរ៍",
    "អាទិត្យ",
  ];
  days.forEach((day) => createSelect(day, day, item[day] || ""));
  Object.keys(item).forEach((key) => {
    if (
      ![
        "name",
        "id",
        "image",
        "row_index",
        "class_name",
        "gender",
        "job_section",
        "birthplace",
      ].includes(key) &&
      !priorityKeys.includes(key) &&
      !days.includes(key)
    ) {
      createInput(key, key, item[key]);
    }
  });
  editView.classList.add("active");
}

function createInput(l, k, v) {
  const d = document.createElement("div");
  d.className = "form-group";
  d.innerHTML = `<label>${l}</label><input type="text" name="${k}" value="${
    v || ""
  }" data-orig="${v || ""}">`;
  editForm.appendChild(d);
}
function createSelect(l, k, v) {
  const d = document.createElement("div");
  d.className = "form-group";
  let o = DROPDOWN_OPTIONS[k]
    .map(
      (op) =>
        `<option value="${op}" ${v === op ? "selected" : ""}>${op}</option>`
    )
    .join("");
  d.innerHTML = `<label>${l}</label><select name="${k}" data-orig="${
    v || ""
  }"><option value="">Select...</option>${o}</select>`;
  editForm.appendChild(d);
}

document.getElementById("saveBtn").onclick = () => {
  const inputs = editForm.querySelectorAll("input, select");
  const updates = [];
  let hasChange = false;
  inputs.forEach((input) => {
    if (input.value !== input.dataset.orig) {
      updates.push({ header: input.name, value: input.value });
      hasChange = true;
    }
  });
  if (!hasChange) return alert("No changes.");
  document.getElementById("loadingModal").classList.add("active");
  saveToDB(globalData); // Save locally first
  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ rowIndex: currentEditRow, updates: updates }),
  })
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("loadingModal").classList.remove("active");
      if (data.status === "success") {
        document.getElementById("successModal").classList.add("active");
        editView.classList.remove("active");
      } else alert("Error: " + data.message);
    })
    .catch(() => {
      document.getElementById("loadingModal").classList.remove("active");
      alert("Saved locally. Network failed.");
    });
};
document.getElementById("closeModalBtn").onclick = () =>
  document.getElementById("successModal").classList.remove("active");
