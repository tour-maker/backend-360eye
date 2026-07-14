import AllowedDomain from "../models/allowedDomainModel.js";
import {
  parseDomainInput,
  normalizeOwnerEmails,
  invalidateAllowedDomainCache,
  getSecurityConfigSnapshot,
  DEFAULT_ALLOWED_DOMAINS,
  buildSecurityConfig,
} from "../services/allowedDomainService.js";

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

const DEFAULT_REMINDER_DAYS = 15;

const toPlainDomain = (doc) => {
  if (!doc) {
    return null;
  }

  const plain =
    typeof doc.toObject === "function"
      ? doc.toObject({ getters: true, virtuals: false })
      : { ...doc };

  return plain;
};

const computeIsExpired = (expiryDate) => {
  if (!expiryDate) {
    return false;
  }
  const date = new Date(expiryDate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < now;
};

const mapDomainResponse = (doc) => {
  const plain = toPlainDomain(doc);
  if (!plain) {
    return null;
  }

  return {
    id: plain._id?.toString?.() || plain._id,
    domainLabel: plain.domainLabel,
    domain: plain.domain,
    origin: plain.origin,
    hostname: plain.hostname,
    protocol: plain.protocol,
    contactEmail: plain.contactEmail || "",
    contactPhone: plain.contactPhone || "",
    ownerEmails: Array.isArray(plain.ownerEmails) ? plain.ownerEmails : [],
    expiryDate: plain.expiryDate || null,
    remindBeforeDays:
      typeof plain.remindBeforeDays === "number" ? plain.remindBeforeDays : DEFAULT_REMINDER_DAYS,
    lastReminderSentAt: plain.lastReminderSentAt || null,
    isActive: plain.isActive !== undefined ? plain.isActive : true,
    isSystemDomain: Boolean(plain.isSystemDomain),
    notes: plain.notes || "",
    createdAt: plain.createdAt || null,
    updatedAt: plain.updatedAt || null,
    expired: computeIsExpired(plain.expiryDate),
  };
};

const toSecurityConfigPayload = (config) => {
  if (!config) {
    const fallback = buildSecurityConfig(DEFAULT_ALLOWED_DOMAINS, IS_DEVELOPMENT);
    return {
      frameAncestors: fallback.frameAncestors,
      frameAncestorsDirective: fallback.frameAncestorsDirective,
      allowedOrigins: fallback.allowedOrigins,
    };
  }

  return {
    frameAncestors: config.frameAncestors,
    frameAncestorsDirective: config.frameAncestorsDirective,
    allowedOrigins: config.allowedOrigins,
  };
};

const resolveExpiryDate = (rawValue) => {
  if (rawValue === undefined) {
    return undefined;
  }
  if (rawValue === null || rawValue === "") {
    return null;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid expiry date provided");
  }
  return date;
};

const resolveReminderWindow = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error("Reminder window must be a number");
  }

  if (parsed < 1 || parsed > 90) {
    throw new Error("Reminder window must be between 1 and 90 days");
  }

  return Math.round(parsed);
};

const applyMutableFields = (domain, body, allowIdentifierChanges) => {
  if (!domain) {
    throw new Error("Domain record not found");
  }

  if (allowIdentifierChanges && (body.origin || body.domain || body.hostname)) {
    const candidate = body.origin || body.domain || body.hostname;
    const parsed = parseDomainInput(candidate);

    domain.domain = body.domain ? body.domain.trim() : parsed.hostname;
    domain.origin = parsed.origin;
    domain.hostname = parsed.hostname;
    domain.protocol = parsed.protocol;
    if (!body.domainLabel && !domain.domainLabel) {
      domain.domainLabel = parsed.hostname;
    }
  }

  if (body.domainLabel !== undefined) {
    domain.domainLabel = body.domainLabel ? String(body.domainLabel).trim() : "";
  }

  if (body.contactEmail !== undefined) {
    domain.contactEmail = body.contactEmail ? String(body.contactEmail).trim() : "";
  }

  if (body.contactPhone !== undefined) {
    domain.contactPhone = body.contactPhone ? String(body.contactPhone).trim() : "";
  }

  if (body.ownerEmails !== undefined) {
    domain.ownerEmails = normalizeOwnerEmails(body.ownerEmails);
  }

  if (body.notes !== undefined) {
    domain.notes = body.notes ? String(body.notes).trim() : "";
  }

  if (body.isActive !== undefined) {
    domain.isActive = Boolean(body.isActive);
  }

  const expiryDate = resolveExpiryDate(body.expiryDate);
  if (expiryDate !== undefined) {
    domain.expiryDate = expiryDate;
  }

  const reminderWindow = resolveReminderWindow(body.remindBeforeDays);
  if (reminderWindow !== undefined) {
    domain.remindBeforeDays = reminderWindow;
  }
};

const handleControllerError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Domain already exists in allow list",
    });
  }

  const isClientError =
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error.message?.includes("Invalid") ||
    error.message?.includes("Reminder window") ||
    error.message?.includes("must be");

  const statusCode = isClientError ? 400 : 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
  });
};

export const listAllowedDomains = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const includeExpired = req.query.includeExpired === "true";

    const filter = includeInactive ? {} : { isActive: true };

    const domains = await AllowedDomain.find(filter).sort({ createdAt: -1 }).lean();
    const today = new Date();

    const filteredDomains = domains.filter((domain) => {
      if (includeExpired || !domain.expiryDate) {
        return true;
      }
      const expiryDate = new Date(domain.expiryDate);
      return expiryDate >= today;
    });

    const payload = filteredDomains.map(mapDomainResponse);
    const securityConfig = await getSecurityConfigSnapshot(IS_DEVELOPMENT);

    return res.json({
      success: true,
      domains: payload,
      securityConfig: toSecurityConfigPayload(securityConfig),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch allowed domains");
  }
};

export const getAllowedDomain = async (req, res) => {
  try {
    const domain = await AllowedDomain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Allowed domain not found",
      });
    }

    return res.json({
      success: true,
      domain: mapDomainResponse(domain),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch allowed domain");
  }
};

export const createAllowedDomain = async (req, res) => {
  try {
    const candidate = req.body.origin || req.body.domain || req.body.hostname;
    const parsed = parseDomainInput(candidate);
    const expiryDate = resolveExpiryDate(req.body.expiryDate);
    const reminderWindow = resolveReminderWindow(req.body.remindBeforeDays);

    const domain = await AllowedDomain.create({
      domainLabel: req.body.domainLabel ? String(req.body.domainLabel).trim() : parsed.hostname,
      domain: req.body.domain ? String(req.body.domain).trim() : parsed.hostname,
      origin: parsed.origin,
      hostname: parsed.hostname,
      protocol: parsed.protocol,
      contactEmail: req.body.contactEmail ? String(req.body.contactEmail).trim() : "",
      contactPhone: req.body.contactPhone ? String(req.body.contactPhone).trim() : "",
      ownerEmails: normalizeOwnerEmails(req.body.ownerEmails),
      expiryDate: expiryDate === undefined ? undefined : expiryDate,
      remindBeforeDays:
        reminderWindow === undefined ? DEFAULT_REMINDER_DAYS : reminderWindow,
      notes: req.body.notes ? String(req.body.notes).trim() : "",
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
      isSystemDomain: false,
    });

    invalidateAllowedDomainCache();
    const securityConfig = await getSecurityConfigSnapshot(IS_DEVELOPMENT);

    return res.status(201).json({
      success: true,
      message: "Allowed domain created successfully",
      domain: mapDomainResponse(domain),
      securityConfig: toSecurityConfigPayload(securityConfig),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to create allowed domain");
  }
};

export const updateAllowedDomain = async (req, res) => {
  try {
    const domain = await AllowedDomain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Allowed domain not found",
      });
    }

    const allowIdentifierChanges = !domain.isSystemDomain;

    if (domain.isSystemDomain && (req.body.origin || req.body.domain || req.body.hostname)) {
      return res.status(400).json({
        success: false,
        message: "System domains cannot be reassigned",
      });
    }

    applyMutableFields(domain, req.body, allowIdentifierChanges);

    await domain.save();
    invalidateAllowedDomainCache();
    const securityConfig = await getSecurityConfigSnapshot(IS_DEVELOPMENT);

    return res.json({
      success: true,
      message: "Allowed domain updated successfully",
      domain: mapDomainResponse(domain),
      securityConfig: toSecurityConfigPayload(securityConfig),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to update allowed domain");
  }
};

export const updateAllowedDomainStatus = async (req, res) => {
  try {
    const domain = await AllowedDomain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Allowed domain not found",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive flag must be provided as boolean",
      });
    }

    if (domain.isSystemDomain && !req.body.isActive) {
      return res.status(400).json({
        success: false,
        message: "System domains cannot be deactivated",
      });
    }

    domain.isActive = req.body.isActive;
    await domain.save();

    invalidateAllowedDomainCache();
    const securityConfig = await getSecurityConfigSnapshot(IS_DEVELOPMENT);

    return res.json({
      success: true,
      message: "Allowed domain status updated successfully",
      domain: mapDomainResponse(domain),
      securityConfig: toSecurityConfigPayload(securityConfig),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to update domain status");
  }
};

export const deleteAllowedDomain = async (req, res) => {
  try {
    const domain = await AllowedDomain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Allowed domain not found",
      });
    }

    if (domain.isSystemDomain) {
      return res.status(400).json({
        success: false,
        message: "System domains cannot be deleted",
      });
    }

    await domain.deleteOne();
    invalidateAllowedDomainCache();
    const securityConfig = await getSecurityConfigSnapshot(IS_DEVELOPMENT);

    return res.json({
      success: true,
      message: "Allowed domain removed successfully",
      domain: mapDomainResponse(domain),
      securityConfig: toSecurityConfigPayload(securityConfig),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to delete allowed domain");
  }
};

export const refreshSecurityConfig = async (_req, res) => {
  try {
    invalidateAllowedDomainCache();
    const securityConfig = await getSecurityConfigSnapshot(IS_DEVELOPMENT);

    return res.json({
      success: true,
      message: "Security configuration refreshed",
      securityConfig: toSecurityConfigPayload(securityConfig),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to refresh security configuration");
  }
};

export const getSecurityConfigPreview = async (_req, res) => {
  try {
    const securityConfig = await getSecurityConfigSnapshot(IS_DEVELOPMENT);
    return res.json({
      success: true,
      securityConfig: toSecurityConfigPayload(securityConfig),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to load security configuration");
  }
};
