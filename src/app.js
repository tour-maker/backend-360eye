import express from "express";
import dotenv from "dotenv";

import axios from "axios";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Routes imports
import ProductRoute from "../src/routes/adminPanelRoutes/productRoutes.js";
import AlbumRoute from "../src/routes/adminPanelRoutes/albumRoutes.js";
import ThreeSixtyProductRoute from "../src/routes/adminPanelRoutes/product360Routes.js";
import SEORoute from "../src/routes/adminPanelRoutes/seoRoutes.js";
import EmailSettingRoute from "./routes/adminPanelRoutes/emailSettingRoutes.js";
import CategoryRoute from "../src/routes/adminPanelRoutes/categoryRoutes.js";
import SliderRoute from "../src/routes/adminPanelRoutes/sliderRoutes.js";
import PublicSliderRoute from "../src/routes/publicRoutes/publicSliderRoutes.js";
import FilterRoute from "../src/routes/adminPanelRoutes/filterRoutes.js";
import CareerRoute from "../src/routes/adminPanelRoutes/careerRoutes.js";
import PartnerRoute from "../src/routes/adminPanelRoutes/partnerRoutes.js";
import PublicPartnerRoute from "../src/routes/publicRoutes/publicPartnerRoutes.js";
import PageRedirectRoute from "../src/routes/adminPanelRoutes/redirectURLRoutes.js";
import authRoutes from "./routes/adminPanelRoutes/authRoutes.js";
import PropertyTypeRoute from "./routes/adminPanelRoutes/propertyTypeRoutes.js";
import PropertyStatusRoute from "./routes/adminPanelRoutes/propertyStatusRoutes.js";
import websiteProducts from "./routes/websiteRoutes/productRoutes.js";
import websitePropertyStatus from "./routes/websiteRoutes/propertyStatus.js";
import websitePropertyType from "./routes/websiteRoutes/propertyType.js";
import ImageRoute from "./routes/adminPanelRoutes/imageRoutes.js";
import AreaRoute from "./routes/adminPanelRoutes/areaRoute.js";
import EnquiryRoute from "./routes/adminPanelRoutes/enquiryRoutes.js";
import { handleRedirect } from "./controllers/redirectURLController.js"; // Import the redirect handler
import uploadRoutes from './routes/adminPanelRoutes/uploadRoutes.js';
import AllowedDomainRoute from "./routes/adminPanelRoutes/allowedDomainRoutes.js";
import BlogRoute from "./routes/adminPanelRoutes/blogRoutes.js";
import ClientAccessRoute from "./routes/adminPanelRoutes/clientAccessRoutes.js";
import ClientAccessPublicRoute from "./routes/websiteRoutes/clientAccessPublicRoutes.js";
import {
  verifyTourAccessToken,
  TOUR_ACCESS_COOKIE_NAME,
  TOUR_ACCESS_QUERY_PARAM,
} from "./utils/tourAccessToken.js";
import {
  getSecurityConfigSnapshot,
  buildSecurityConfig,
  DEFAULT_ALLOWED_DOMAINS,
} from "./services/allowedDomainService.js";
// Configuration
dotenv.config({ path: "./.env" });

const app = express();
app.use(cors({
  origin: ["https://stageadminpanel.360eye.in", "https://stagewebsite.360eye.in", "http://localhost:3000", "http://localhost:5173"],
  credentials: true,
}));
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, ".."); // Adjust based on server file location

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
const FALLBACK_SECURITY_CONFIG = buildSecurityConfig(DEFAULT_ALLOWED_DOMAINS, IS_DEVELOPMENT);
const ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS, PATCH";
const ALLOWED_HEADERS = "Origin, X-Requested-With, Content-Type, Accept, Authorization, Content-Length";

const ensureSecurityConfig = async () => {
  try {
    return await getSecurityConfigSnapshot(IS_DEVELOPMENT);
  } catch (error) {
    console.error("Failed to load security configuration, falling back to defaults:", error);
    return FALLBACK_SECURITY_CONFIG;
  }
};

const extractOrigin = (value) => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch (_error) {
    return null;
  }
};

const isOriginAllowedByConfig = (value, config) => {
  if (!value) {
    return true;
  }

  const origin = extractOrigin(value);
  if (!origin) {
    return false;
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const hostWithPort = url.host;
    const normalizedOrigin = `${url.protocol}//${url.host}`;

    return (
      config.allowedOriginsSet.has(hostname) ||
      config.allowedOriginsSet.has(hostWithPort) ||
      config.allowedOriginsSet.has(normalizedOrigin) ||
      config.frameAncestors.includes(normalizedOrigin)
    );
  } catch (_error) {
    return false;
  }
};

const determineAllowedOrigin = (req, config) => {
  const originHeader = req.get("origin");
  if (originHeader && isOriginAllowedByConfig(originHeader, config)) {
    return originHeader;
  }

  const refererHeader = req.get("referer");
  const refererOrigin = extractOrigin(refererHeader);
  if (refererOrigin && isOriginAllowedByConfig(refererOrigin, config)) {
    return refererOrigin;
  }

  if (!originHeader) {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const forwardedHost = req.headers["x-forwarded-host"];
    const protocol = forwardedProto || req.protocol;
    const host = forwardedHost || req.get("host");

    if (protocol && host) {
      return `${protocol}://${host}`;
    }
  }

  return null;
};

const applySecurityHeaders = (req, res, config) => {
  const allowedOrigin = determineAllowedOrigin(req, config);
  if (allowedOrigin) {
    res.header("Access-Control-Allow-Origin", allowedOrigin);
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.header("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.header("Access-Control-Allow-Credentials", "true");
  res.setHeader("Content-Security-Policy", config.frameAncestorsDirective);
  if (config.xFrameOptionsValue) res.setHeader("X-Frame-Options", config.xFrameOptionsValue);
};

const securityConfigMiddleware = (req, res, next) => {
  ensureSecurityConfig()
    .then((config) => {
      req.securityConfig = config;
      applySecurityHeaders(req, res, config);

      if (req.method === "OPTIONS") {
        return res.status(200).end();
      }

      next();
    })
    .catch((error) => {
      console.error("Security configuration middleware failed:", error);
      req.securityConfig = FALLBACK_SECURITY_CONFIG;
      applySecurityHeaders(req, res, FALLBACK_SECURITY_CONFIG);

      if (req.method === "OPTIONS") {
        return res.status(200).end();
      }

      next();
    });
};

const resolveSecurityConfig = (req) => req.securityConfig || FALLBACK_SECURITY_CONFIG;

const isAllowedOrigin = (req, config = resolveSecurityConfig(req)) => {
  const originHeader = req.get("origin");
  const refererHeader = req.get("referer");

  if (!originHeader && !refererHeader) {
    return true;
  }

  const valuesToCheck = [originHeader, extractOrigin(refererHeader)];
  return valuesToCheck.some((value) => isOriginAllowedByConfig(value, config));
};

app.use(securityConfigMiddleware);

// Add diagnostic endpoint to check current security configuration
app.get('/api/security-config', (req, res) => {
  const config = resolveSecurityConfig(req);
  res.json({
    status: 'OK',
    frameAncestors: config.frameAncestors,
    frameAncestorsDirective: config.frameAncestorsDirective,
    allowedOrigins: config.allowedOrigins,
    timestamp: new Date().toISOString(),
  });
});

// Add CDN connectivity test endpoint
app.get('/api/test-cdn', async (req, res) => {
  try {
    console.log('[CDN TEST] Testing connectivity to CloudFront...');
    
    // Test with actual tour file that should exist
    const testUrl = `${CDN_BASE_URL}/gallery/3d/raghuvirmastertour/index.html`;
    
    const response = await axios.get(testUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://stagewebsite.360eye.in/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });
    
    res.json({
      status: 'OK',
      cdnBaseUrl: CDN_BASE_URL,
      testUrl,
      responseStatus: response.status,
      responseHeaders: Object.keys(response.headers),
      contentLength: response.headers['content-length'],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CDN TEST] Failed:', error.message);
    
    // Try alternative: direct iframe embed without proxying
    res.json({
      status: 'ERROR',
      cdnBaseUrl: CDN_BASE_URL,
      error: error.message,
      code: error.code,
      suggestion: 'Consider using direct iframe embedding instead of server-side proxying',
      alternativeUrl: `${CDN_BASE_URL}/gallery/3d/raghuvirmastertour/index.html`,
      timestamp: new Date().toISOString(),
    });
  }
});

// Add diagnostic endpoint to check server status
app.get('/api/system-check', (req, res) => {
  res.json({
    status: 'OK',
    environment: process.env.NODE_ENV || 'not set',
    serverTime: new Date().toISOString(),
    cdnConfig: {
      baseUrl: 'true'
    }
  });
});

// CDN Configuration for serving tours
// Use environment variable or default based on NODE_ENV
const CDN_BASE_URL = process.env.CDN_BASE_URL || 
  (IS_DEVELOPMENT 
    ? 'https://dl8mwi3fl0yp4.cloudfront.net'  // Stage CDN
    : 'https://d2t6r6l6h3adka.cloudfront.net'  // Production CDN
  );

// Middleware to proxy content from CDN (completely hides CDN URL)
const serveCDNFile = async (req, res, cdnPath) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const requestProtocol = forwardedProto || req.protocol;
  const requestHost = forwardedHost || req.get('host');
  const baseUrl = `${requestProtocol}://${requestHost}`;
  const originalUrl = req.originalUrl || req.url;
  const basePath = originalUrl.split('?')[0];

  const params = new URLSearchParams();
  const rawQuery = req.query || {};
  Object.entries(rawQuery).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value !== undefined && value !== null) {
      params.append(key, value);
    }
  });

  const tokenFromQuery = params.get(TOUR_ACCESS_QUERY_PARAM);
  if (tokenFromQuery) {
    params.delete(TOUR_ACCESS_QUERY_PARAM);
  }

  const sanitizedQueryString = params.toString();
  const sanitizedShareUrl = sanitizedQueryString
    ? `${baseUrl}${basePath}?${sanitizedQueryString}`
    : `${baseUrl}${basePath}`;

  let externalCdnUrl = `${CDN_BASE_URL}/${cdnPath}`;
  const stagingCdnUrl = `https://dl8mwi3fl0yp4.cloudfront.net/${cdnPath}`;
  const productionCdnUrl = `https://d2t6r6l6h3adka.cloudfront.net/${cdnPath}`;

  let resolvedCandidate = null;
  for (const preCandidate of [stagingCdnUrl, productionCdnUrl]) {
    try {
      const preCheck = await axios.get(preCandidate, {
        responseType: 'text', validateStatus: (s) => s < 500, timeout: 5000,
      });
      const preBody = String(preCheck.data || '');
      const preIsStub = preBody.includes('http-equiv="refresh"') || preBody.length < 1000;
      if (preCheck.status === 200 && !preIsStub) {
        resolvedCandidate = preCandidate;
        break;
      }
    } catch (e) {}
  }
  if (resolvedCandidate) {
    externalCdnUrl = resolvedCandidate;
  }
  const cdnUrl = sanitizedQueryString
    ? `${baseUrl}/${cdnPath}?${sanitizedQueryString}`
    : `${baseUrl}/${cdnPath}`;


  let metaTitle = '360EYE – 360° Virtual Tour';
  let metaDescription = '';
  let metaKeywords = '';
  let metaImage = 'https://stagewebsite.360eye.in/social-share.jpg';
  let googleAnalyticsId = '';

  const ensureAbsoluteUrl = (value = '') => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const normalized = value.startsWith('/') ? value : `/${value}`;
    return `${requestProtocol}://${requestHost}${normalized}`;
  };

  let matchedTour = null;
  try {
    const Product = (await import('./models/productModel.js')).default;
    const Product360 = (await import('./models/product360Model.js')).default;

    const searchPath = cdnPath.replace('/index.html', '').replace('.html', '');

    matchedTour = await Product.findOne({
      tourURL: { $regex: searchPath, $options: 'i' },
      categoryType: 'Virtual Tour',
      productStatus: 'Yes'
    });

    if (!matchedTour) {
      matchedTour = await Product360.findOne({
        virtualTourLink: { $regex: searchPath, $options: 'i' },
        productStatus: 'Yes'
      });
    }
  } catch (dbError) {
    console.error('Error fetching tour metadata:', dbError.message);
  }
  const matchedTourId = matchedTour ? (matchedTour._id || matchedTour.id) : null;
  const securityConfig = matchedTourId
    ? await getSecurityConfigSnapshot(IS_DEVELOPMENT, matchedTourId)
    : resolveSecurityConfig(req);
  console.log(`[GALLERY ROUTE] Calling serveCDNFile with: ${cdnPath}`);
  console.log(`[SECURITY CONFIG] frameAncestorsDirective: ${securityConfig?.frameAncestorsDirective}`);
  applySecurityHeaders(req, res, securityConfig);


  if (matchedTour) {
    const tourTitle = matchedTour.urlName || matchedTour.tourName || matchedTour.name || '';

    if (tourTitle) {
      metaTitle = tourTitle;
    }

    if (!metaDescription) {
      const detail = matchedTour.productSmallDetail || matchedTour.productDescription || '';
      if (detail) {
        metaDescription = detail.trim();
      }
    }

    if (!metaKeywords) {
      const locationOrTags = matchedTour.productLocation || matchedTour.keyword || matchedTour.tags;
      if (locationOrTags) {
        metaKeywords = locationOrTags;
      }
    }

    if (matchedTour.thumbImage) {
      metaImage = ensureAbsoluteUrl(matchedTour.thumbImage) || metaImage;
    }

    if (matchedTour.googleAnalyticsId) {
      googleAnalyticsId = matchedTour.googleAnalyticsId.trim();
    }
  }

  const normalizeMetaField = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => (item != null ? String(item).trim() : ''))
        .filter(Boolean)
        .join(', ');
    }
    if (value == null) {
      return '';
    }
    return String(value).trim();
  };

  metaTitle = normalizeMetaField(metaTitle) || '360EYE – 360° Virtual Tour';
  metaDescription = normalizeMetaField(metaDescription);
  metaKeywords = normalizeMetaField(metaKeywords);
  metaImage = ensureAbsoluteUrl(metaImage) || 'https://stagewebsite.360eye.in/social-share.jpg';

  const escapeContent = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const escapedMetaTitle = escapeContent(metaTitle);
  const escapedMetaDescription = escapeContent(metaDescription);
  const escapedMetaKeywords = escapeContent(metaKeywords);
  const escapedMetaImage = escapeContent(metaImage);
  const escapedShareUrl = escapeContent(sanitizedShareUrl);

  const descriptionMetaTag = metaDescription
    ? `  <meta name="description" content="${escapedMetaDescription}">
`
    : '';
  const keywordsMetaTag = metaKeywords
    ? `  <meta name="keywords" content="${escapedMetaKeywords}">
`
    : '';
  const ogDescriptionMetaTag = metaDescription
    ? `  <meta property="og:description" content="${escapedMetaDescription}">
`
    : '';
  const twitterDescriptionMetaTag = metaDescription
    ? `  <meta name="twitter:description" content="${escapedMetaDescription}">
`
    : '';

  const metaTags = `
  <title>${escapedMetaTitle}</title>
${descriptionMetaTag}${keywordsMetaTag}  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedShareUrl}">
  <meta property="og:title" content="${escapedMetaTitle}">
${ogDescriptionMetaTag}  <meta property="og:image" content="${escapedMetaImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="360EYE">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapedMetaTitle}">
${twitterDescriptionMetaTag}  <meta name="twitter:image" content="${escapedMetaImage}">

  <!-- WhatsApp -->
  <meta property="og:image:type" content="image/jpeg">`;

  const analyticsSnippet = googleAnalyticsId
    ? `<!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${googleAnalyticsId}');
  </script>`
    : '';

  const tokenCandidates = matchedTour && matchedTour.tourPasswordEnabled
    ? [
        req.cookies ? req.cookies[TOUR_ACCESS_COOKIE_NAME] : undefined,
        tokenFromQuery,
      ].filter(Boolean)
    : [];

  if (matchedTour && matchedTour.tourPasswordEnabled) {
    const expectedTourId = (matchedTour._id || matchedTour.id)?.toString();

    let isAuthorized = false;
    let verifiedToken = null;

    for (const token of tokenCandidates) {
      try {
        const payload = verifyTourAccessToken(token);
        if (payload?.tourId === expectedTourId) {
          isAuthorized = true;
          verifiedToken = token;
          break;
        }
      } catch (tokenError) {
        console.warn('Invalid tour access token:', tokenError.message);
      }
    }

    if (!isAuthorized) {
      const tourTitle = matchedTour.tourName || matchedTour.name || '360° Virtual Tour';
      const verifyEndpoint = `/products/${expectedTourId}/verify-password`;
      const authHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${metaTags}
${analyticsSnippet}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protected Tour – ${tourTitle}</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; padding: 0; font-family: "Inter", "Segoe UI", sans-serif; background: linear-gradient(160deg, #020617 0%, #0f172a 55%, #1e293b 100%); color: #fff; min-height: 100vh; overflow: hidden; }
    .overlay-backdrop { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(2, 6, 23, 0.78); backdrop-filter: blur(10px); z-index: 5; transition: opacity 0.3s ease, visibility 0.3s ease; }
    .overlay-backdrop.hidden { opacity: 0; visibility: hidden; pointer-events: none; }
    .overlay { width: min(100%, 420px); background: rgba(15, 23, 42, 0.96); border-radius: 20px; padding: 32px 28px; box-shadow: 0 25px 60px rgba(15, 23, 42, 0.45); text-align: center; border: 1px solid rgba(148, 163, 184, 0.2); transition: opacity 0.25s ease, transform 0.25s ease; }
    h1 { font-size: 1.9rem; font-weight: 600; margin-bottom: 12px; }
    p.description { margin: 0 0 20px; color: rgba(226, 232, 240, 0.8); line-height: 1.6; }
    form { display: flex; flex-direction: column; gap: 14px; }
    input[type="password"] { padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(15, 23, 42, 0.85); color: #fff; font-size: 1rem; outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
    input[type="password"]:focus { border-color: #87BA3A; box-shadow: 0 0 0 3px rgba(135, 186, 58, 0.25); }
    button { position: relative; padding: 13px 16px; border-radius: 12px; border: none; font-size: 1rem; font-weight: 600; cursor: pointer; background: linear-gradient(135deg, #87BA3A 0%, #6fa82f 100%); color: #fff; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    button:hover:not([disabled]) { transform: translateY(-1px); box-shadow: 0 18px 45px rgba(135, 186, 58, 0.35); }
    button[disabled] { opacity: 0.7; cursor: not-allowed; }
    .spinner { display: none; position: absolute; right: 18px; top: 50%; width: 18px; height: 18px; margin-top: -9px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.75s linear infinite; }
    .error { min-height: 20px; font-size: 0.95rem; color: #f87171; }
    .success { color: #34d399; font-size: 0.95rem; }
    .loading-state { display: none; margin-top: 16px; gap: 12px; align-items: center; justify-content: center; color: #e2e8f0; }
    .loading-state.visible { display: flex; }
    .loading-spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.75s linear infinite; }
    .help { margin-top: 18px; font-size: 0.9rem; color: rgba(226, 232, 240, 0.75); }
    .help a { color: #87BA3A; text-decoration: none; font-weight: 600; }
    .help a:hover { text-decoration: underline; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 520px) {
      body { padding: 20px; }
      .overlay { padding: 28px 24px; }
      h1 { font-size: 1.6rem; }
    }
    .tour-wrapper { position: fixed; inset: 0; background: #fff; }
    .tour-container { position: fixed; inset: 0; opacity: 0; visibility: hidden; transition: opacity 0.4s ease, visibility 0.4s ease; }
    .tour-container.visible { opacity: 1; visibility: visible; }
    .tour-frame { width: 100%; height: 100%; border: 0; display: block; background: #fff; }
  </style>
</head>
<body>
  <div class="overlay-backdrop" id="tour-password-backdrop">
  <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="tour-password-title" id="tour-password-overlay">
    <h1 id="tour-password-title">Protected Tour</h1>
    <p class="description">Enter the password to unlock <strong>${tourTitle}</strong>.</p>
    <form id="tour-password-form" novalidate>
      <input
        id="tour-password-input"
        type="password"
        placeholder="Tour password"
        autocomplete="current-password"
        aria-label="Tour password"
        required
      />
      <button type="submit" id="tour-password-submit">
        Unlock Tour
        <span class="spinner" id="tour-password-spinner"></span>
      </button>
      <div class="error" id="tour-password-error"></div>
      <div class="success" id="tour-password-success"></div>
    </form>
    <p class="help">Need help? Contact <a href="mailto:contact@360eye.in">contact@360eye.in</a></p>
    <div class="loading-state" id="tour-loading-state">
      <div class="loading-spinner"></div>
      <span>Loading tour…</span>
    </div>
  </div>
  </div>

  <div class="tour-wrapper">
  <div class="tour-container" id="tour-content">
    <iframe
      class="tour-frame"
      id="tour-iframe"
      src=""
      title="${metaTitle}"
      allow="fullscreen; gyroscope; accelerometer; xr-spatial-tracking"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"
    ></iframe>
  </div>

  <script>
    (function() {
      const form = document.getElementById('tour-password-form');
      const input = document.getElementById('tour-password-input');
      const submitBtn = document.getElementById('tour-password-submit');
      const spinner = document.getElementById('tour-password-spinner');
      const errorEl = document.getElementById('tour-password-error');
      const successEl = document.getElementById('tour-password-success');
      const overlay = document.getElementById('tour-password-overlay');
      const overlayBackdrop = document.getElementById('tour-password-backdrop');
      const tourContainer = document.getElementById('tour-content');
      const tourIframe = document.getElementById('tour-iframe');
      const loadingState = document.getElementById('tour-loading-state');
      const verifyUrl = ${JSON.stringify(verifyEndpoint)};
      const cdnUrl = ${JSON.stringify(cdnUrl)};

      const finalizeTourDisplay = () => {
        overlayBackdrop.classList.add('hidden');
        overlay.style.display = 'none';
        spinner.style.display = 'none';
        loadingState.classList.remove('visible');
      };

      const showTour = () => {
        tourContainer.classList.add('visible');
        overlay.style.opacity = '0';
        overlay.style.transform = 'translateY(-10px) scale(0.98)';
        setTimeout(finalizeTourDisplay, 320);
      };

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = (input.value || '').trim();

        if (!password) {
          errorEl.textContent = 'Password is required.';
          input.focus();
          return;
        }

        submitBtn.disabled = true;
        spinner.style.display = 'inline-block';
        errorEl.textContent = '';
        successEl.textContent = '';

        try {
          const response = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include'
          });

          const result = await response.json().catch(() => ({}));

          if (response.ok && result && result.success) {
            form.style.display = 'none';
            successEl.textContent = 'Password accepted. Loading tour…';
            loadingState.classList.add('visible');
            spinner.style.display = 'inline-block';

            const handleIframeLoad = () => {
              tourIframe.removeEventListener('load', handleIframeLoad);
              showTour();
              spinner.style.display = 'none';
            };

            tourIframe.addEventListener('load', handleIframeLoad, { once: true });

            // Kick off iframe load
            tourIframe.src = cdnUrl;

            // Safety fallback: if load event does not fire within 4s, still show tour
            setTimeout(() => {
              if (!tourContainer.classList.contains('visible')) {
                tourIframe.removeEventListener('load', handleIframeLoad);
                showTour();
                spinner.style.display = 'none';
              }
            }, 4000);
            return;
          }

          errorEl.textContent = (result && result.message) ? result.message : 'Invalid password. Please try again.';
        } catch (fetchError) {
          console.error('Password verification failed:', fetchError);
          errorEl.textContent = 'Unable to verify password. Please check your connection and try again.';
        } finally {
          submitBtn.disabled = false;
          spinner.style.display = 'none';
          input.focus();
          input.select();
        }
      });

      input.focus();
    })();
  </script>
</body>
</html>`;
      res.status(200)
        .setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', securityConfig.frameAncestorsDirective);
      if (securityConfig.xFrameOptionsValue) res.setHeader("X-Frame-Options", securityConfig.xFrameOptionsValue);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(authHtml);
      return;
    }
  }

  try {
    const isHtmlRequest = cdnPath.endsWith('.html') || cdnPath.endsWith('.htm');

    const embeddedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${metaTags}
${analyticsSnippet}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: #fff;
    }
    .tour-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .tour-frame {
      width: 100%;
      height: 100%;
      border: 0;
    }
  </style>
</head>
<body>
  <div class="tour-container">
    <iframe
      class="tour-frame"
      src="${externalCdnUrl}"
      title="${metaTitle}"
      allow="fullscreen; gyroscope; accelerometer; xr-spatial-tracking"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"
    ></iframe>
  </div>
  <script>
    (function() {
      const tokenParam = ${JSON.stringify(TOUR_ACCESS_QUERY_PARAM)};
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has(tokenParam)) {
        currentUrl.searchParams.delete(tokenParam);
        const newPath = currentUrl.pathname + (currentUrl.searchParams.toString() ? '?' + currentUrl.searchParams.toString() : '') + currentUrl.hash;
        window.history.replaceState({}, document.title, newPath);
      }
    })();
  </script>
</body>
</html>`;

    const userAgent = req.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Pinterest|Googlebot|bingbot|Baiduspider|Yandex|DuckDuckBot/i.test(userAgent);

    const sendEmbeddedHtml = () => {
      const { frameAncestorsDirective, xFrameOptionsValue } = securityConfig;

      res.status(200);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', frameAncestorsDirective);
      if (xFrameOptionsValue) res.setHeader("X-Frame-Options", xFrameOptionsValue);
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (isCrawler) {
        res.send(embeddedHtml);
        return true;
      }

      const isProduction = process.env.NODE_ENV === "production";
      if (tokenCandidates.length > 0) {
        const domain = req.hostname.includes('.360eye.in') ? '.360eye.in' : undefined;
        res.cookie(TOUR_ACCESS_COOKIE_NAME, tokenCandidates[0], {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          maxAge: 10 * 60 * 1000, // 10 minutes
          path: '/',
          domain: domain,
        });
      }

      res.send(embeddedHtml);
      return true;
    };

    if (isHtmlRequest) {
      try {
        const found = !!resolvedCandidate;

        if (found) {
          sendEmbeddedHtml();
          return;
        }

        res.status(404).send(`File not found: ${cdnPath}`);
        return;
      } catch (prefetchError) {
        if (!prefetchError.response) {
          console.warn(`CDN prefetch failed for ${cdnPath}. Falling back to embedded iframe.`, prefetchError.message);
          sendEmbeddedHtml();
          return;
        }

        const status = prefetchError.response.status;

        if (status === 404) {
          res.status(404).send(`File not found: ${cdnPath}`);
          return;
        }

        console.error(`CDN responded with status ${status} for ${cdnPath}. Falling back to embedded iframe.`);
        sendEmbeddedHtml();
        return;
      }
    }

    console.log(`[CDN REQUEST] Attempting to fetch: ${externalCdnUrl}`);
    
    const response = await axios.get(externalCdnUrl, {
      responseType: 'stream',
      validateStatus: (status) => status < 500,
      timeout: 8000, // reduced from 30s
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    console.log(`[CDN RESPONSE] Status: ${response.status}, Headers:`, Object.keys(response.headers));

    res.status(response.status);

    const headersToForward = [
      'content-type',
      'content-length',
      'cache-control',
      'etag',
      'last-modified',
      'content-encoding',
      'content-disposition'
    ];

    headersToForward.forEach(header => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Security-Policy', securityConfig.frameAncestorsDirective);
    if (securityConfig.xFrameOptionsValue) res.setHeader("X-Frame-Options", securityConfig.xFrameOptionsValue);

    response.data.pipe(res);
    return;

  } catch (error) {
    console.error(`[CDN ERROR] Failed to fetch ${cdnPath}:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: `${CDN_BASE_URL}/${cdnPath}`,
      headers: error.config?.headers
    });
    
    // If it's a 403 error and we're trying to load an HTML file, fall back to direct iframe
    if (error.response?.status === 403 && cdnPath.endsWith('.html')) {
      console.log(`[CDN FALLBACK] Using direct iframe for ${cdnPath} due to 403 error`);
      sendEmbeddedHtml();
      return;
    }
    
    if (error.response) {
      res.status(error.response.status).send(`File not found: ${cdnPath}`);
    } else {
      res.status(500).send('Error fetching content from CDN');
    }
  }
};

// Disable helmet for specific routes
const helmetConfig = (req, res, next) => {
  if (req.url.includes('.js') || 
      req.url.includes('.css') || 
      req.url.includes('/lib/') || 
      req.url.includes('/media/')) {
    // Skip helmet for project assets
    next();
  } else {
    // Use helmet for other routes
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
      frameguard: false
    })(req, res, next);
  }
};

// Replace the default helmet with our custom configuration
app.use(helmetConfig);

// Apply URL redirect handler middleware BEFORE gallery restriction
// This ensures that redirects are processed before access control
app.use(handleRedirect);

// Middleware to restrict gallery access to allowed origins
app.use('/gallery/*', (req, res, next) => {
  const securityConfig = resolveSecurityConfig(req);
  if (isAllowedOrigin(req, securityConfig)) {
    return next();
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Security-Policy', securityConfig.frameAncestorsDirective);
  if (securityConfig.xFrameOptionsValue) res.setHeader("X-Frame-Options", securityConfig.xFrameOptionsValue);
  res.status(403).send('Access to this resource is restricted.');
});

// Serve gallery paths with multi-level support - proxy from CDN
app.get('/gallery/*', async (req, res) => {
  // Get the full path after /gallery/
  let fullPath = req.path;
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  console.log(`[GALLERY ROUTE] Serving gallery path: ${fullPath}${queryString}`);
  console.log(`[GALLERY ROUTE] User-Agent: ${req.get('user-agent')}`);
  
  // Check if path has a file extension (look for dot in the last segment)
  const lastSegment = fullPath.split('/').pop();
  const hasFileExtension = lastSegment.includes('.');
  
  // Handle direct file requests (with extensions like .html, .js, .css, .jpg, etc.)
  if (hasFileExtension && !fullPath.endsWith('/')) {
    console.log(`[GALLERY ROUTE] Direct file request: ${fullPath}`);
    console.log(`[GALLERY ROUTE] Calling serveCDNFile with: ${fullPath.substring(1) + queryString}`);
    await serveCDNFile(req, res, fullPath.substring(1) + queryString); // Remove leading slash
    return;
  }
  
  // For directory paths (no file extension), redirect to add trailing slash
  // This ensures relative paths in HTML work correctly
  if (!hasFileExtension && !fullPath.endsWith('/')) {
    console.log(`Redirecting to add trailing slash: ${fullPath}/`);
    res.redirect(301, `${fullPath}/${queryString}`);
    return;
  }
  
  // For directory paths with trailing slash, add index.html
  if (!hasFileExtension && fullPath.endsWith('/')) {
    fullPath += 'index.html';
    console.log(`Adding index.html to trailing slash: ${fullPath}`);
    await serveCDNFile(req, res, fullPath.substring(1) + queryString);
    return;
  }
  
  // Default: serve from CDN
  await serveCDNFile(req, res, fullPath.substring(1) + queryString); // Remove the leading slash
});

// Security Middleware
app.use("/api", uploadRoutes);
// Removed rate limiter to allow unlimited requests
 

// Configure body parsers with appropriate limits for file uploads
// Set reasonable limits that won't exceed your server capabilities
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

// Special body parsing configuration for upload routes with increased limits
app.use('/admin/albums/upload-zip', express.json({ limit: "4000mb" }));
app.use('/admin/albums/upload-zip', express.raw({ limit: "4000mb" }));
app.use('/admin/albums/upload-zip', express.urlencoded({ extended: true, limit: "4000mb" }));

// Set global timeout for all requests
app.use((req, res, next) => {
  // Increase timeout for all requests to 10 minutes
  req.setTimeout(10 * 60 * 1000);
  // For upload routes, set an even longer timeout (30 minutes)
  if (req.originalUrl.includes('/upload') || req.originalUrl.includes('/albums')) {
    req.setTimeout(30 * 60 * 1000);
  }
  next();
});

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Static file serving
app.use(express.static(path.resolve(PROJECT_ROOT, "public")));

// Create upload directories if they don't exist
const uploadDirs = [
  path.resolve(PROJECT_ROOT, "public/uploads"),
  path.resolve(PROJECT_ROOT, "public/uploads/albums"),
  path.resolve(PROJECT_ROOT, "public/uploads/propertyTypes"),
  path.resolve(PROJECT_ROOT, "public/uploads/propertyStatuses"),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}


// Routes
app.use("/products", websiteProducts);
app.use("/propertyStatus", websitePropertyStatus);
app.use("/propertyType", websitePropertyType);
app.use("/admin/auth", authRoutes);
app.use("/admin/products", ProductRoute);
app.use("/admin/albums", AlbumRoute);
app.use("/admin/360-products", ThreeSixtyProductRoute);
app.use("/admin/seo", SEORoute);
app.use("/admin/categories", CategoryRoute);
app.use("/admin/sliders", SliderRoute);
app.use("/public/sliders", PublicSliderRoute);
app.use("/admin/filters", FilterRoute);
app.use("/admin/careers", CareerRoute);
app.use("/admin/partners", PartnerRoute);
app.use("/public/partners", PublicPartnerRoute);
app.use("/admin/page-redirects", PageRedirectRoute); // Make sure this line exists and is correct
app.use("/admin/propertyTypes", PropertyTypeRoute);
app.use("/admin/propertyStatus", PropertyStatusRoute);
app.use("/admin/area", AreaRoute);
app.use("/admin", EmailSettingRoute);
app.use("/admin/enquiries", EnquiryRoute);
app.use("/admin/allowed-domains", AllowedDomainRoute);
app.use("/admin/blogs", BlogRoute);
app.use("/admin/client-access", ClientAccessRoute);
app.use("/client-access", ClientAccessPublicRoute);

// This should be last to catch any remaining admin routes
app.use("/admin", ImageRoute);

// Log available routes for debugging
console.log("Routes registered:");
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    // Routes registered directly on the app
    console.log(
      `${Object.keys(middleware.route.methods).join(", ").toUpperCase()} ${middleware.route.path}`
    );
  } else if (middleware.name === "router") {
    // Router middleware
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        const path = handler.route.path;
        const methods = Object.keys(handler.route.methods)
          .join(", ")
          .toUpperCase();
        console.log(`${methods} ${middleware.regexp} ${path}`);
      }
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 Handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Export the app
export default app;
