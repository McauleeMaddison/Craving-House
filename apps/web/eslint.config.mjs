import next from "eslint-config-next";

const config = [
  ...next,
  {
    rules: {
      // These are React Compiler–style constraints and are too strict for normal
      // data-fetching effects + UI timers.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default config;
