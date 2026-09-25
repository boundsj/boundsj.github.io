const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.join(__dirname, "../static/app.js"), "utf8");

function element() {
  return {
    value: "",
    checked: false,
    textContent: "",
    className: "",
    dataset: {},
    classList: { add() {}, remove() {} },
    addEventListener() {},
    appendChild() {},
  };
}

function app() {
  const elements = new Map();
  const calls = [];
  const responses = [];
  const document = {
    body: { dataset: { defaultTags: "[]", defaultCategory: "photos" } },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    querySelectorAll() { return []; },
    createElement() { return element(); },
  };
  const context = vm.createContext({
    document,
    fetch: async (url, options) => {
      calls.push({ url, options });
      assert.ok(responses.length, "a synthetic response must be queued");
      const response = responses.shift();
      return { ok: response.ok, json: async () => response.body };
    },
    setTimeout() { throw new Error("unexpected timer"); },
    clearTimeout() {},
  });
  vm.runInContext(appSource, context, { filename: "app.js" });
  return {
    elements,
    calls,
    responses,
    state: vm.runInContext("state", context),
    preview: () => vm.runInContext("requestPreview()", context),
    create: () => vm.runInContext("createPost()", context),
  };
}

function setForm(fixture, values) {
  for (const [id, value] of Object.entries(values)) {
    const field = fixture.elements.get(id);
    if (id === "draft") field.checked = value;
    else field.value = value;
  }
}

function assertPost(call, endpoint, payload) {
  assert.equal(call.url, endpoint);
  assert.equal(call.options.method, "POST");
  assert.equal(JSON.stringify(call.options.headers), '{"Content-Type":"application/json"}');
  assert.equal(call.options.body, JSON.stringify(payload));
}

test("preview and create keep the populated payload, order, and state timing", async () => {
  const fixture = app();
  fixture.state.sessionId = "session-1";
  fixture.state.images = [0, 1, 2].map((id) => ({ id, original_name: `image-${id}` }));
  fixture.state.imageOrder = [2, 0, 1];
  fixture.state.selectedId = 2;
  setForm(fixture, {
    title: " Photo title ", description: "Photo text", tags: " alpha, , beta ,alpha ",
    category: "travel", draft: false,
  });
  const payload = {
    session_id: "session-1", title: " Photo title ", description: "Photo text",
    tags: ["alpha", "beta", "alpha"], category: "travel", draft: false,
    image_order: [2, 0, 1],
  };
  fixture.responses.push({ ok: true, body: { markdown: "synthetic markdown" } });
  await fixture.preview();
  assertPost(fixture.calls[0], "/api/preview", payload);
  assert.equal(fixture.elements.get("preview").textContent, "synthetic markdown");
  assert.equal(fixture.state.sessionId, "session-1");
  assert.deepEqual(Array.from(fixture.state.imageOrder), [2, 0, 1]);
  assert.equal(fixture.state.selectedId, 2);

  fixture.responses.push({ ok: true, body: { output_path: "synthetic/post" } });
  await fixture.create();
  assertPost(fixture.calls[1], "/api/posts", payload);
  assert.equal(fixture.elements.get("status").textContent, "Post created: synthetic/post");
  assert.equal(fixture.state.sessionId, null);
  assert.deepEqual(Array.from(fixture.state.images), []);
  assert.deepEqual(Array.from(fixture.state.imageOrder), []);
  assert.equal(fixture.state.selectedId, null);
  assert.equal(fixture.elements.get("preview").textContent, "");
});

test("empty fields and a true draft serialize unchanged", async () => {
  const fixture = app();
  fixture.state.sessionId = "session-2";
  setForm(fixture, { title: "", description: "", tags: " , ", category: "", draft: true });
  const payload = {
    session_id: "session-2", title: "", description: "", tags: [], category: "",
    draft: true, image_order: [],
  };
  fixture.responses.push({ ok: true, body: { markdown: "empty preview" } });
  await fixture.preview();
  assertPost(fixture.calls[0], "/api/preview", payload);
  fixture.responses.push({ ok: true, body: { output_path: "synthetic/empty" } });
  await fixture.create();
  assertPost(fixture.calls[1], "/api/posts", payload);
});

test("server failures keep session state and display current messages", async () => {
  const fixture = app();
  fixture.state.sessionId = "session-3";
  fixture.state.imageOrder = [2, 0, 1];
  fixture.responses.push({ ok: false, body: { detail: "Preview denied" } });
  await fixture.preview();
  assert.equal(fixture.elements.get("preview").textContent, "Preview error: Preview denied");
  fixture.responses.push({ ok: false, body: { detail: "Create denied" } });
  await fixture.create();
  assert.equal(fixture.elements.get("status").textContent, "Create denied");
  assert.equal(fixture.state.sessionId, "session-3");
  assert.deepEqual(Array.from(fixture.state.imageOrder), [2, 0, 1]);
});

test("no session makes no request and shows current guidance", async () => {
  const fixture = app();
  await fixture.preview();
  await fixture.create();
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.elements.get("preview").textContent, "Upload images to generate a preview.");
  assert.equal(fixture.elements.get("status").textContent, "Upload images first.");
});
