module.exports = {
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  env: {
    es2022: true,
    node: true,
  },
  rules: {
    "no-unused-vars": "warn",
  },
};
