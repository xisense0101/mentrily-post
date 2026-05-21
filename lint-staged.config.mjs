export default {
  '*.{js,jsx,ts,tsx,mjs,cjs,json,md,yml,yaml}': ['prettier --write'],
  '*.{ts,tsx,js,jsx,mjs,cjs}': ['eslint --fix'],
};
