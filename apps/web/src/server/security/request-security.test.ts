import assert from "node:assert/strict";
import test from "node:test";

import { isSameOrigin } from "./request-security.ts";

test("isSameOrigin allows loopback development origins even when NEXTAUTH_URL points elsewhere", () => {
  const previous = process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_URL = "https://craving-house.onrender.com";

  try {
    const request = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        origin: "http://127.0.0.1:3000"
      }
    });

    assert.equal(isSameOrigin(request), true);
  } finally {
    process.env.NEXTAUTH_URL = previous;
  }
});

test("isSameOrigin rejects cross-site browser origins", () => {
  const previous = process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_URL = "https://craving-house.onrender.com";

  try {
    const request = new Request("http://127.0.0.1:3000/api/orders", {
      method: "POST",
      headers: {
        origin: "https://evil.example"
      }
    });

    assert.equal(isSameOrigin(request), false);
  } finally {
    process.env.NEXTAUTH_URL = previous;
  }
});

test("isSameOrigin rejects cross-site browser fetches even when origin is omitted", () => {
  const request = new Request("https://craving-house.onrender.com/api/orders", {
    method: "POST",
    headers: {
      "sec-fetch-site": "cross-site"
    }
  });

  assert.equal(isSameOrigin(request), false);
});
