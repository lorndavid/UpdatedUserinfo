// *** REPLACE THIS URL WITH YOUR NEW DEPLOYMENT URL ***
const API_URL =
  "https://script.google.com/macros/s/AKfycbzgh10Xqkw8rzXxxUOKvtMAfyA1VQ6zAy4TVi59WGO_jggKvFUbJojhD3TiqEbcooWz/exec";

const DB_NAME = "EmpAppDB_Final";
const STORE_NAME = "employees";
const DB_VERSION = 1;

// Built-in Icon (Works Offline)
const PLACEHOLDER_IMG =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==";

// DOM Elements
const mainContainer = document.getElementById("mainContainer");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const refreshBtn = document.getElementById("refreshBtn");
const editView = document.getElementById("editView");
const saveBtn = document.getElementById("saveBtn");
const editForm = document.getElementById("editForm");
const modal = document.getElementById("successModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const loader = document.getElementById("loader");

let globalData = [];
let currentEditRow = null;
let db = null;

window.onload = async () => {
  try {
    await initDB();
    await loadData();
  } catch (e) {
    fetchDataFromAPI();
  }
};

refreshBtn.onclick = fetchDataFromAPI;

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
        renderGrid(globalData);
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
      renderGrid(globalData);
      saveToDB(data);
    })
    .catch((err) => {
      loader.style.display = "none";
      alert("Connection Failed. Checking local data...");
    });
}

// --- RENDER GRID (WITH FIX FOR EMPTY CARDS) ---
function renderGrid(data) {
  mainContainer.innerHTML = "";
  if (!data || data.length === 0) {
    mainContainer.innerHTML =
      '<p style="text-align:center; padding:20px;">No data found.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  // Render limit (100) for performance
  const limit = Math.min(data.length, 100);
  let count = 0;

  for (let i = 0; i < data.length; i++) {
    if (count >= limit) break; // Stop after 100 rendered

    const item = data[i];

    // *** FIX: Skip if Name is missing or empty ***
    if (!item.name || item.name.trim() === "") {
      continue;
    }

    const card = document.createElement("div");
    card.className = "card";
    const imgUrl =
      item.image && item.image.startsWith("http")
        ? item.image
        : PLACEHOLDER_IMG;

    card.innerHTML = `
            <img src="${imgUrl}" class="card-img" loading="lazy">
            <div class="card-name">${item.name}</div>
            <div class="card-id">${item.id || ""}</div>
        `;
    card.onclick = () => openEditView(item);
    fragment.appendChild(card);
    count++;
  }
  mainContainer.appendChild(fragment);
}

// --- SEARCH ---
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  clearSearchBtn.style.display = term ? "block" : "none";

  const filtered = globalData.filter((item) => {
    // Filter Logic: Name Matches AND Name is not empty
    const hasName = item.name && item.name.trim() !== "";
    const matches =
      (item.name || "").toLowerCase().includes(term) ||
      (String(item.id) || "").toLowerCase().includes(term);
    return hasName && matches;
  });

  // Render Search Results
  mainContainer.innerHTML = "";
  filtered.slice(0, 50).forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    const imgUrl =
      item.image && item.image.startsWith("http")
        ? item.image
        : PLACEHOLDER_IMG;
    card.innerHTML = `<img src="${imgUrl}" class="card-img"><div class="card-name">${item.name}</div><div class="card-id">${item.id}</div>`;
    card.onclick = () => openEditView(item);
    mainContainer.appendChild(card);
  });
});

clearSearchBtn.onclick = () => {
  searchInput.value = "";
  clearSearchBtn.style.display = "none";
  renderGrid(globalData);
};

// --- EDIT VIEW ---
function openEditView(item) {
  currentEditRow = item.row_index;
  const imgUrl =
    item.image && item.image.startsWith("http") ? item.image : PLACEHOLDER_IMG;

  document.getElementById("editProfileImg").src = imgUrl;
  document.getElementById("editProfileName").innerText = item.name;

  editForm.innerHTML = "";

  // 1. Name & ID
  createInput("គោត្តនាមនិងនាម", "name", item.name);
  createInput("អត្តលេខ-DI", "id", item.id);

  // 2. Status (Prioritized)
  const statusValue = item["វត្តមាន"] || "";
  createInput("វត្តមាន (Status)", "វត្តមាន", statusValue);

  // 3. Image
  createInput("Link-code", "image", item.image);

  // 4. Other Fields
  Object.keys(item).forEach((key) => {
    const skip = ["name", "id", "image", "row_index", "វត្តមាន"];
    if (!skip.includes(key)) {
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

document.getElementById("backBtn").onclick = () =>
  editView.classList.add("hidden");

// --- SAVE ---
saveBtn.onclick = () => {
  const inputs = editForm.querySelectorAll("input");
  const updates = [];
  let hasChange = false;

  inputs.forEach((input) => {
    if (input.value !== input.dataset.orig) {
      updates.push({ header: input.name, value: input.value });

      const rec = globalData.find((r) => r.row_index === currentEditRow);
      if (rec) {
        rec[input.name] = input.value;
        if (input.name === "name") rec["គោត្តនាមនិងនាម"] = input.value;
      }
      hasChange = true;
    }
  });

  if (!hasChange) return alert("No changes to save.");

  saveBtn.innerText = "Saving...";
  saveBtn.disabled = true;

  saveToDB(globalData); // Save Local

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ rowIndex: currentEditRow, updates: updates }),
  })
    .then((res) => res.json())
    .then((data) => {
      saveBtn.innerText = "រក្សាទុក";
      saveBtn.disabled = false;

      if (data.status === "success") {
        modal.classList.add("active"); // Show Modal
        editView.classList.add("hidden");
        renderGrid(globalData);
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch(() => {
      saveBtn.innerText = "Save";
      saveBtn.disabled = false;
      alert("Network Failed. Saved locally only.");
    });
};

closeModalBtn.onclick = () => modal.classList.remove("active");
modal.onclick = (e) => {
  if (e.target === modal) modal.classList.remove("active");
};
