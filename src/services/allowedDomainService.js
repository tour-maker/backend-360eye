import AllowedDomain from "../models/allowedDomainModel.js";

const DEFAULT_ALLOWED_DOMAINS = [
  {
    domainLabel: "Stage Website",
    origin: "https://stagewebsite.360eye.in",
    notes: "System default domain (stage site)",
    isSystemDomain: true,
  },
  {
    domainLabel: "Stage API",
    origin: "https://stageapi.360eye.in",
    notes: "System default domain (stage api)",
    isSystemDomain: true,
  },
  {
    domainLabel: "Production API",
    origin: "https://api.360eye.in",
    notes: "System default domain (production api)",
    isSystemDomain: true,
  },
  {
    domainLabel: "Production Website",
    origin: "https://website.360eye.in",
    notes: "System default domain (production site)",
    isSystemDomain: true,
  },
  {
    domainLabel: "Production Website (www)",
    origin: "https://www.360eye.in",
    notes: "System default domain (production www)",
    isSystemDomain: true,
  },
  {
    domainLabel: "Production Root",
    origin: "https://360eye.in",
    notes: "System default domain (root)",
    isSystemDomain: true,
  },
  {
    domainLabel: "CloudFront CDN (legacy)",
    origin: "https://d2t6r6l6h3adka.cloudfront.net",
    notes: "System default domain (legacy CDN)",
    isSystemDomain: true,
  },
  {
    domainLabel: "CloudFront CDN",
    origin: "https://dl8mwi3fl0yp4.cloudfront.net",
    notes: "System default domain (current CDN)",
    isSystemDomain: true,
  },
  {
    domainLabel: "Admin Panel",
    origin: "https://stageadminpanel.360eye.in",
    notes: "System default admin panel domain",
    isSystemDomain: true,
  },
    {
    domainLabel: "Admin Panel",
    origin: "https://adminpanel.360eye.in",
    notes: "System default admin panel domain",
    isSystemDomain: true,
  },
];

const LOCAL_ORIGINS = [
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5001",
];

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const SECURITY_CONFIG_TTL_MS = 60 * 1000; // 1 minute

let cachedDomains = [];
let cacheExpiresAt = 0;
let ensuringDefaults = false;

let securityConfigCache = null;
let securityConfigExpiresAt = 0;

export const normalizeOwnerEmails = (ownerEmails = []) => {
  if (Array.isArray(ownerEmails)) {
    return ownerEmails.filter(Boolean).map((email) => String(email).trim());
  }

  if (typeof ownerEmails === "string") {
    return ownerEmails
      .split(/[,;\s]+/)
      .map((email) => email.trim())
      .filter(Boolean);
  }

  return [];
};

export const parseDomainInput = (rawDomain) => {
  if (!rawDomain || typeof rawDomain !== "string") {
    throw new Error("Domain/origin is required");
  }

  let candidate = rawDomain.trim();
  if (!candidate) {
    throw new Error("Domain/origin cannot be empty");
  }

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (error) {
    throw new Error("Invalid domain/origin provided");
  }

  if (!parsed.hostname) {
    throw new Error("Domain/origin must include a valid host");
  }

  return {
    origin: `${parsed.protocol}//${parsed.host}`,
    hostname: parsed.host.toLowerCase(),
    protocol: parsed.protocol,
  };
};

const buildPersistencePayload = (input) => {
  const domainInfo = parseDomainInput(input.origin || input.domain || input.hostname || input);

  return {
    domainLabel: input.domainLabel || domainInfo.hostname,
    domain: input.domain || domainInfo.hostname,
    origin: domainInfo.origin,
    hostname: domainInfo.hostname,
    protocol: domainInfo.protocol,
    contactEmail: input.contactEmail || "",
    contactPhone: input.contactPhone || "",
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
    isActive: input.isActive !== undefined ? input.isActive : true,
    notes: input.notes || "",
    remindBeforeDays:
      typeof input.remindBeforeDays === "number" && !Number.isNaN(input.remindBeforeDays)
        ? input.remindBeforeDays
        : 15,
    ownerEmails: normalizeOwnerEmails(input.ownerEmails),
    isSystemDomain: Boolean(input.isSystemDomain),
  };
};

const ensureDefaultAllowedDomains = async () => {
  if (ensuringDefaults) {
    return;
  }

  ensuringDefaults = true;
  try {
    await Promise.all(
      DEFAULT_ALLOWED_DOMAINS.map(async (defaultDomain) => {
        const payload = buildPersistencePayload(defaultDomain);

        await AllowedDomain.updateOne(
          { hostname: payload.hostname },
          {
            $setOnInsert: payload,
            $set: { isSystemDomain: true },
          },
          {
            upsert: true,
          }
        );
      })
    );
  } finally {
    ensuringDefaults = false;
  }
};

export const getActiveAllowedDomains = async () => {
  const now = Date.now();
  if (cacheExpiresAt > now && cachedDomains.length) {
    return cachedDomains;
  }

  await ensureDefaultAllowedDomains();

  const documents = await AllowedDomain.find({ isActive: true }).lean();
  const today = new Date();

  cachedDomains = documents
    .filter((doc) => {
      if (!doc.expiryDate) return true;
      const expiryDate = new Date(doc.expiryDate);
      return expiryDate >= today;
    })
    .map((doc) => {
      const parsed = parseDomainInput(doc.origin || doc.domain || doc.hostname);

      return {
        _id: doc._id?.toString?.() || doc._id,
        domainLabel: doc.domainLabel || parsed.hostname,
        domain: doc.domain || parsed.hostname,
        origin: parsed.origin,
        hostname: parsed.hostname,
        protocol: parsed.protocol,
        contactEmail: doc.contactEmail || "",
        contactPhone: doc.contactPhone || "",
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
        isActive: doc.isActive !== undefined ? doc.isActive : true,
        notes: doc.notes || "",
        remindBeforeDays:
          typeof doc.remindBeforeDays === "number" && !Number.isNaN(doc.remindBeforeDays)
            ? doc.remindBeforeDays
            : 15,
        ownerEmails: normalizeOwnerEmails(doc.ownerEmails),
        lastReminderSentAt: doc.lastReminderSentAt ? new Date(doc.lastReminderSentAt) : null,
        isSystemDomain: Boolean(doc.isSystemDomain),
        allowedTourIds: (doc.allowedTourIds || []).map((id) => id.toString()),
      };
    });

  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedDomains;
};

const createUrlFromOrigin = (value) => {
  if (!value) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(candidate);
  } catch (_error) {
    return null;
  }
};

const registerOrigin = (originValue, frameAncestorSet, allowedOriginsSet) => {
  const url = createUrlFromOrigin(originValue);
  if (!url) {
    return;
  }

  const normalizedOrigin = `${url.protocol}//${url.host}`;
  frameAncestorSet.add(normalizedOrigin);
  allowedOriginsSet.add(url.hostname);
  allowedOriginsSet.add(url.host);
  allowedOriginsSet.add(normalizedOrigin);
};

export const buildSecurityConfig = (domains = [], includeLocalHosts = false, tourId = null) => {
  const frameAncestorSet = new Set();
  const allowedOriginsSet = new Set();

  domains.forEach((domain) => {
    if (!domain) {
      return;
    }

    if (tourId && !domain.isSystemDomain) {
      const restrictedTourIds = (domain.allowedTourIds || []).map((id) => id.toString());
      if (restrictedTourIds.length > 0 && !restrictedTourIds.includes(tourId.toString())) {
        return;
      }
    }

    if (domain.origin) {
      registerOrigin(domain.origin, frameAncestorSet, allowedOriginsSet);
      return;
    }

    if (domain.domain) {
      registerOrigin(domain.domain, frameAncestorSet, allowedOriginsSet);
      return;
    }

    if (domain.hostname) {
      registerOrigin(domain.hostname, frameAncestorSet, allowedOriginsSet);
    }
  });

  if (includeLocalHosts) {
    LOCAL_ORIGINS.forEach((localOrigin) => {
      registerOrigin(localOrigin, frameAncestorSet, allowedOriginsSet);
    });
  }

  if (!frameAncestorSet.size) {
    DEFAULT_ALLOWED_DOMAINS.forEach((defaultDomain) => {
      registerOrigin(defaultDomain.origin, frameAncestorSet, allowedOriginsSet);
    });
  }

  const frameAncestors = Array.from(frameAncestorSet);
  const frameAncestorsDirective = frameAncestors.length
    ? `frame-ancestors ${frameAncestors.join(" ")}`
    : "frame-ancestors 'none'";

  return {
    frameAncestors,
    frameAncestorsDirective,
    allowedOriginsSet,
    allowedOrigins: Array.from(allowedOriginsSet),
    xFrameOptionsValue: "",
  };
};

export const getSecurityConfigSnapshot = async (includeLocalHosts = false, tourId = null) => {
  const now = Date.now();
  if (
    !tourId &&
    securityConfigCache &&
    securityConfigExpiresAt > now &&
    securityConfigCache.includeLocalHosts === includeLocalHosts
  ) {
    return securityConfigCache.config;
  }

  const allowedDomains = await getActiveAllowedDomains();
  const domainsToUse = allowedDomains.length ? allowedDomains : DEFAULT_ALLOWED_DOMAINS;
  const config = buildSecurityConfig(domainsToUse, includeLocalHosts, tourId);

  if (!tourId) {
    securityConfigCache = { includeLocalHosts, config };
    securityConfigExpiresAt = now + SECURITY_CONFIG_TTL_MS;
  }

  return config;
};

export const invalidateSecurityConfigCache = () => {
  securityConfigCache = null;
  securityConfigExpiresAt = 0;
};

export const invalidateAllowedDomainCache = () => {
  cacheExpiresAt = 0;
  cachedDomains = [];
  invalidateSecurityConfigCache();
};

export { DEFAULT_ALLOWED_DOMAINS };
