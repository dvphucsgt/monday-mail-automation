export const BASE_API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

export const STATUS_CODE = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export const AUTH_PROVIDERS = {
  GMAIL: 'gmail',
  OUTLOOK: 'outlook'
};
