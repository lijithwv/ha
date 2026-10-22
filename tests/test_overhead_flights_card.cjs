const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class FakeElement {
  constructor() {
    this.isConnected = false;
    this.events = {};
  }

  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      querySelectorAll: () => [],
      querySelector: () => ({
        addEventListener: (event, callback) => { this.events[event] = callback; },
      }),
    };
  }
}

function createCard() {
  const source = fs.readFileSync(path.join(__dirname,
    "../custom_components/overhead_flights/frontend/overhead-flights-card.js"), "utf8");
  const document = { visibilityState: "visible" };
  const context = vm.createContext({
    HTMLElement: FakeElement,
    customElements: { get: () => false, define: () => {} },
    window: {}, document, URL, URLSearchParams, fetch, AbortController,
    setTimeout, clearTimeout, setInterval, clearInterval,
  });
  const Card = vm.runInContext(`${source}\nOverheadFlightsCard;`, context);
  const card = new Card();
  card.setConfig({});
  const requests = [];
  card.currentHass = {
    config: { time_zone: "Australia/Melbourne" },
    states: {
      "sensor.overhead_aircraft_snapshot": {
        state: "1",
        attributes: { latitude: 0, longitude: 0, entry_id: "entry-test", now: Date.now() / 1000, ac: [] },
      },
    },
    callWS: async (message) => { requests.push(message); return { ok: true }; },
  };
  return { card, document, requests };
}

test("minimal card has five radius choices, default 5 km and no YAML coordinates", () => {
  const { card } = createCard();
  card.render();
  assert.equal(card.radiusKm, 5);
  const choices = [...card.shadowRoot.innerHTML.matchAll(/<option value="(\d+)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(choices, [5, 10, 15, 20, 25]);
  assert.equal(card.getViewModel().ready, true);
  card.events.change({ target: { value: "25" } });
  assert.equal(card.radiusKm, 25);
  card.setRadius(7);
  assert.equal(card.radiusKm, 25);
});

test("filter uses integration coordinates and applies exact radius", () => {
  const { card, requests } = createCard();
  card.currentHass.states["zone.home"] = { attributes: { latitude: 45, longitude: 45 } };
  card.currentHass.states[card.config.entity].attributes.ac = [3, 24, 26].map((distance) => ({
    hex: `ABC${distance}`, lat: distance / 111.19492664455873, lon: 0, seen_pos: 0, alt_baro: 5000,
  }));
  assert.equal(card.getViewModel().flights.length, 1);
  card.setRadius(25);
  assert.equal(card.getViewModel().flights.length, 2);
  assert.equal(requests.length, 0);
});

test("visible-only refresh calls integration WebSocket and shares client cooldown", async () => {
  const { card, document, requests } = createCard();
  await card.requestFeedRefresh();
  assert.equal(requests.length, 0);
  card.isConnected = true;
  card.cardVisible = true;
  document.visibilityState = "hidden";
  await card.requestFeedRefresh();
  assert.equal(requests.length, 0);
  document.visibilityState = "visible";
  card.cardVisible = false;
  await card.requestFeedRefresh();
  assert.equal(requests.length, 0);
  card.cardVisible = true;
  await card.requestFeedRefresh();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].type, "overhead_flights/refresh");
  assert.equal(requests[0].entry_id, "entry-test");
  await card.requestFeedRefresh();
  assert.equal(requests.length, 1);
});

test("missing integration does not request data and explains setup", async () => {
  const { card, requests } = createCard();
  card.currentHass.states = {};
  card.isConnected = true;
  card.cardVisible = true;
  await card.requestFeedRefresh();
  assert.equal(requests.length, 0);
  assert.equal(card.getViewModel().status, "Integration not configured");
});

test("unavailable snapshot retains bootstrap metadata and can request its first update", async () => {
  const { card, requests } = createCard();
  card.currentHass.states[card.config.entity] = {
    state: "unavailable",
    attributes: { entry_id: "entry-test", latitude: 0, longitude: 0, http_status: 0 },
  };
  assert.equal(card.getViewModel().status, "Feed unavailable");
  assert.equal(card.getViewModel().update, "Awaiting feed");
  card.isConnected = true;
  card.cardVisible = true;
  await card.requestFeedRefresh();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].entry_id, "entry-test");
});

test("unavailable rate-limited snapshot is not mistaken for missing integration", () => {
  const { card } = createCard();
  card.currentHass.states[card.config.entity] = {
    state: "unavailable",
    attributes: { entry_id: "entry-test", latitude: 0, longitude: 0, http_status: 429 },
  };
  assert.equal(card.getViewModel().status, "Feed rate-limited");
  assert.equal(card.getViewModel().flights.length, 0);
});

test("photo lookup identifies entry and keeps credits inside caption", async () => {
  const { card, requests } = createCard();
  await card.photos.photoLookup({ hex: "ABC123" });
  assert.equal(requests[0].type, "overhead_flights/photo");
  assert.equal(requests[0].entry_id, "entry-test");
  assert.equal(requests[0].hex, "ABC123");
  const html = card.renderPhoto({ r: "VH-ABC", t: "B738" }, {
    match: "exact", url: "https://t.plnspttrs.net/test.jpg",
    link: "https://www.planespotters.net/photo/123", photographer: "Test photographer",
  });
  assert.match(html.match(/<figcaption>([\s\S]*?)<\/figcaption>/)[1], /Test photographer/);
  assert.doesNotMatch(html, /ink treatment/);
});
