const state = {
  sessionId: null,
  images: [],
  imageOrder: [],
  selectedId: null,
  previewTimer: null,
};

const statusEl = document.getElementById("status");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const thumbsEl = document.getElementById("thumbs");
const previewEl = document.getElementById("preview");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const tagsInput = document.getElementById("tags");
const categoryInput = document.getElementById("category");
const draftInput = document.getElementById("draft");
const createButton = document.getElementById("create-post");
const clearButton = document.getElementById("clear-session");

const exifCamera = document.getElementById("exif-camera");
const exifFocal = document.getElementById("exif-focal");
const exifAperture = document.getElementById("exif-aperture");
const exifIso = document.getElementById("exif-iso");
const exifGps = document.getElementById("exif-gps");

const defaultTags = JSON.parse(document.body.dataset.defaultTags || "[]");
const defaultCategory = document.body.dataset.defaultCategory || "photos";

tagsInput.value = defaultTags.join(", ");
categoryInput.value = defaultCategory;

function setStatus(message, tone = "info") {
  statusEl.textContent = message || "";
  statusEl.className = "text-sm";
  if (tone === "error") {
    statusEl.classList.add("text-red-600");
  } else if (tone === "success") {
    statusEl.classList.add("text-emerald-600");
  } else {
    statusEl.classList.add("text-slate-600");
  }
}

function parseTags() {
  return tagsInput.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function schedulePreview() {
  if (state.previewTimer) {
    clearTimeout(state.previewTimer);
  }
  state.previewTimer = setTimeout(requestPreview, 300);
}

function updateExif() {
  const selected = state.images.find((image) => image.id === state.selectedId);
  if (!selected) {
    exifCamera.textContent = "-";
    exifFocal.textContent = "-";
    exifAperture.textContent = "-";
    exifIso.textContent = "-";
    exifGps.textContent = "-";
    return;
  }
  const exif = selected.exif || {};
  exifCamera.textContent = exif.camera || "Unknown";
  exifFocal.textContent = exif.focal_length || "-";
  exifAperture.textContent = exif.aperture || "-";
  exifIso.textContent = exif.iso || "-";
  if (exif.gps && exif.gps.lat && exif.gps.lon) {
    exifGps.textContent = `${exif.gps.lat.toFixed(6)}, ${exif.gps.lon.toFixed(6)}`;
  } else {
    exifGps.textContent = "-";
  }
}

function renderThumbnails() {
  thumbsEl.innerHTML = "";
  state.imageOrder.forEach((id) => {
    const image = state.images.find((item) => item.id === id);
    if (!image) {
      return;
    }
    const wrapper = document.createElement("div");
    wrapper.className =
      "relative w-24 cursor-pointer rounded border border-slate-200 bg-white p-1 text-center text-xs";
    if (id === state.selectedId) {
      wrapper.classList.add("ring-2", "ring-slate-500");
    }
    wrapper.draggable = true;
    wrapper.dataset.id = id;

    const img = document.createElement("img");
    img.src = image.preview_url;
    img.alt = image.original_name;
    img.className = "h-20 w-full object-cover rounded";

    const label = document.createElement("div");
    label.textContent = image.original_name;
    label.className = "mt-1 truncate";

    wrapper.appendChild(img);
    wrapper.appendChild(label);

    wrapper.addEventListener("click", () => {
      state.selectedId = id;
      updateExif();
      renderThumbnails();
    });

    wrapper.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", id);
    });
    wrapper.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    wrapper.addEventListener("drop", (event) => {
      event.preventDefault();
      const draggedId = parseInt(event.dataTransfer.getData("text/plain"), 10);
      moveImage(draggedId, id);
      renderThumbnails();
      schedulePreview();
    });

    thumbsEl.appendChild(wrapper);
  });
}

function moveImage(draggedId, targetId) {
  if (draggedId === targetId) {
    return;
  }
  const order = state.imageOrder.slice();
  const fromIndex = order.indexOf(draggedId);
  const toIndex = order.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1) {
    return;
  }
  order.splice(fromIndex, 1);
  order.splice(toIndex, 0, draggedId);
  state.imageOrder = order;
  state.selectedId = order[0];
  updateExif();
}

async function uploadFiles(files) {
  if (!files || !files.length) {
    return;
  }
  if (state.sessionId) {
    await clearSession();
  }
  setStatus("Uploading images...");
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  try {
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Upload failed");
    }
    const data = await response.json();
    state.sessionId = data.session_id;
    state.images = data.images;
    state.imageOrder = data.images.map((img) => img.id);
    state.selectedId = state.imageOrder[0] || null;
    renderThumbnails();
    updateExif();
    schedulePreview();
    setStatus("Images uploaded.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function requestPreview() {
  if (!state.sessionId) {
    previewEl.textContent = "Upload images to generate a preview.";
    return;
  }
  const payload = {
    session_id: state.sessionId,
    title: titleInput.value,
    description: descriptionInput.value,
    tags: parseTags(),
    category: categoryInput.value,
    draft: draftInput.checked,
    image_order: state.imageOrder,
  };
  try {
    const response = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Preview failed");
    }
    previewEl.textContent = data.markdown;
  } catch (error) {
    previewEl.textContent = `Preview error: ${error.message}`;
  }
}

async function createPost() {
  if (!state.sessionId) {
    setStatus("Upload images first.", "error");
    return;
  }
  setStatus("Creating post...");
  const payload = {
    session_id: state.sessionId,
    title: titleInput.value,
    description: descriptionInput.value,
    tags: parseTags(),
    category: categoryInput.value,
    draft: draftInput.checked,
    image_order: state.imageOrder,
  };
  try {
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Post creation failed");
    }
    setStatus(`Post created: ${data.output_path}`, "success");
    state.sessionId = null;
    state.images = [];
    state.imageOrder = [];
    state.selectedId = null;
    renderThumbnails();
    updateExif();
    previewEl.textContent = "";
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function clearSession() {
  if (!state.sessionId) {
    return;
  }
  try {
    await fetch(`/api/uploads/${state.sessionId}`, { method: "DELETE" });
  } catch (error) {
    setStatus("Failed to clear session.", "error");
  }
  state.sessionId = null;
  state.images = [];
  state.imageOrder = [];
  state.selectedId = null;
  renderThumbnails();
  updateExif();
  previewEl.textContent = "";
  setStatus("Session cleared.", "success");
}

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("border-slate-500");
});
dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("border-slate-500");
});
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("border-slate-500");
  uploadFiles(event.dataTransfer.files);
});

fileInput.addEventListener("change", (event) => {
  uploadFiles(event.target.files);
});

createButton.addEventListener("click", createPost);
clearButton.addEventListener("click", clearSession);

[titleInput, descriptionInput, tagsInput, categoryInput, draftInput].forEach(
  (input) => {
    input.addEventListener("input", schedulePreview);
    input.addEventListener("change", schedulePreview);
  }
);

document.querySelectorAll(".tag-chip").forEach((button) => {
  button.addEventListener("click", () => {
    const tag = button.dataset.tag;
    const tags = parseTags();
    if (!tags.includes(tag)) {
      tags.push(tag);
      tagsInput.value = tags.join(", ");
      schedulePreview();
    }
  });
});

previewEl.textContent = "Upload images to generate a preview.";
