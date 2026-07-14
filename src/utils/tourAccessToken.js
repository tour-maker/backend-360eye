import jwt from "jsonwebtoken";

const TOKEN_SECRET =
  process.env.TOUR_ACCESS_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  "tour_access_secret";

const TOKEN_EXPIRY = process.env.TOUR_ACCESS_TOKEN_EXPIRY || "10m";

const COOKIE_NAME = process.env.TOUR_ACCESS_COOKIE_NAME || "tourAccessToken";
const QUERY_PARAM = process.env.TOUR_ACCESS_QUERY_PARAM || "authToken";
const COOKIE_MAX_AGE_MS = Number.parseInt(process.env.TOUR_ACCESS_COOKIE_MAX_AGE_MS || 600_000, 10); // 10 minutes

export const createTourAccessToken = (tourId) => {
  if (!tourId) {
    throw new Error("tourId is required to create access token");
  }

  return jwt.sign({ tourId }, TOKEN_SECRET, { expiresIn: TOKEN_EXPIRY });
};

export const verifyTourAccessToken = (token) => {
  if (!token) {
    throw new Error("Token is required for verification");
  }

  return jwt.verify(token, TOKEN_SECRET);
};

export const TOUR_ACCESS_COOKIE_NAME = COOKIE_NAME;
export const TOUR_ACCESS_QUERY_PARAM = QUERY_PARAM;
export const TOUR_ACCESS_COOKIE_MAX_AGE_MS = Number.isFinite(COOKIE_MAX_AGE_MS) && COOKIE_MAX_AGE_MS > 0 ? COOKIE_MAX_AGE_MS : 60_000;
