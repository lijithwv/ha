const inkEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

const inkNumber = (value) => typeof value === "number" && Number.isFinite(value);

const inkCode = (value) => String(value || "").trim().toUpperCase();
const inkAirline = (flight) => inkCode(flight.flight).match(/^([A-Z]{3})\d/)?.[1] || "";
const inkPhotoKey = (flight) => [inkCode(flight.r), inkCode(flight.hex), inkCode(flight.t), inkAirline(flight)].join("|");

function inkPhotoUrl(value, local = false) {
  if (typeof value !== "string") return null;
  if (local && /^\/local\/[a-z0-9_./%-]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password
      && (local || url.hostname === "t.plnspttrs.net")) return url.href;
  } catch {}
  return null;
}

class OverheadPhotoService {
  constructor(config, changed, fetcher = fetch, loadImage = (url) => new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ""; resolve(false); }, 8000);
    image.onload = () => { clearTimeout(timer); resolve(true); };
    image.onerror = () => { clearTimeout(timer); resolve(false); };
    image.referrerPolicy = "no-referrer";
    image.src = url;
  })) {
    this.source = config.photo_source || "public-domain";
    this.catalog = config.photo_catalog || [];
    this.changed = changed;
    this.fetcher = fetcher;
    this.loadImage = loadImage;
    this.results = new Map();
    this.requests = new Map();
    this.failedImages = new Set();
    this.queue = [];
    this.active = 0;
  }

  get(flight) {
    const key = inkPhotoKey(flight);
    const previous = this.results.get(key);
    if (previous && previous.expires > Date.now()) return previous.photo;
    const entry = { photo: null, expires: Infinity };
    this.results.set(key, entry);
    this.queue.push(async () => {
      try { entry.photo = await this.lookup(flight); } catch { entry.photo = null; }
      entry.expires = Date.now() + (entry.photo ? 6 * 3600000 : 10 * 60000);
      if (this.results.size > 300) this.results.delete(this.results.keys().next().value);
      this.changed();
    });
    this.drain();
    return null;
  }

  drain() {
    while (this.active < 3 && this.queue.length) {
      this.active += 1;
      this.queue.shift()().finally(() => { this.active -= 1; this.drain(); });
    }
  }

  reject(flight) {
    const key = inkPhotoKey(flight);
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
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await this.fetcher(url, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
        if (response.ok) return await response.json();
        entry.expires = Date.now() + 60000;
        return null;
      } catch { entry.expires = Date.now() + 60000; return null; } finally { clearTimeout(timeout); }
    })();
    entry.promise = promise;
    this.requests.set(url, entry);
    if (this.requests.size > 300) this.requests.delete(this.requests.keys().next().value);
    return promise;
  }

  async catalogPhoto(flight, exact, anyAirline = false) {
    const registration = inkCode(flight.r);
    const airline = inkAirline(flight);
    const type = inkCode(flight.t);
    for (const item of this.catalog) {
      const matches = exact ? registration && inkCode(item.registration) === registration
        : type && (anyAirline || airline && inkCode(item.airline) === airline) && inkCode(item.type) === type
          && inkCode(item.registration) && inkCode(item.registration) !== registration;
      const url = matches && inkPhotoUrl(item.url, true);
      if (url && !this.failedImages.has(url) && await this.loadImage(url)) return { url, match: exact ? "exact" : anyAirline ? "type" : "airline-type", registration: inkCode(item.registration) };
    }
    return null;
  }

  async providerPhoto(flight, match = "exact") {
    const hex = inkCode(flight.hex);
    const registration = inkCode(flight.r);
    const paths = [];
    if (/^[A-F0-9]{6}$/.test(hex)) paths.push(`hex/${hex.toLowerCase()}`);
    if (/^[A-Z0-9-]{2,12}$/.test(registration)) paths.push(`reg/${encodeURIComponent(registration)}`);
    for (const path of paths) {
      const data = await this.json(`https://api.planespotters.net/pub/photos/${path}`);
      for (const photo of (Array.isArray(data?.photos) ? data.photos : []).slice(0, 3)) {
        const url = inkPhotoUrl(photo.thumbnail_large?.src || photo.thumbnail?.src);
        let link;
        try {
          const parsed = new URL(photo.link);
          if (parsed.protocol === "https:" && parsed.hostname === "www.planespotters.net") link = parsed.href;
        } catch {}
        if (url && !this.failedImages.has(url) && link && typeof photo.photographer === "string" && await this.loadImage(url)) {
          return { url, link, photographer: photo.photographer, registration, match };
        }
      }
    }
    return null;
  }

  async lookup(flight) {
    const exact = await this.catalogPhoto(flight, true)
      || (this.source === "planespotters" ? await this.providerPhoto(flight) : null)
      || (this.source !== "catalog" ? await this.commonsPhoto(flight, true) : null);
    if (exact) return exact;
    const catalogFallback = await this.catalogPhoto(flight, false);
    if (catalogFallback) return catalogFallback;
    const airlinePhoto = this.source !== "catalog" ? await this.commonsPhoto(flight, false) : null;
    if (airlinePhoto) return airlinePhoto;
    return await this.catalogPhoto(flight, false, true)
      || (this.source !== "catalog" ? await this.commonsPhoto(flight, false, true) : null);
  }

  async commonsPhoto(flight, exact, anyAirline = false) {
    const registration = inkCode(flight.r);
    const airline = inkLiveries[inkAirline(flight)]?.name;
    const typeNames = {
      B738: "Boeing 737-800", B38M: "Boeing 737 MAX 8", B39M: "Boeing 737 MAX 9",
      A320: "Airbus A320", A20N: "Airbus A320neo", A321: "Airbus A321", A21N: "Airbus A321neo",
      A388: "Airbus A380", A332: "Airbus A330-200", A333: "Airbus A330-300",
      A359: "Airbus A350-900", A35K: "Airbus A350-1000", B788: "Boeing 787-8",
      B789: "Boeing 787-9", B78X: "Boeing 787-10", B77W: "Boeing 777-300ER",
      B772: "Boeing 777-200", DH8D: "De Havilland Canada DHC-8-400",
    };
    const code = inkCode(flight.t);
    const type = typeNames[code] || (/^[A-Z0-9]{2,4}$/.test(code) ? code : "");
    if (exact ? !/^[A-Z0-9-]{2,12}$/.test(registration) : !type || !anyAirline && !airline) return null;
    const search = exact ? `intitle:"${registration}" filetype:bitmap` : `${anyAirline ? "" : `"${airline}" `}intitle:"${type}" filetype:bitmap`;
    const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: search,
      gsrnamespace: "6", gsrlimit: "12", prop: "imageinfo", iiprop: "url|extmetadata",
      iiurlwidth: "900", format: "json", formatversion: "2", origin: "*" });
    const data = await this.json(`https://commons.wikimedia.org/w/api.php?${params}`);
    for (const page of Array.isArray(data?.query?.pages) ? data.query.pages : []) {
      const image = page.imageinfo?.[0];
      const metadata = image?.extmetadata;
      const license = metadata?.LicenseShortName?.value || "";
      const publicDomain = /^(CC0(?: 1\.0)?|Public domain|PDM(?: 1\.0)?)$/i.test(license)
        && metadata?.AttributionRequired?.value !== "true";
      const credited = this.source === "planespotters" && /^CC BY(?:-SA)? \d\.\d$/i.test(license);
      if (!publicDomain && !credited) continue;
      let link;
      let licenseUrl;
      let photographer;
      if (credited) {
        photographer = String(metadata?.Artist?.value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        try {
          const pageUrl = new URL(image.descriptionurl);
          const termsUrl = new URL(metadata?.LicenseUrl?.value);
          if (pageUrl.protocol === "https:" && pageUrl.hostname === "commons.wikimedia.org"
            && termsUrl.protocol === "https:" && termsUrl.hostname === "creativecommons.org") {
            link = pageUrl.href;
            licenseUrl = termsUrl.href;
          }
        } catch {}
        if (!photographer || !link || !licenseUrl) continue;
      }
      const description = `${page.title || ""} ${metadata?.ImageDescription?.value || ""}`.replace(/<[^>]*>/g, " ");
      if (exact && !new RegExp(`(?:^|[^A-Z0-9])${registration}(?:$|[^A-Z0-9])`, "i").test(page.title || "")) continue;
      if (!exact && ((!anyAirline && !description.toLowerCase().includes(airline.toLowerCase()))
        || !new RegExp(`${type}(?![a-z0-9])`, "i").test(description))) continue;
      if (!exact && registration && description.toUpperCase().includes(registration)) continue;
      const value = image.thumburl || image.url;
      let url;
      try {
        const parsed = new URL(value);
        if (parsed.protocol === "https:" && ["upload.wikimedia.org", "thumb.wikimedia.org"].includes(parsed.hostname)) url = parsed.href;
      } catch {}
      if (url && !this.failedImages.has(url) && await this.loadImage(url)) return { url, match: exact ? "exact" : anyAirline ? "type" : "airline-type", registration: exact ? registration : "", license, photographer, link, licenseUrl };
    }
    return null;
  }
}

function overheadFlights(aircraft, home, radius, timestamp, now = Date.now()) {
  if (!Array.isArray(aircraft) || !inkNumber(home?.latitude) || !inkNumber(home?.longitude)) return [];
  const radians = Math.PI / 180;
  const feedAge = Math.max(0, (now - timestamp) / 1000);
  return aircraft.flatMap((flight) => {
    if (!flight || flight.alt_baro === "ground" || !inkNumber(flight.lat) || !inkNumber(flight.lon)
      || !inkNumber(flight.seen_pos) || flight.seen_pos + feedAge > 90) return [];
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

const inkLiveries = {
  QFA: { name: "QANTAS", tail: "#ad302e", accent: "#ad302e", text: "#343a3b", mark: "Q" },
  QLK: { name: "QANTASLINK", tail: "#ad302e", accent: "#ad302e", text: "#343a3b", mark: "Q" },
  VOZ: { name: "virgin australia", tail: "#f2ede0", accent: "#af343c", text: "#66685f", mark: "Virgin" },
  JST: { name: "Jetstar", tail: "#db823c", accent: "#db823c", text: "#333a39", mark: "★" },
  SIA: { name: "SINGAPORE AIRLINES", tail: "#254662", accent: "#bb944c", text: "#254662", mark: "S" },
  ANZ: { name: "AIR NEW ZEALAND", tail: "#303633", accent: "#303633", text: "#303633", mark: "NZ" },
  UAE: { name: "Emirates", tail: "#bb3436", accent: "#b49457", text: "#a88a45", mark: "E" },
  QTR: { name: "QATAR", tail: "#e5e4db", accent: "#783f54", text: "#783f54", mark: "Q" },
  ETD: { name: "ETIHAD", tail: "#b4a078", accent: "#a98c55", text: "#9b814e", mark: "E" },
  CPA: { name: "CATHAY PACIFIC", tail: "#335a58", accent: "#335a58", text: "#335a58", mark: "C" },
  CCA: { name: "AIR CHINA", tail: "#f2ede0", accent: "#a93b39", text: "#3d4544", mark: "CA" },
  CES: { name: "CHINA EASTERN", tail: "#edece2", accent: "#a43e44", text: "#354867", mark: "MU" },
  CSN: { name: "CHINA SOUTHERN", tail: "#427ba1", accent: "#427ba1", text: "#335a7a", mark: "CZ" },
  FJI: { name: "FIJI AIRWAYS", tail: "#665748", accent: "#665748", text: "#665748", mark: "FJ" },
  TGW: { name: "scoot", tail: "#cfaf43", accent: "#cfaf43", text: "#454944", mark: "scoot" },
  REX: { name: "rex", tail: "#354f70", accent: "#c38246", text: "#354f70", mark: "rex" },
  RXA: { name: "rex", tail: "#354f70", accent: "#c38246", text: "#354f70", mark: "rex" },
};

function inkAirframe(flight) {
  const type = inkCode(flight.t);
  if (flight.category === "A7" || /^(H1[234]|EC[123]|AS[35]|B06|B407|R22|R44|R66)/.test(type)) return "helicopter";
  if (type === "A388") return "double-deck";
  if (/^(A34|B74)/.test(type)) return "four-engine";
  if (/^(A33|A35|B76|B77|B78|A306|A310)/.test(type)) return "widebody";
  if (/^(DH8|AT4|AT7|SF34|JS[34]|BE[123]|PC12|C208)/.test(type)) return "turboprop";
  if (/^(C1[578]|C2[01][026]|PA[234]|SR2|DA[24]|P28)/.test(type)) return "light";
  if (/^(C[567]|CL[356]|GL[567]|G[2456]|LJ|FA[1256789]|E[35]5)/.test(type)) return "business";
  return "narrowbody";
}

function inkAircraft(flight = {}, index = "empty") {
  const livery = inkLiveries[inkAirline(flight)] || { name: "", tail: "#b6bdb5", accent: "#86938d", text: "#535e59", mark: "" };
  const airframe = inkAirframe(flight);
  const identifier = `aircraft-${index}`;
  const defs = `<defs>
    <linearGradient id="${identifier}-body" x2="0" y2="1"><stop stop-color="#f6f3e8"/><stop offset=".45" stop-color="#e9e9df"/><stop offset="1" stop-color="#adb5b0"/></linearGradient>
    <linearGradient id="${identifier}-metal" x2="0" y2="1"><stop stop-color="#dedfd7"/><stop offset="1" stop-color="#89958f"/></linearGradient>
    <pattern id="${identifier}-hatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5L5 0" stroke="#333f39" stroke-width=".45" opacity=".18"/></pattern>
    <filter id="${identifier}-grain" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="8" result="noise"/><feColorMatrix in="noise" type="saturate" values="0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="SourceGraphic" mode="multiply"/></filter>
  </defs>`;
  const open = `<svg class="aircraft-drawing" viewBox="0 0 680 230" role="img" aria-label="${inkEscape(`${livery.name || "Neutral livery"} ${flight.t || airframe} illustration`)}">${defs}<g stroke="#53615c" stroke-width="1.15" stroke-linejoin="round">`;
  if (airframe === "helicopter") return `${open}
    <path d="M146 132Q167 91 224 91L287 121 549 105 566 64 582 65 571 133 291 148Q210 174 150 149Z" fill="url(#${identifier}-body)"/>
    <path d="M157 134Q173 103 207 103L206 135Z M218 103L238 106 270 134 218 135Z" fill="#839b9d"/>
    <path d="M151 144L285 138 552 119 552 131 285 151Q202 174 151 151Z" fill="${livery.accent}"/>
    <path d="M232 91L232 57M60 56L474 56 M76 61L458 51M198 157L190 180 291 180 303 151M170 186L319 186" fill="none" stroke-width="3"/>
    <circle cx="563" cy="114" r="17" fill="#d7dcd4"/><path d="M552 103L574 125M552 125L574 103" stroke-width="2"/>
    <path d="M151 151Q219 175 291 148" fill="none"/><text x="302" y="124" font-size="12" fill="${livery.text}" stroke="none">${inkEscape(flight.r || "")}</text>
  </g></svg>`;
  if (airframe === "light") return `${open}
    <path d="M100 133Q113 122 163 121L438 123 491 79 513 79 499 138 538 149 493 155 163 152 100 143Z" fill="url(#${identifier}-body)"/>
    <path d="M171 120L193 99 265 99 282 124Z" fill="#889c9a"/><path d="M233 125L313 177 394 180 288 124 M216 118L278 86 372 86 268 122" fill="url(#${identifier}-metal)"/>
    <path d="M102 134L442 135 494 99" fill="none" stroke="${livery.accent}" stroke-width="5"/><path d="M98 108L98 164M187 155L180 180M371 157L379 178" fill="none" stroke-width="3"/>
    <circle cx="180" cy="183" r="7" fill="#434c48"/><circle cx="379" cy="181" r="7" fill="#434c48"/>
    <text x="327" y="131" font-size="11" fill="${livery.text}" stroke="none">${inkEscape(flight.r || "")}</text>
  </g></svg>`;
  const wide = ["widebody", "double-deck", "four-engine"].includes(airframe);
  const small = airframe === "business" || airframe === "turboprop";
  const roof = airframe === "double-deck" ? 91 : wide ? 107 : small ? 124 : 117;
  const belly = wide ? 162 : small ? 157 : 158;
  const nose = wide ? 47 : small ? 89 : 61;
  const wing = wide ? 305 : 316;
  const engine = (position, height, size = 1) => `<g transform="translate(${position} ${height}) scale(${size})"><path d="M0-13Q12-18 48-11L52 12Q23 20 3 12Z" fill="url(#${identifier}-metal)"/><path d="M5-12Q18-16 39-12L42 13 8 15Z" fill="${livery.accent}" opacity=".75"/><ellipse rx="10" ry="14" fill="#596762"/><ellipse rx="6" ry="10" fill="#303e3a"/><path d="M-4-6L4 6M-4 6L4-6M0-8V8" opacity=".5" stroke="#bdc5bc"/></g>`;
  const body = `M${nose} 143Q${nose + 13} ${roof + 7} 135 ${roof}L514 ${roof + 3} 562 43 588 43 572 133 635 145 577 ${belly - 2} 139 ${belly}Q${nose + 22} ${belly} ${nose} 143Z`;
  const windows = Array.from({ length: small ? 21 : 44 }, (_, windowIndex) => `<rect x="${small ? 193 + windowIndex * 14 : 159 + windowIndex * 8}" y="${roof + 13}" width="${small ? 6 : 3.5}" height="5" rx="1.5"/>`).join("");
  const tailMark = livery.mark === "Virgin"
    ? `<text x="550" y="104" transform="rotate(-52 550 104)" font-family="Georgia,serif" font-style="italic" font-weight="bold" font-size="21" fill="${livery.accent}" stroke="none">Virgin</text>`
    : `<text x="558" y="100" transform="rotate(-14 558 100)" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="${livery.mark.length > 2 ? 14 : 26}" fill="#f3efe1" stroke="none">${livery.mark}</text>`;
  return `${open}
    <path d="M${wing + 14} ${roof + 23}L432 66 453 68 385 ${roof + 33}" fill="#bbc3ba"/>
    ${airframe === "four-engine" || airframe === "double-deck" ? engine(396, roof + 35, .65) : ""}
    <path d="${body}" fill="url(#${identifier}-body)"/>
    <path d="M515 ${roof + 3}L562 43 588 43 572 133 548 139Z" fill="${livery.tail}"/>
    ${tailMark}
    <path d="M${nose + 9} 147Q125 ${belly - 3} 203 ${belly - 5}H548L574 144" fill="none" stroke="${livery.accent}" stroke-width="${wide ? 5 : 3}" opacity=".85"/>
    <path d="M${nose + 23} ${roof + 11}L${nose + 41} ${roof + 7}H${nose + 56}L${nose + 51} ${roof + 16} ${nose + 21} ${roof + 20}Z" fill="#748d8c"/>
    <g fill="#4c625f" stroke="none">${windows}</g>
    ${airframe === "double-deck" ? `<path d="M158 101H499" stroke="#4c625f" stroke-width="3" stroke-dasharray="3 5"/>` : ""}
    <path d="M143 ${roof + 7}V${belly - 9}H152V${roof + 7}Z M500 ${roof + 9}V${belly - 8}H509V${roof + 9}Z" fill="none" opacity=".6"/>
    <text x="${small ? 218 : 192}" y="${roof + 31}" font-family="${inkAirline(flight) === "VOZ" ? "Georgia,serif" : "Arial,sans-serif"}" font-size="${livery.name.length > 14 ? 13 : 19}" letter-spacing="${livery.name.length > 14 ? 1 : .2}" fill="${livery.text}" stroke="none">${livery.name}</text>
    <text x="457" y="${belly - 10}" font-family="Arial,sans-serif" font-size="6" fill="#4d5b55" stroke="none">${inkEscape(flight.r || "")}</text>
    <path d="M${wing - 33} 148L418 195 475 197 367 142Z" fill="url(#${identifier}-metal)"/>
    <path d="M343 154L428 190 456 192 M366 151L447 185" fill="none" opacity=".4"/>
    <path d="M465 194L482 175 478 199 464 198" fill="${livery.accent}"/>
    <path d="M550 142L626 115 642 117 589 148" fill="#bfc7bd"/>
    ${airframe === "turboprop" ? `<g>${engine(339, 165, .7)}<path d="M331 126L341 201M320 137L352 190" stroke="#455b53" stroke-width="4"/></g>` : engine(small ? 451 : 337, small ? 137 : 174, small ? .6 : wide ? 1.15 : .85)}
    ${airframe === "four-engine" || airframe === "double-deck" ? engine(406, 190, .8) : ""}
    <path d="${body}" fill="url(#${identifier}-hatch)" stroke="none"/>
    <path d="M${nose + 10} 147Q130 ${belly + 2} 250 ${belly - 1}" fill="none" opacity=".5"/>
  </g><g opacity=".12" filter="url(#${identifier}-grain)"><path d="${body}" fill="#e2dfd1"/></g></svg>`;
}

class OverheadFlightsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    if (!config.entity) throw new Error("Set an aircraft feed entity.");
    const radius = config.radius_km ?? 20;
    if (!inkNumber(radius) || radius <= 0 || radius > 20) throw new Error("radius_km must be greater than 0 and at most 20.");
    if (config.latitude !== undefined || config.longitude !== undefined) {
      if (!inkNumber(config.latitude) || !inkNumber(config.longitude)
        || Math.abs(config.latitude) > 90 || Math.abs(config.longitude) > 180) {
        throw new Error("Set both latitude and longitude to valid numeric coordinates.");
      }
    }
    this.config = { ...config, radius_km: radius };
    if (config.photo_source !== undefined && !["planespotters", "public-domain", "catalog"].includes(config.photo_source)) {
      throw new Error("photo_source must be planespotters, public-domain or catalog.");
    }
    if (config.photo_catalog !== undefined && (!Array.isArray(config.photo_catalog)
      || config.photo_catalog.some((item) => !item || typeof item !== "object"))) throw new Error("photo_catalog must be a list of photo entries.");
    this.photos = new OverheadPhotoService(this.config, () => this.render());
    this.render();
  }

  set hass(hass) {
    this.currentHass = hass;
    this.render();
  }

  connectedCallback() {
    this.timer = setInterval(() => this.render(), 15000);
    this.render();
  }

  disconnectedCallback() {
    clearInterval(this.timer);
  }

  getCardSize() { return 12; }

  renderFlight(flight, index) {
    const callsign = String(flight.flight || "").trim() || flight.r || flight.hex || "Unidentified";
    const direction = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(flight.bearing / 45) % 8];
    const rate = flight.baro_rate ?? flight.geom_rate;
    const movement = inkNumber(rate) ? (rate > 128 ? "Climbing" : rate < -128 ? "Descending" : "Level flight") : "Vertical rate unknown";
    const altitude = inkNumber(flight.alt_baro) ? `${Math.round(flight.alt_baro).toLocaleString()} ft` : "Altitude unknown";
    const speed = inkNumber(flight.gs) ? `${Math.round(flight.gs)} kt` : "Speed unknown";
    const heading = inkNumber(flight.track) ? `${Math.round(flight.track)}°` : "—";
    const registration = flight.r || "Registration unknown";
    const type = flight.t || "Aircraft type unknown";
    const photo = this.photos.get(flight);
    const artwork = photo ? `<figure class="livery-art"><div class="livery-image"><img data-flight="${inkEscape(inkPhotoKey(flight))}" src="${inkEscape(photo.url)}" alt="${inkEscape(photo.match === "exact" ? `Photo of ${registration}, rendered in ink style` : `${type}, ${photo.match === "type" ? "another airline may be shown" : "same airline"}; representative photo`)}" decoding="async" referrerpolicy="no-referrer"></div>
      <figcaption>${photo.match === "exact" ? "Registration-matched photo · paintwork may have changed" : `${photo.match === "type" ? "Same aircraft type · airline may differ" : "Same airline &amp; type"} · representative photo${photo.registration ? ` · ${inkEscape(photo.registration)}` : ""}`}</figcaption>
      ${photo.photographer ? `<div class="photo-credit"><a href="${inkEscape(photo.link)}" target="_blank" rel="noopener noreferrer">© ${inkEscape(photo.photographer)}</a>${photo.licenseUrl ? ` · <a href="${inkEscape(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${inkEscape(photo.license)}</a> · ink treatment` : ""}</div>` : ""}</figure>` : `${inkAircraft(flight, index)}<p class="art-note">${this.photos.results.get(inkPhotoKey(flight))?.expires === Infinity ? "Finding aircraft photos…" : "No aircraft photo found · illustration shown"}</p>`;
    return `<article class="flight ${index === 0 ? "nearest" : ""}">
      <div class="tile-top"><span>${index === 0 ? "Nearest aircraft" : `Aircraft ${String(index + 1).padStart(2, "0")}`}</span><span>${flight.distance.toFixed(1)} km · ${direction}</span></div>
      <div class="aircraft">${artwork}</div>
      <h2>${inkEscape(callsign)}</h2><p class="identity">${inkEscape(type)} <span>·</span> ${inkEscape(registration)}</p>
      <p class="movement">${altitude} <span>·</span> ${movement}</p>
      <div class="flight-bottom"><span>Speed <b>${speed}</b></span><span>Track <b>${heading}</b></span></div>
    </article>`;
  }

  render() {
    if (!this.config || !this.currentHass) return;
    const hass = this.currentHass;
    const entity = hass.states[this.config.entity];
    const fixedCentre = this.config.latitude !== undefined;
    const home = fixedCentre ? { latitude: this.config.latitude, longitude: this.config.longitude }
      : hass.states["zone.home"]?.attributes;
    const locationReady = inkNumber(home?.latitude) && inkNumber(home?.longitude);
    const timestamp = Number(entity?.attributes.now);
    const feedTime = timestamp > 1e12 ? timestamp : timestamp * 1000;
    const stale = !Number.isFinite(feedTime) || Date.now() - feedTime > 90000 || feedTime - Date.now() > 60000;
    const unavailable = !entity || ["unknown", "unavailable"].includes(entity.state)
      || !Array.isArray(entity.attributes.ac);
    const ready = !unavailable && !stale && locationReady;
    const flights = ready ? overheadFlights(entity.attributes.ac, home, this.config.radius_km, feedTime) : [];
    const timeOptions = { timeZone: hass.config?.time_zone || "Australia/Melbourne" };
    const clock = new Intl.DateTimeFormat("en-AU", { ...timeOptions, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    const date = new Intl.DateTimeFormat("en-AU", { ...timeOptions, weekday: "short", day: "numeric", month: "short" }).format(new Date());
    const update = Number.isFinite(feedTime) ? new Intl.DateTimeFormat("en-AU", { ...timeOptions, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(feedTime)) : "Awaiting feed";
    const status = !locationReady ? "Home zone missing" : unavailable ? "Feed unavailable" : stale ? "Feed delayed" : "In the air now";
    const message = !locationReady ? "Set your Home zone location in Home Assistant to centre the search."
      : unavailable ? "Waiting for live aircraft data. Check the feed setup and connection."
      : stale ? "The last update is over 90 seconds old. Aircraft will return when the feed recovers."
      : "No aircraft overhead right now. The next arrival will appear here automatically.";
    this.shadowRoot.innerHTML = `<style>
      :host { display:block; --paper:#f4f1e7; --ink:#282c29; --wash:#d9ddd3; color:var(--ink); }
      * { box-sizing:border-box; }
      .surround { min-height:calc(100vh - 64px); padding:36px 22px; background:#e6e4dc; }
      ha-card { display:block; max-width:1080px; margin:auto; padding:42px; border:1px solid #57594f; border-radius:2px; background:var(--paper); color:var(--ink); box-shadow:0 8px 32px #25282013; font-family:Georgia,'Times New Roman',serif; }
      .masthead,.tile-top,.flight-bottom,.footer,.eyebrow,.stats label { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; }
      .masthead { display:flex; justify-content:space-between; gap:12px; padding-bottom:13px; border-bottom:1px solid var(--ink); font-size:11px; letter-spacing:1.2px; text-transform:uppercase; }
      header { display:flex; justify-content:space-between; align-items:end; gap:16px; padding:27px 0 25px; }
      h1 { font-size:clamp(48px,9vw,82px); line-height:.95; margin:0; font-weight:400; letter-spacing:-4px; }
      .subtitle { margin:13px 0 0; font-style:italic; font-size:16px; }
      .clock { text-align:right; white-space:nowrap; font-size:30px; }
      .clock small { display:block; margin-top:5px; font-size:13px; font-style:italic; }
      .stats { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--ink); margin-bottom:22px; }
      .stats>div { padding:16px 19px; }
      .stats>div+div { border-left:1px solid var(--ink); }
      .stats label { display:block; text-transform:uppercase; font-size:10px; letter-spacing:1px; margin-bottom:7px; }
      .stats strong { font-size:27px; font-weight:400; }
      .stats small { font-size:13px; font-style:italic; }
      .eyebrow { display:flex; align-items:center; gap:7px; margin:22px 0 12px; font-size:10px; text-transform:uppercase; letter-spacing:1.4px; }
      .dot { width:6px; height:6px; background:var(--ink); border-radius:50%; }
      .tiles { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
      .flight { min-width:0; padding:19px 21px 0; border:1px solid #74776b; background:repeating-linear-gradient(135deg,transparent,transparent 4px,#282c2905 4px,#282c2905 5px); text-align:center; }
      .nearest { grid-column:1/-1; --wash:#cdd4c5; }
      .tile-top { display:flex; justify-content:space-between; gap:10px; font-size:10px; text-transform:uppercase; letter-spacing:.6px; text-align:left; }
      .aircraft { margin:15px auto 0; max-width:480px; }
      .nearest .aircraft { max-width:660px; margin-top:8px; }
      .livery-art { margin:18px 0; }
      .livery-image { position:relative; background:var(--paper); }
      .livery-image img { display:block; width:100%; height:auto; max-height:360px; object-fit:contain; filter:url(#overhead-photo-ink); mix-blend-mode:multiply; }
      .livery-image::after { content:""; position:absolute; inset:0; pointer-events:none; opacity:.15; background:radial-gradient(#333b32 .5px,transparent .8px); background-size:3px 3px; mix-blend-mode:multiply; }
      .livery-art figcaption,.photo-credit,.art-note { font-size:10px; line-height:1.5; font-style:italic; margin:7px 0 10px; }
      .photo-credit { margin-top:-5px; }
      svg { width:100%; height:auto; display:block; }
      h2 { font-size:27px; font-weight:400; letter-spacing:1px; margin:0 0 6px; overflow-wrap:anywhere; }
      .identity,.movement { margin:5px 0; font-size:14px; }
      .identity span,.movement span { margin:0 5px; }
      .movement { font-style:italic; }
      .flight-bottom { display:flex; justify-content:center; gap:25px; margin-top:20px; padding:11px 0; border-top:1px solid #74776b; font-size:10px; }
      .flight-bottom b { margin-left:6px; font-weight:400; }
      .empty { grid-column:1/-1; text-align:center; padding:40px 20px 48px; border:1px solid #74776b; }
      .empty svg { max-width:350px; margin:auto; opacity:.55; }
      .empty h2 { font-size:28px; margin:15px 0 12px; }
      .empty p { max-width:380px; margin:auto; font-style:italic; line-height:1.6; }
      .footer { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-top:24px; padding-top:12px; border-top:1px solid var(--ink); font-size:9px; line-height:1.7; letter-spacing:.5px; text-transform:uppercase; }
      a { color:inherit; text-underline-offset:3px; }
      @media(max-width:600px) { .surround { padding:12px 8px; } ha-card { padding:23px 17px; } .masthead { font-size:9px; letter-spacing:.5px; } h1 { letter-spacing:-2px; } .clock { font-size:24px; } .clock small { font-size:11px; } .subtitle { font-size:13px; } .stats>div { padding:12px 10px; } .stats label { font-size:8px; } .stats strong { font-size:23px; } .stats small { display:block; margin-top:3px; font-size:11px; } .tiles { grid-template-columns:1fr; } .flight { padding:17px 15px 0; } }
      @media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto; } }
    </style><svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><filter id="overhead-photo-ink" color-interpolation-filters="sRGB">
      <feColorMatrix type="saturate" values=".78" result="colour"/>
      <feComponentTransfer in="colour" result="paint"><feFuncR type="discrete" tableValues=".1 .24 .38 .52 .66 .8 .94"/><feFuncG type="discrete" tableValues=".1 .24 .38 .52 .66 .8 .94"/><feFuncB type="discrete" tableValues=".1 .24 .38 .52 .66 .8 .94"/></feComponentTransfer>
      <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="grey"/>
      <feConvolveMatrix in="grey" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" divisor="1" bias="1" preserveAlpha="true" result="edges"/>
      <feBlend in="paint" in2="edges" mode="multiply"/>
    </filter></defs></svg><div class="surround"><ha-card>
      <div class="masthead"><span>A field guide to the sky</span><span>Within ${this.config.radius_km} km of ${fixedCentre ? "search centre" : "home"}</span></div>
      <header><div><h1>Overhead.</h1><p class="subtitle">A little closer to the world above.</p></div><div class="clock">${clock}<small>${date}</small></div></header>
      <div class="stats"><div><label>In the air</label><strong>${ready ? String(flights.length).padStart(2, "0") : "—"}</strong> <small>aircraft</small></div><div><label>Search radius</label><strong>${this.config.radius_km}</strong> <small>kilometres</small></div><div><label>Nearest</label><strong>${flights.length ? flights[0].distance.toFixed(1) : "—"}</strong> <small>km from ${fixedCentre ? "centre" : "home"}</small></div></div>
      <div class="eyebrow"><span class="dot"></span>${status} · nearest first</div>
      <section class="tiles" aria-label="Aircraft within ${this.config.radius_km} kilometres">${flights.length ? flights.map((flight, index) => this.renderFlight(flight, index)).join("") : `<div class="empty">${inkAircraft()}<h2>${ready ? "A quiet patch of sky." : "Watching the sky."}</h2><p>${message}</p></div>`}</section>
      <div class="footer"><span>Updated ${update} · refresh 30 s</span><span>Airborne only · ADS-B coverage varies · <a href="https://www.adsb.lol" target="_blank" rel="noopener noreferrer">ADS-B.lol</a></span></div>
    </ha-card></div>`;
    for (const image of this.shadowRoot.querySelectorAll(".livery-image img")) {
      const reject = () => {
        const flight = flights.find((item) => inkPhotoKey(item) === image.dataset.flight);
        if (flight) this.photos.reject(flight);
      };
      image.addEventListener("error", reject, { once: true });
      if (image.complete && !image.naturalWidth) reject();
    }
  }
}

if (!customElements.get("overhead-flights-card")) customElements.define("overhead-flights-card", OverheadFlightsCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "overhead-flights-card", name: "Overhead · Ink", description: "An ink and paper aircraft field guide within 20 km of home." });
