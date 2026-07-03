import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeUrl,
  normalizePublisherGroup,
  independenceKey,
  isTrackingParam,
} from "../../scripts/lib/url.mjs";

test("canonicalizeUrl lowercases scheme and host and strips www", () => {
  const r = canonicalizeUrl("HTTPS://WWW.Example.COM/Path");
  assert.equal(r.ok, true);
  assert.equal(r.canonical, "https://example.com/Path");
  assert.equal(r.hostname, "example.com");
});

test("canonicalizeUrl strips fragment and tracking params, keeps others sorted", () => {
  const r = canonicalizeUrl("https://example.com/a?utm_source=x&b=2&gclid=g&a=1#frag");
  assert.equal(r.canonical, "https://example.com/a?a=1&b=2");
});

test("canonicalizeUrl normalizes trailing slash", () => {
  assert.equal(canonicalizeUrl("https://example.com/a/").canonical, "https://example.com/a");
  assert.equal(canonicalizeUrl("https://example.com/").canonical, "https://example.com/");
  assert.equal(
    canonicalizeUrl("https://example.com/a/").canonical,
    canonicalizeUrl("https://example.com/a").canonical,
  );
});

test("canonicalizeUrl rejects non-http schemes", () => {
  assert.equal(canonicalizeUrl("ftp://example.com/x").ok, false);
  assert.equal(canonicalizeUrl("javascript:alert(1)").ok, false);
  assert.equal(canonicalizeUrl("file:///etc/passwd").ok, false);
  assert.equal(canonicalizeUrl("data:text/plain,hi").ok, false);
});

test("canonicalizeUrl quarantines unparsable input", () => {
  assert.equal(canonicalizeUrl("not a url").ok, false);
  assert.equal(canonicalizeUrl("").ok, false);
});

test("isTrackingParam matches utm_* family", () => {
  assert.equal(isTrackingParam("utm_campaign"), true);
  assert.equal(isTrackingParam("fbclid"), true);
  assert.equal(isTrackingParam("page"), false);
});

test("normalizePublisherGroup applies NFKC, lowercase, hyphen collapse", () => {
  assert.equal(normalizePublisherGroup("  Example  News --- Group "), "example-news-group");
  assert.equal(normalizePublisherGroup("Ｅｘａｍｐｌｅ"), "example");
  assert.equal(normalizePublisherGroup("   "), null);
});

test("independenceKey priority: origin > publisher > host", () => {
  const origin = independenceKey({
    originUrl: "https://www.origin.example.com/press",
    publisherGroup: "Group",
    canonicalHostname: "host.example.com",
  });
  assert.equal(origin.key, "origin:https://origin.example.com/press");
  assert.equal(origin.confidence, "established");

  const publisher = independenceKey({
    originUrl: null,
    publisherGroup: "Example Group",
    canonicalHostname: "host.example.com",
  });
  assert.equal(publisher.key, "publisher:example-group");
  assert.equal(publisher.confidence, "established");

  const host = independenceKey({
    originUrl: null,
    publisherGroup: null,
    canonicalHostname: "host.example.com",
  });
  assert.equal(host.key, "host:host.example.com");
  assert.equal(host.confidence, "provisional");
});
