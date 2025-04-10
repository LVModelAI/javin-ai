/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "tailwindcss/nesting": {},
    tailwindcss: {},
  },
};

export default config;
// Note: postcss is used via config, not imported in source – safe to ignore depcheck warning
