// Set to true when you eventually deploy this seller dashboard to Vercel
const IS_PRODUCTION = false; 

export const API_BASE_URL = IS_PRODUCTION
  ? "https://jamba-project.onrender.com"
  : "http://localhost:5000";