// *** REPLACE WITH YOUR DEPLOYMENT URL ***
const API_URL =
  "https://script.google.com/macros/s/AKfycbzgh10Xqkw8rzXxxUOKvtMAfyA1VQ6zAy4TVi59WGO_jggKvFUbJojhD3TiqEbcooWz/exec";

const DB_NAME = "EmpAppDB_FinalV2";
const STORE_NAME = "employees";
const DB_VERSION = 1;
const PLACEHOLDER_IMG =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==";

// --- DROPDOWN CONFIGURATION ---
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

const mainContainer = document.getElementById("mainContainer");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const refreshBtn = document.getElementById("refreshBtn");
const editView = document.getElementById("editView");
const backBtn = document.getElementById("backBtn");
const saveBtn = document.getElementById("saveBtn");
const editForm = document.getElementById("editForm");
const modal = document.getElementById("successModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const loader = document.getElementById("loader");

let globalData = [];
let displayedData = [];
let renderCount = 0;
const BATCH_SIZE = 50;
let currentEditRow = null;
let db = null;

// --- Init ---
window.onload = async () => {
  window.addEventListener("scroll", handleScroll);
  try {
    await initDB();
    await loadData();
  } catch (e) {
    fetchDataFromAPI();
  }
};

refreshBtn.onclick = fetchDataFromAPI;

// --- Infinite Scroll ---
function handleScroll() {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    loadMoreItems();
  }
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

// --- DB Logic ---
function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_NAME))
        d.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    req.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };
    req.onerror = (e) => reject(e);
  });
}
function saveToDB(data) {
  if (!db) return;
  const tx = db.transaction([STORE_NAME], "readwrite");
  tx.objectStore(STORE_NAME).put({ key: "data", value: data });
}
async function loadData() {
  return new Promise((resolve) => {
    if (!db) return resolve(null);
    const tx = db.transaction([STORE_NAME], "readonly");
    const req = tx.objectStore(STORE_NAME).get("data");
    req.onsuccess = () => {
      if (req.result) {
        globalData = req.result.value;
        resetGrid(globalData);
        resolve();
      } else {
        fetchDataFromAPI();
      }
    };
    req.onerror = () => fetchDataFromAPI();
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
    .catch((err) => {
      loader.style.display = "none";
      alert("Connection Failed.");
    });
}

function resetGrid(data) {
  mainContainer.innerHTML = "";
  displayedData = data;
  renderCount = 0;
  if (!data || data.length === 0) {
    mainContainer.innerHTML = '<p class="loading-state">No data found.</p>';
    return;
  }
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
  clearSearchBtn.style.display = term ? "block" : "none";
  const filtered = globalData.filter((item) => {
    const n = (item.name || "").toLowerCase();
    const i = (String(item.id) || "").toLowerCase();
    return n.includes(term) || i.includes(term);
  });
  resetGrid(filtered);
});
clearSearchBtn.onclick = () => {
  searchInput.value = "";
  clearSearchBtn.style.display = "none";
  resetGrid(globalData);
};

// --- Edit View Logic ---
function openEditView(item) {
  currentEditRow = item.row_index;
  const img =
    item.image && item.image.startsWith("http") ? item.image : PLACEHOLDER_IMG;
  document.getElementById("editProfileImg").src = img;
  document.getElementById("editProfileName").innerText = item.name;
  document.getElementById("editProfileID").innerText =
    "ID: " + (item.id || "N/A");

  editForm.innerHTML = "";

  // 1. Core Fields (Always Input)
  createInput("គោត្តនាមនិងនាម", "name", item.name);
  createInput("អត្តលេខ-DI", "id", item.id);
  createInput("Link-code (Image)", "image", item.image);

  // 2. Specific Fields (Dropdowns prioritized)
  const priorityKeys = ["វត្តមាន", "ស្ថានភាព", "ជំនាន់", "ឆ្នាំសិក្សា"];
  priorityKeys.forEach((key) => {
    if (DROPDOWN_OPTIONS[key]) {
      createSelect(key, key, item[key] || "");
    } else {
      createInput(key, key, item[key] || "");
    }
  });

  // 3. Days of the Week
  const days = [
    "ចន្ទ",
    "អង្គារ៍",
    "ពុធ",
    "ប្រហសប្បត្តិ៍",
    "សុក្រ",
    "សៅរ៍",
    "អាទិត្យ",
  ];
  days.forEach((day) => {
    createSelect(day, day, item[day] || "");
  });

  // 4. Remaining Fields
  Object.keys(item).forEach((key) => {
    if (
      !["name", "id", "image", "row_index"].includes(key) &&
      !priorityKeys.includes(key) &&
      !days.includes(key)
    ) {
      createInput(key, key, item[key]);
    }
  });

  editView.classList.remove("hidden");
}

function createInput(label, key, value) {
  const div = document.createElement("div");
  div.className = "form-group";
  div.innerHTML = `<label>${label}</label><input type="text" name="${key}" value="${
    value || ""
  }" data-orig="${value || ""}">`;
  editForm.appendChild(div);
}

function createSelect(label, key, value) {
  const div = document.createElement("div");
  div.className = "form-group";

  let optionsHtml = `<option value="">Select...</option>`;
  const options = DROPDOWN_OPTIONS[key] || [];

  options.forEach((opt) => {
    const selected = value === opt ? "selected" : "";
    optionsHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
  });

  div.innerHTML = `<label>${label}</label>
                     <select name="${key}" data-orig="${
    value || ""
  }">${optionsHtml}</select>`;
  editForm.appendChild(div);
}

backBtn.onclick = () => editView.classList.add("hidden");
closeModalBtn.onclick = () => modal.classList.remove("active");

saveBtn.onclick = () => {
  // Select both inputs and selects
  const inputs = editForm.querySelectorAll("input, select");
  const updates = [];
  let hasChange = false;

  inputs.forEach((input) => {
    if (input.value !== input.dataset.orig) {
      updates.push({ header: input.name, value: input.value });
      const rec = globalData.find((r) => r.row_index === currentEditRow);
      if (rec) {
        rec[input.name] = input.value;
        if (input.name === "name") rec["name"] = input.value;
      }
      hasChange = true;
    }
  });

  if (!hasChange) return alert("No changes.");

  saveBtn.innerText = "...";
  saveBtn.disabled = true;
  saveToDB(globalData);

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ rowIndex: currentEditRow, updates: updates }),
  })
    .then((res) => res.json())
    .then((data) => {
      saveBtn.innerText = "រក្សាទុក";
      saveBtn.disabled = false;
      if (data.status === "success") {
        modal.classList.add("active");
        editView.classList.add("hidden");
        // No full re-render needed
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch(() => {
      saveBtn.innerText = "រក្សាទុក";
      saveBtn.disabled = false;
      alert("Saved locally.");
    });
};
