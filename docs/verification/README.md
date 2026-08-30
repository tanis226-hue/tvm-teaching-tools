# Verification scripts

Evidence behind the corrections in the design doc. These are throwaway
models, not the implementation. They become the test suite in `lib/`
during implementation.

- `retirement-verify.js` - reproduces all 27 published Module 1 figures and
  rules out the three alternative rate/residual conventions.
- `rentbuy-model.js` - Module 2 net-worth simulation. Exports `sim()`.
- `rentbuy-golden.js` - golden values for both Module 2 presets.

Run with `node docs/verification/<file>.js`.
