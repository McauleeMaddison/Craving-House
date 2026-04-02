import assert from "node:assert/strict";
import test from "node:test";

import { getConfiguredPublicOrigin, getConfiguredPublicUrl, getConfiguredVapidSubject } from "./public-url.ts";

test("getConfiguredPublicUrl normalizes ports, paths, and trailing slash noise", () => {
  const url = getConfiguredPublicUrl({
    NEXTAUTH_URL: "https://cravinghouse.com:443/shop/?x=1#top"
  });

  assert.equal(url?.origin, "https://cravinghouse.com");
  assert.equal(url?.pathname, "/");
  assert.equal(url?.search, "");
  assert.equal(url?.hash, "");
});

test("getConfiguredPublicOrigin strips Render internal port", () => {
  assert.equal(
    getConfiguredPublicOrigin({
      NEXTAUTH_URL: "https://craving-house.onrender.com:10000"
    }),
    "https://craving-house.onrender.com"
  );
});

test("getConfiguredVapidSubject falls back to canonical public origin", () => {
  assert.equal(
    getConfiguredVapidSubject({
      NEXTAUTH_URL: "https://cravinghouse.co.uk",
      VAPID_SUBJECT: ""
    }),
    "https://cravinghouse.co.uk"
  );
});

test("getConfiguredVapidSubject tolerates a stray closing parenthesis", () => {
  assert.equal(
    getConfiguredVapidSubject({
      NEXTAUTH_URL: "https://cravinghouse.co.uk",
      VAPID_SUBJECT: "https://cravinghouse.co.uk)"
    }),
    "https://cravinghouse.co.uk"
  );
});
