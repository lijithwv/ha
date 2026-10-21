const AIRCRAFT_TYPE_NAMES = {
  "B737": "Boeing 737",
  "B738": "Boeing 737-800",
  "B38M": "Boeing 737 MAX 8",
  "A320": "Airbus A320",
  "A20N": "Airbus A320neo",
  "A321": "Airbus A321",
  "A21N": "Airbus A321neo",
  "A388": "Airbus A380",
  "A333": "Airbus A330-300",
  "A359": "Airbus A350-900",
  "B77W": "Boeing 777-300ER",
  "B789": "Boeing 787-9",
  "DH8D": "De Havilland Canada Dash 8 Q400",
  "C172": "Cessna 172",
  "H130": "Airbus H130",
  "R44": "Robinson R44",
  "B733": "Boeing 737-300",
  "B734": "Boeing 737-400",
  "B735": "Boeing 737-500",
  "B736": "Boeing 737-600",
  "B739": "Boeing 737-900",
  "B39M": "Boeing 737 MAX 9",
  "B744": "Boeing 747-400",
  "B748": "Boeing 747-8",
  "B752": "Boeing 757-200",
  "B763": "Boeing 767-300",
  "B772": "Boeing 777-200",
  "B773": "Boeing 777-300",
  "B788": "Boeing 787-8",
  "B78X": "Boeing 787-10",
  "A318": "Airbus A318",
  "A319": "Airbus A319",
  "A332": "Airbus A330-200",
  "A339": "Airbus A330-900neo",
  "A346": "Airbus A340-600",
  "A35K": "Airbus A350-1000",
  "AT76": "ATR 72-600",
  "AT75": "ATR 72-500",
  "SF34": "Saab 340",
  "E190": "Embraer 190",
  "E195": "Embraer 195",
  "E75L": "Embraer 175",
  "C208": "Cessna 208 Caravan",
  "C510": "Cessna Citation Mustang",
  "PC12": "Pilatus PC-12",
  "GL7T": "Bombardier Global 7500",
  "H135": "Airbus H135",
  "H145": "Airbus H145",
  "EC35": "Airbus H135",
  "EC45": "Airbus H145",
  "B06": "Bell 206",
  "R22": "Robinson R22",
  "R66": "Robinson R66"
};

const DEFAULT_UPDATE_INTERVAL_SECONDS = 30;
const MAX_POSITION_AGE_SECONDS = 90;
const DEFAULT_SEARCH_RADIUS_KM = 5;
const SEARCH_RADIUS_OPTIONS_KM = [5, 10, 15, 20, 25];

const CARD_STYLES = `
:host {
  display:block;
  --paper:#f4f1e7;
  --ink:#282c29;
  --wash:#d9ddd3;
  color:var(--ink);
}
* {
  box-sizing:border-box;
}
.surround {
  min-height:calc(100vh - 64px);
  padding:36px 22px;
  background:#e6e4dc;
}
ha-card {
  display:block;
  max-width:1080px;
  margin:auto;
  padding:42px;
  border:1px solid #57594f;
  border-radius:2px;
  background:var(--paper);
  color:var(--ink);
  box-shadow:0 8px 32px #25282013;
  font-family:Georgia,'Times New Roman',serif;
}
.masthead,.tile-top,.flight-bottom,.footer {
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
}
.masthead {
  display:flex;
  justify-content:space-between;
  align-items:end;
  gap:12px;
  padding-bottom:13px;
  border-bottom:1px solid var(--ink);
  font-size:11px;
  letter-spacing:1.2px;
  text-transform:uppercase;
}
.masthead-meta {
  display:flex;
  flex-direction:column;
  gap:7px;
  text-align:right;
}
.radius-control select {
  font:inherit;
  color:inherit;
  background:var(--paper);
  border:0;
  border-bottom:1px solid var(--ink);
  border-radius:0;
  padding:4px;
  cursor:pointer;
}
.radius-control select:focus-visible {
  outline:2px solid var(--ink);
  outline-offset:2px;
}
.tiles {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
  margin-top:22px;
}
.flight {
  min-width:0;
  padding:19px 21px 0;
  border:1px solid #74776b;
  background:repeating-linear-gradient(135deg,transparent,transparent 4px,#282c2905 4px,#282c2905 5px);
  text-align:center;
}
.nearest {
  grid-column:1/-1;
  --wash:#cdd4c5;
}
.tile-top {
  display:flex;
  justify-content:flex-end;
  gap:10px;
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:.6px;
  text-align:left;
}
.aircraft {
  margin:15px auto 0;
  max-width:480px;
}
.nearest .aircraft {
  max-width:660px;
  margin-top:8px;
}
.livery-art {
  margin:18px 0;
}
.livery-image {
  position:relative;
  background:var(--paper);
}
.livery-image img {
  display:block;
  width:auto;
  max-width:100%;
  margin-inline:auto;
  height:auto;
  max-height:360px;
  object-fit:contain;
}
.livery-art figcaption,.photo-credit,.art-note {
  font-size:10px;
  line-height:1.5;
  font-style:italic;
  margin:7px 0 10px;
}
.livery-art figcaption {
  display:flex;
  justify-content:center;
  flex-wrap:wrap;
  gap:4px 7px;
}
.photo-credit {
  margin:0;
}
svg {
  width:100%;
  height:auto;
  display:block;
}
h2 {
  font-size:27px;
  font-weight:400;
  letter-spacing:1px;
  margin:0 0 6px;
  overflow-wrap:anywhere;
}
.identity,.movement {
  margin:5px 0;
  font-size:14px;
}
.identity span,.movement span {
  margin:0 5px;
}
.flight-details {
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr);
  align-items:center;
  gap:12px;
  margin:16px 0;
  padding-bottom:16px;
  border-bottom:1px solid #74776b;
}
.flight-identity {
  min-width:0;
  overflow-wrap:anywhere;
}
.route-endpoint {
  margin:0;
  font-size:13px;
  overflow-wrap:anywhere;
}
.route-label {
  display:block;
  margin-bottom:5px;
  font-family:ui-monospace,monospace;
  text-transform:uppercase;
  letter-spacing:1px;
  font-size:9px;
}
.route-note {
  grid-column:1/-1;
  font-size:10px;
  font-style:italic;
}
.movement {
  font-style:italic;
}
.flight-bottom {
  display:flex;
  justify-content:center;
  gap:25px;
  margin-top:20px;
  padding:11px 0;
  border-top:1px solid #74776b;
  font-size:10px;
}
.flight-bottom b {
  margin-left:6px;
  font-weight:400;
}
.empty {
  grid-column:1/-1;
  text-align:center;
  padding:40px 20px 48px;
  border:1px solid #74776b;
}
.empty svg {
  max-width:350px;
  margin:auto;
  opacity:.55;
}
.empty h2 {
  font-size:28px;
  margin:15px 0 12px;
}
.empty p {
  max-width:380px;
  margin:auto;
  font-style:italic;
  line-height:1.6;
}
.footer {
  display:flex;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
  margin-top:24px;
  padding-top:12px;
  border-top:1px solid var(--ink);
  font-size:9px;
  line-height:1.7;
  letter-spacing:.5px;
  text-transform:uppercase;
}
a {
  color:inherit;
  text-underline-offset:3px;
}
@media(max-width:600px) {
  .surround {
    padding:12px 8px;
  }
  ha-card {
    padding:23px 17px;
  }
  .masthead {
    font-size:9px;
    letter-spacing:.5px;
  }
  .tiles {
    grid-template-columns:1fr;
  }
  .flight-details {
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
  .flight-identity {
    grid-column:1/-1;
    grid-row:1;
  }
  .flight {
    padding:17px 15px 0;
  }
}
@media(prefers-reduced-motion:reduce) {
  * {
    scroll-behavior:auto;
  }
}
`;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const normalizeCode = (value) => String(value || "").trim().toUpperCase();
const getAirlineCode = (flight) => normalizeCode(flight.flight).match(/^([A-Z]{3})\d/)?.[1] || "";
const getPhotoCacheKey = (flight) => [normalizeCode(flight.r), normalizeCode(flight.hex), normalizeCode(flight.t), getAirlineCode(flight)].join("|");

class OverheadPhotoService {
  constructor(config, changed, fetcher = (...args) => fetch(...args), loadImage = (url) => new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ""; resolve(false); }, 15000);
    image.onload = () => { clearTimeout(timer); resolve(true); };
    image.onerror = () => { clearTimeout(timer); resolve(false); };
    image.referrerPolicy = "no-referrer";
    image.src = url;
  }), photoLookup = null) {
    this.photoLookup = photoLookup;
    this.changed = changed;
    this.fetcher = (...args) => fetcher(...args);
    this.loadImage = loadImage;
    this.results = new Map();
    this.requests = new Map();
    this.errors = new Map();
    this.failedImages = new Set();
    this.queue = [];
    this.active = 0;
  }

  get(flight, visible = true) {
    const key = getPhotoCacheKey(flight);
    const previous = this.results.get(key);
    if (previous && previous.expires > Date.now()) return previous.photo;
    if (!visible) return previous?.photo || null;
    const entry = { photo: null, expires: Infinity };
    this.results.set(key, entry);
    this.queue.push(async () => {
      try { entry.photo = await this.lookup(flight); } catch { entry.photo = null; }
      entry.expires = Date.now() + (entry.photo ? 6 * 3600000 : 60000);
      if (this.results.size > 300) this.results.delete(this.results.keys().next().value);
      this.changed();
    });
    this.drain();
    return entry.photo;
  }

  drain() {
    while (this.active < 3 && this.queue.length) {
      this.active += 1;
      this.queue.shift()().finally(() => { this.active -= 1; this.drain(); });
    }
  }

  reject(flight) {
    const key = getPhotoCacheKey(flight);
    const photo = this.results.get(key)?.photo;
    if (!photo) return;
    this.failedImages.add(photo.url);
    if (this.failedImages.size > 300) this.failedImages.delete(this.failedImages.keys().next().value);
    this.results.delete(key);
    this.changed();
  }

  json(url, ttl = 3600000) {
    const existing = this.requests.get(url);
    if (existing && existing.expires > Date.now()) return existing.promise;
    const entry = { promise: null, expires: Date.now() + ttl };
    const promise = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await this.fetcher(url, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
        if (response.ok) {
          const data = await response.json();
          this.errors.delete(url);
          return data;
        }
        this.errors.set(url, `HTTP ${response.status}`);
        entry.expires = Date.now() + 60000;
        return null;
      } catch {
        this.errors.set(url, "Network request failed");
        entry.expires = Date.now() + 60000;
        return null;
      } finally {
        clearTimeout(timeout);
      }
    })();
    entry.promise = promise;
    this.requests.set(url, entry);
    if (this.requests.size > 300) this.requests.delete(this.requests.keys().next().value);
    return promise;
  }

  async lookup(flight) {
    const aircraftHex = normalizeCode(flight.hex);
    const registration = normalizeCode(flight.r);
    const identifiers = {};
    if (/^[A-F0-9]{6}$/.test(aircraftHex)) identifiers.hex = aircraftHex;
    if (/^[A-Z0-9-]{2,12}$/.test(registration)) identifiers.registration = registration;
    if (!Object.keys(identifiers).length || !this.photoLookup) return null;

    let result;
    try {
      result = await this.photoLookup(identifiers);
      this.errors.delete("planespotters");
    } catch (error) {
      this.errors.set("planespotters", error?.message || "Planespotters lookup failed");
      return null;
    }
    const photos = (Array.isArray(result?.photos) ? result.photos : []).filter((photo) => photo && typeof photo === "object");
    const aspectRatio = (photo) => {
      const size = photo.thumbnail_large?.size || photo.thumbnail?.size;
      return isFiniteNumber(size?.width) && isFiniteNumber(size?.height) && size.height > 0
        ? size.width / size.height : 0;
    };
    photos.sort((first, second) => aspectRatio(second) - aspectRatio(first));

    for (const photo of photos) {
      let url;
      let link;
      try {
        const image = new URL(photo.thumbnail_large?.src || photo.thumbnail?.src);
        const original = new URL(photo.link);
        if (image.protocol === "https:" && image.hostname === "t.plnspttrs.net"
          && !image.username && !image.password
          && original.protocol === "https:" && original.hostname === "www.planespotters.net") {
          url = image.href;
          link = original.href;
        }
      } catch {}
      if (!url || !link || typeof photo.photographer !== "string" || !photo.photographer.trim()
        || this.failedImages.has(url)) continue;
      if (await this.loadImage(url)) {
        return { url, link, photographer: photo.photographer, match: "exact", registration, source: "Planespotters" };
      }
    }
    return null;
  }
}

class OverheadRouteService {
  constructor(requestJson, changed, getError = () => null) {
    this.requestJson = requestJson;
    this.changed = changed;
    this.getError = getError;
    this.results = new Map();
    this.queue = [];
    this.active = 0;
  }

  get(flight, visible) {
    const callsign = normalizeCode(flight.flight);
    if (!/^[A-Z]{2,3}\d[A-Z0-9]{0,5}$/.test(callsign)) return null;
    const existing = this.results.get(callsign);
    if (existing && existing.expires > Date.now()) return existing.route;
    if (!visible) return existing?.route || null;

    const entry = { route: null, expires: Infinity };
    this.results.set(callsign, entry);
    this.queue.push(async () => {
      const url = `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`;
      try {
        const data = await this.requestJson(url);
        const route = data?.response?.flightroute;
        const aliases = route ? [route.callsign, route.callsign_icao, route.callsign_iata].map(normalizeCode) : [];
        entry.route = route && aliases.includes(callsign)
          ? { from: this.formatAirport(route.origin), to: this.formatAirport(route.destination) }
          : null;
      } catch {
        entry.route = null;
      }
      const failure = this.getError(url);
      entry.error = entry.route ? null : failure && failure !== "HTTP 404"
        ? `Route lookup failed: ${failure}` : "No published route found for this callsign";
      entry.expires = Date.now() + (entry.route ? 3600000 : 60000);
      if (this.results.size > 300) this.results.delete(this.results.keys().next().value);
      this.changed();
    });
    this.drain();
    return null;
  }

  formatAirport(airport) {
    if (!airport || typeof airport !== "object") return "Unknown";
    const name = airport.municipality || airport.name || "";
    const code = airport.iata_code || airport.icao_code || "";
    return name && code ? `${name} (${code})` : name || code || "Unknown";
  }

  drain() {
    while (this.active < 2 && this.queue.length) {
      this.active += 1;
      this.queue.shift()().finally(() => { this.active -= 1; this.drain(); });
    }
  }
}

function getNearbyAircraft(aircraft, home, radius, timestamp, now = Date.now(), maxAge = MAX_POSITION_AGE_SECONDS) {
  if (!Array.isArray(aircraft) || !isFiniteNumber(home?.latitude) || !isFiniteNumber(home?.longitude)) return [];
  const radians = Math.PI / 180;
  const feedAge = Math.max(0, (now - timestamp) / 1000);
  return aircraft.flatMap((flight) => {
    if (!flight || flight.alt_baro === "ground" || !isFiniteNumber(flight.lat) || !isFiniteNumber(flight.lon)
      || !isFiniteNumber(flight.seen_pos) || flight.seen_pos > MAX_POSITION_AGE_SECONDS
      || flight.seen_pos + feedAge > maxAge) return [];
    const latitudeDelta = (flight.lat - home.latitude) * radians;
    const longitudeDelta = (flight.lon - home.longitude) * radians;
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(home.latitude * radians) * Math.cos(flight.lat * radians) * Math.sin(longitudeDelta / 2) ** 2;
    const distance = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
    if (distance > radius) return [];
    const bearing = (Math.atan2(Math.sin(longitudeDelta) * Math.cos(flight.lat * radians),
      Math.cos(home.latitude * radians) * Math.sin(flight.lat * radians)
      - Math.sin(home.latitude * radians) * Math.cos(flight.lat * radians) * Math.cos(longitudeDelta)) / radians + 360) % 360;
    return [{ ...flight, distance, bearing }];
  }).sort((first, second) => first.distance - second.distance);
}



function getAircraftFamily(flight) {
  const type = normalizeCode(flight.t);
  if (flight.category === "A7" || /^(H1[234]|EC[123]|AS[35]|B06|B407|R22|R44|R66)/.test(type)) return "helicopter";
  if (type === "A388") return "double-deck";
  if (/^(A34|B74)/.test(type)) return "four-engine";
  if (/^(A33|A35|B76|B77|B78|A306|A310)/.test(type)) return "widebody";
  if (/^(DH8|AT4|AT7|SF34|JS[34]|BE[123]|PC12|C208)/.test(type)) return "turboprop";
  if (/^(C1[578]|C2[01][026]|PA[234]|SR2|DA[24]|P28)/.test(type)) return "light";
  if (/^(C[567]|CL[356]|GL[567]|G[2456]|LJ|FA[1256789]|E[35]5)/.test(type)) return "business";
  return "narrowbody";
}

function renderAircraftIllustration(flight = {}, index = "empty") {
  const livery = { tail: "#b6bdb5", accent: "#a1aaa3", text: "#535e59" };
  const airframe = getAircraftFamily(flight);
  const identifier = `aircraft-${index}`;
  const defs = `<defs>
    <linearGradient id="${identifier}-body" x2="0" y2="1">
      <stop stop-color="#f6f3e8"/>
      <stop offset=".45" stop-color="#e9e9df"/>
      <stop offset="1" stop-color="#adb5b0"/>
      </linearGradient>
    <linearGradient id="${identifier}-metal" x2="0" y2="1">
      <stop stop-color="#dedfd7"/>
      <stop offset="1" stop-color="#89958f"/>
      </linearGradient>
    <pattern id="${identifier}-hatch" width="5" height="5" patternUnits="userSpaceOnUse">
      <path d="M0 5L5 0" stroke="#333f39" stroke-width=".45" opacity=".18"/>
      </pattern>
    <filter id="${identifier}-grain" x="-5%" y="-10%" width="110%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="8" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
      <feBlend in2="SourceGraphic" mode="multiply"/>
      </filter>
  </defs>`;
  const open = `<svg class="aircraft-drawing" viewBox="0 0 680 230" role="img" aria-label="${escapeHtml(`Neutral ${flight.t || airframe} illustration`)}">${defs}<g stroke="#53615c" stroke-width="1.15" stroke-linejoin="round">`;
  if (airframe === "helicopter") return `${open}
    <path d="M146 132Q167 91 224 91L287 121 549 105 566 64 582 65 571 133 291 148Q210 174 150 149Z" fill="url(#${identifier}-body)"/>
    <path d="M157 134Q173 103 207 103L206 135Z M218 103L238 106 270 134 218 135Z" fill="#839b9d"/>
    <path d="M151 144L285 138 552 119 552 131 285 151Q202 174 151 151Z" fill="${livery.accent}"/>
    <path d="M232 91L232 57M60 56L474 56 M76 61L458 51M198 157L190 180 291 180 303 151M170 186L319 186" fill="none" stroke-width="3"/>
    <circle cx="563" cy="114" r="17" fill="#d7dcd4"/>
      <path d="M552 103L574 125M552 125L574 103" stroke-width="2"/>
    <path d="M151 151Q219 175 291 148" fill="none"/>
      <text x="302" y="124" font-size="12" fill="${livery.text}" stroke="none">${escapeHtml(flight.r || "")}</text>
  </g>
      </svg>`;
  if (airframe === "light") return `${open}
    <path d="M100 133Q113 122 163 121L438 123 491 79 513 79 499 138 538 149 493 155 163 152 100 143Z" fill="url(#${identifier}-body)"/>
    <path d="M171 120L193 99 265 99 282 124Z" fill="#889c9a"/>
      <path d="M233 125L313 177 394 180 288 124 M216 118L278 86 372 86 268 122" fill="url(#${identifier}-metal)"/>
    <path d="M102 134L442 135 494 99" fill="none" stroke="${livery.accent}" stroke-width="5"/>
      <path d="M98 108L98 164M187 155L180 180M371 157L379 178" fill="none" stroke-width="3"/>
    <circle cx="180" cy="183" r="7" fill="#434c48"/>
      <circle cx="379" cy="181" r="7" fill="#434c48"/>
    <text x="327" y="131" font-size="11" fill="${livery.text}" stroke="none">${escapeHtml(flight.r || "")}</text>
  </g>
      </svg>`;
  const wide = ["widebody", "double-deck", "four-engine"].includes(airframe);
  const small = airframe === "business" || airframe === "turboprop";
  const roof = airframe === "double-deck" ? 91 : wide ? 107 : small ? 124 : 117;
  const belly = wide ? 162 : small ? 157 : 158;
  const nose = wide ? 47 : small ? 89 : 61;
  const wing = wide ? 305 : 316;
  const engine = (position, height, size = 1) => `<g transform="translate(${position} ${height}) scale(${size})">
      <path d="M0-13Q12-18 48-11L52 12Q23 20 3 12Z" fill="url(#${identifier}-metal)"/>
      <path d="M5-12Q18-16 39-12L42 13 8 15Z" fill="${livery.accent}" opacity=".75"/>
      <ellipse rx="10" ry="14" fill="#596762"/>
      <ellipse rx="6" ry="10" fill="#303e3a"/>
      <path d="M-4-6L4 6M-4 6L4-6M0-8V8" opacity=".5" stroke="#bdc5bc"/>
      </g>`;
  const body = `M${nose} 143Q${nose + 13} ${roof + 7} 135 ${roof}L514 ${roof + 3} 562 43 588 43 572 133 635 145 577 ${belly - 2} 139 ${belly}Q${nose + 22} ${belly} ${nose} 143Z`;
  const windows = Array.from({ length: small ? 21 : 44 }, (_, windowIndex) => `<rect x="${small ? 193 + windowIndex * 14 : 159 + windowIndex * 8}" y="${roof + 13}" width="${small ? 6 : 3.5}" height="5" rx="1.5"/>`).join("");
  return `${open}
    <path d="M${wing + 14} ${roof + 23}L432 66 453 68 385 ${roof + 33}" fill="#bbc3ba"/>
    ${airframe === "four-engine" || airframe === "double-deck" ? engine(396, roof + 35, .65) : ""}
    <path d="${body}" fill="url(#${identifier}-body)"/>
    <path d="M515 ${roof + 3}L562 43 588 43 572 133 548 139Z" fill="${livery.tail}"/>
    <path d="M${nose + 9} 147Q125 ${belly - 3} 203 ${belly - 5}H548L574 144" fill="none" stroke="${livery.accent}" stroke-width="${wide ? 5 : 3}" opacity=".85"/>
    <path d="M${nose + 23} ${roof + 11}L${nose + 41} ${roof + 7}H${nose + 56}L${nose + 51} ${roof + 16} ${nose + 21} ${roof + 20}Z" fill="#748d8c"/>
    <g fill="#4c625f" stroke="none">${windows}</g>
    ${airframe === "double-deck" ? `<path d="M158 101H499" stroke="#4c625f" stroke-width="3" stroke-dasharray="3 5"/>` : ""}
    <path d="M143 ${roof + 7}V${belly - 9}H152V${roof + 7}Z M500 ${roof + 9}V${belly - 8}H509V${roof + 9}Z" fill="none" opacity=".6"/>
    <text x="457" y="${belly - 10}" font-family="Arial,sans-serif" font-size="6" fill="#4d5b55" stroke="none">${escapeHtml(flight.r || "")}</text>
    <path d="M${wing - 33} 148L418 195 475 197 367 142Z" fill="url(#${identifier}-metal)"/>
    <path d="M343 154L428 190 456 192 M366 151L447 185" fill="none" opacity=".4"/>
    <path d="M465 194L482 175 478 199 464 198" fill="${livery.accent}"/>
    <path d="M550 142L626 115 642 117 589 148" fill="#bfc7bd"/>
    ${airframe === "turboprop" ? `<g>${engine(339, 165, .7)}<path d="M331 126L341 201M320 137L352 190" stroke="#455b53" stroke-width="4"/>
      </g>` : engine(small ? 451 : 337, small ? 137 : 174, small ? .6 : wide ? 1.15 : .85)}
    ${airframe === "four-engine" || airframe === "double-deck" ? engine(406, 190, .8) : ""}
    <path d="${body}" fill="url(#${identifier}-hatch)" stroke="none"/>
    <path d="M${nose + 10} 147Q130 ${belly + 2} 250 ${belly - 1}" fill="none" opacity=".5"/>
  </g>
      <g opacity=".12" filter="url(#${identifier}-grain)">
      <path d="${body}" fill="#e2dfd1"/>
      </g>
      </svg>`;
}

class OverheadFlightsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    if (!config.entity) throw new Error("Set an aircraft feed entity.");
    const radius = config.radius_km ?? DEFAULT_SEARCH_RADIUS_KM;
    if (!SEARCH_RADIUS_OPTIONS_KM.includes(radius)) {
      throw new Error(`radius_km must be one of ${SEARCH_RADIUS_OPTIONS_KM.join(", ")} km.`);
    }
    if (config.latitude !== undefined || config.longitude !== undefined) {
      if (!isFiniteNumber(config.latitude) || !isFiniteNumber(config.longitude)
        || Math.abs(config.latitude) > 90 || Math.abs(config.longitude) > 180) {
        throw new Error("Set both latitude and longitude to valid numeric coordinates.");
      }
    }
    const interval = config.update_interval_seconds ?? DEFAULT_UPDATE_INTERVAL_SECONDS;
    const maxAge = config.max_age_seconds ?? MAX_POSITION_AGE_SECONDS;
    if (!isFiniteNumber(interval) || interval < 15 || !isFiniteNumber(maxAge) || maxAge < MAX_POSITION_AGE_SECONDS) {
      throw new Error("Update interval must be at least 15 seconds and max age at least 90 seconds.");
    }
    this.config = { ...config, radius_km: radius, update_interval_seconds: interval, max_age_seconds: maxAge };
    this.radiusKm = radius;
    if (config.photo_source !== undefined && config.photo_source !== "planespotters") {
      throw new Error("photo_source must be planespotters.");
    }
    this.photos = new OverheadPhotoService(
      this.config,
      () => this.render(),
      undefined,
      undefined,
      (identifiers) => this.currentHass.callWS({ type: "overhead_flights/photo", ...identifiers }),
    );
    this.routes = new OverheadRouteService(
      (url) => this.photos.json(url),
      () => this.render(),
      (url) => this.photos.errors.get(url),
    );
    this.render();
  }

  set hass(hass) {
    this.currentHass = hass;
    this.render();
    this.requestFeedRefresh();
  }

  connectedCallback() {
    this.handleVisibilityChange = () => this.requestFeedRefresh();
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.cardVisible = entries.some((entry) => entry.isIntersecting);
      this.requestFeedRefresh();
    });
    this.visibilityObserver.observe(this);
    this.timer = setInterval(() => {
      this.render();
      this.requestFeedRefresh();
    }, 15000);
    this.render();
  }

  disconnectedCallback() {
    clearInterval(this.timer);
    this.visibilityObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.cardVisible = false;
  }

  async requestFeedRefresh() {
    const script = this.config?.refresh_script;
    if (!script || !this.isConnected || !this.cardVisible || document.visibilityState !== "visible"
      || !this.currentHass?.callService || this.refreshPending) return;
    if (this.currentHass.states[script]?.state === "on") return;
    if (Date.now() - (this.lastRefreshRequest || 0) < 30000) return;

    this.lastRefreshRequest = Date.now();
    this.refreshPending = true;
    try {
      await this.currentHass.callService("script", "turn_on", { entity_id: script });
      this.refreshError = false;
    } catch {
      this.refreshError = true;
    } finally {
      this.refreshPending = false;
    }
  }

  getCardSize() {
    return 12;
  }

  setRadius(value) {
    const radius = Number(value);
    if (!SEARCH_RADIUS_OPTIONS_KM.includes(radius)) return;
    this.radiusKm = radius;
    this.render();
  }

  renderArtwork(flight, index) {
    const visible = this.isConnected && this.cardVisible && document.visibilityState === "visible";
    const photo = this.photos.get(flight, visible);
    if (photo) return this.renderPhoto(flight, photo);
    const pending = this.photos.results.get(getPhotoCacheKey(flight))?.expires === Infinity;
    const serviceFailed = this.photos.errors.has("planespotters");
    const note = pending ? "Finding aircraft photos…" : serviceFailed
      ? "Photo lookup failed · retrying shortly" : "No suitable aircraft photo indexed · illustration shown";
    return `${renderAircraftIllustration(flight, index)}<p class="art-note">${note}</p>`;
  }

  renderPhoto(flight, photo) {
    const registration = flight.r || "Registration unknown";
    const type = flight.t || "Aircraft type unknown";
    const airline = photo.match === "type" ? "another airline may be shown" : "same airline";
    const alternative = photo.match === "exact"
      ? `Photograph of ${registration}`
      : `${type}, ${airline}; representative photo`;
    const matchLabel = photo.match === "type" ? "Same aircraft type · airline may differ" : "Same airline & type";
    const caption = photo.match === "exact"
      ? "Registration-matched photo · Paintwork may have changed"
      : `${matchLabel} · representative photo${photo.registration ? ` · ${photo.registration}` : ""}`;

    return `
      <figure class="livery-art">
        <div class="livery-image">
          <img data-flight="${escapeHtml(getPhotoCacheKey(flight))}"
            src="${escapeHtml(photo.url)}" alt="${escapeHtml(alternative)}"
            decoding="async" referrerpolicy="no-referrer">
        </div>
        <figcaption>
          <span>${escapeHtml(caption)}</span>
        </figcaption>
      </figure>`;
  }

  renderPhotoCredit(photo) {
    if (!photo.photographer) return "";
    const license = photo.licenseUrl
      ? ` · <a href="${escapeHtml(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(photo.license)}</a>`
      : "";
    return `
      <span class="photo-credit">
        <a href="${escapeHtml(photo.link)}" target="_blank" rel="noopener noreferrer">© ${escapeHtml(photo.photographer)}</a>
        ${license}
      </span>`;
  }

  renderFlight(flight, index) {
    const callsign = String(flight.flight || "").trim() || flight.r || flight.hex || "Unidentified";
    const direction = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(flight.bearing / 45) % 8];
    const rate = flight.baro_rate ?? flight.geom_rate;
    const movement = isFiniteNumber(rate) ? (rate > 128 ? "Climbing" : rate < -128 ? "Descending" : "Level flight") : "Vertical rate unknown";
    const altitude = isFiniteNumber(flight.alt_baro) ? `${Math.round(flight.alt_baro).toLocaleString()} ft` : "Altitude unknown";
    const speed = isFiniteNumber(flight.gs) ? `${Math.round(flight.gs)} kt` : "Speed unknown";
    const heading = isFiniteNumber(flight.track) ? `${Math.round(flight.track)}°` : "—";
    const registration = flight.r || "Registration unknown";
    const type = flight.t || "Aircraft type unknown";
    const typeName = AIRCRAFT_TYPE_NAMES[normalizeCode(flight.t)];
    const identity = `
      <div class="flight-identity">
        <h2>${escapeHtml(callsign)}</h2>
        ${typeName ? `<p class="identity">${escapeHtml(typeName)}</p>` : ""}
        <p class="identity">${escapeHtml(type)} <span>·</span> ${escapeHtml(registration)}</p>
      </div>`;
    return `<article class="flight ${index === 0 ? "nearest" : ""}">
      <div class="tile-top">
      <span>${flight.distance.toFixed(1)} km · ${direction}</span>
      </div>
      <div class="aircraft">${this.renderArtwork(flight, index)}</div>
      ${this.renderFlightDetails(flight, identity)}
      <p class="movement">${altitude} <span>·</span> ${movement}</p>
      <div class="flight-bottom">
      <span>Speed <b>${speed}</b>
      </span>
      <span>Track <b>${heading}</b>
      </span>
      </div>
    </article>`;
  }

  renderFlightDetails(flight, identity) {
    const visible = this.isConnected && this.cardVisible && document.visibilityState === "visible";
    const route = this.routes.get(flight, visible);
    const from = route?.from || "Unknown";
    const to = route?.to || "Unknown";
    const lookup = this.routes.results.get(normalizeCode(flight.flight));
    const note = route ? ""
      : lookup?.expires === Infinity ? "Looking up route…"
        : lookup?.error || "Route data unavailable for this callsign";
    return `
      <div class="flight-details">
        <p class="route-endpoint"><span class="route-label">From</span>${escapeHtml(from)}</p>
        ${identity}
        <p class="route-endpoint"><span class="route-label">To</span>${escapeHtml(to)}</p>
        ${note ? `<span class="route-note">${escapeHtml(note)}</span>` : ""}
      </div>`;
  }

  getViewModel() {
    const hass = this.currentHass;
    const entity = hass.states[this.config.entity];
    const fixedCentre = this.config.latitude !== undefined;
    const home = fixedCentre ? { latitude: this.config.latitude, longitude: this.config.longitude }
      : hass.states["zone.home"]?.attributes;
    const locationReady = isFiniteNumber(home?.latitude) && isFiniteNumber(home?.longitude);
    const timestamp = Number(entity?.attributes.now);
    const feedTime = timestamp > 1e12 ? timestamp : timestamp * 1000;
    const stale = !Number.isFinite(feedTime) || Date.now() - feedTime > this.config.max_age_seconds * 1000
      || feedTime - Date.now() > 60000;
    const unavailable = !entity || ["unknown", "unavailable"].includes(entity.state)
      || !Array.isArray(entity.attributes.ac);
    const ready = !unavailable && !stale && locationReady;
    const snapshot = this.config.update_interval_seconds > MAX_POSITION_AGE_SECONDS;
    const flights = ready ? getNearbyAircraft(entity.attributes.ac, home, this.radiusKm, feedTime,
      Date.now(), this.config.max_age_seconds) : [];
    const interval = this.config.update_interval_seconds;
    const cadence = interval % 60 === 0 ? `${interval / 60} min` : `${interval} s`;
    const timeOptions = { timeZone: hass.config?.time_zone || "Australia/Melbourne" };
    const update = Number.isFinite(feedTime) ? new Intl.DateTimeFormat("en-AU", { ...timeOptions, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(feedTime)) : "Awaiting feed";
    const rateLimited = Number(entity?.attributes.http_status) === 429;
    const status = !locationReady ? "Home zone missing" : this.refreshError ? "Refresh failed"
      : unavailable ? rateLimited ? "Feed rate-limited" : "Feed unavailable" : stale ? "Feed delayed"
      : snapshot ? "Latest aircraft snapshot" : "In the air now";
    const message = !locationReady ? "Set your Home zone location in Home Assistant to centre the search."
      : this.refreshError ? "Home Assistant could not run the refresh script. Check your dashboard permissions and script configuration."
      : unavailable ? rateLimited
        ? "The provider's request quota is exhausted. Refreshes retry while this dashboard is visible, after the shared cooldown."
        : `Waiting for aircraft data. Refreshes run only while this dashboard is visible, at most once every ${cadence}.`
      : stale ? "The last snapshot is too old to display. Aircraft will return when the provider recovers."
      : "No aircraft overhead right now. The next arrival will appear here automatically.";
    return { ready, snapshot, cadence, flights, update, status, message };
  }

  renderHeader({ update, status }) {
    const updated = update === "Awaiting feed" ? update : `Updated at ${update}`;
    const radiusOptions = SEARCH_RADIUS_OPTIONS_KM.map((radius) => {
      return `<option value="${radius}"${radius === this.radiusKm ? " selected" : ""}>${radius}</option>`;
    }).join("");
    return `
      <div class="masthead">
        <span>${escapeHtml(status)}. Nearest first</span>
        <div class="masthead-meta">
          <span>${escapeHtml(updated)}</span>
          <label class="radius-control">Within
            <select aria-label="Search radius in kilometres">${radiusOptions}</select> km
          </label>
        </div>
      </div>`;
  }

  renderEmptyState({ ready, message }) {
    return `
      <div class="empty">
        ${renderAircraftIllustration()}
        <h2>${ready ? "A quiet patch of sky." : "Watching the sky."}</h2>
        <p>${message}</p>
      </div>`;
  }

  renderFooter({ update, cadence, snapshot }) {
    return `
      <div class="footer">
        <span>Updated ${update} · refresh ${cadence} while visible${snapshot ? " · positions at update time" : ""}</span>
        <span>Airborne only · ADS-B coverage varies ·
          <a href="https://www.adsb.lol" target="_blank" rel="noopener noreferrer">ADS-B.lol</a>
        </span>
      </div>`;
  }

  bindImageErrors(flights) {
    for (const image of this.shadowRoot.querySelectorAll(".livery-image img")) {
      const reject = () => {
        const flight = flights.find((item) => getPhotoCacheKey(item) === image.dataset.flight);
        if (flight) this.photos.reject(flight);
      };
      image.addEventListener("error", reject, { once: true });
      if (image.complete && !image.naturalWidth) reject();
    }
  }

  render() {
    if (!this.config || !this.currentHass) return;
    const view = this.getViewModel();
    const cards = view.flights.length
      ? view.flights.map((flight, index) => this.renderFlight(flight, index)).join("")
      : this.renderEmptyState(view);

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <div class="surround">
        <ha-card>
          ${this.renderHeader(view)}
          <section class="tiles" aria-label="Aircraft within ${this.radiusKm} kilometres">
            ${cards}
          </section>
          ${this.renderFooter(view)}
        </ha-card>
      </div>`;
    this.shadowRoot.querySelector(".radius-control select").addEventListener("change", (event) => {
      this.setRadius(event.target.value);
    });
    this.bindImageErrors(view.flights);
  }
}

if (!customElements.get("overhead-flights-card")) customElements.define("overhead-flights-card", OverheadFlightsCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "overhead-flights-card", name: "Overhead · Ink", description: "An ink and paper aircraft field guide with an adjustable search radius." });
