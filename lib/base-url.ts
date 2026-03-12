const getBaseUrl = () => {
  return process.env.BASE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
};

export { getBaseUrl };
