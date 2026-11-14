import assert from "node:assert/strict";
import { test } from "node:test";
import { buildQueryString } from "./listTasks";

test("q di-trim dan kosong dibuang", () => {
  assert.equal(buildQueryString({ q: "  belanja  " }), "q=belanja");
  assert.equal(buildQueryString({ q: "   " }), "");
  assert.equal(buildQueryString({ q: null }), "");
  assert.equal(buildQueryString({}), "");
});

test("karakter khusus di-encode tepat sekali", () => {
  assert.equal(buildQueryString({ q: "100%" }), "q=100%25");
  assert.equal(buildQueryString({ q: "belanja mingguan" }), "q=belanja+mingguan");
  assert.equal(buildQueryString({ q: "a&b=c" }), "q=a%26b%3Dc");
});

test("status all terserialisasi sesuai kontrak", () => {
  const qs = buildQueryString({
    status: "all",
    sort: "created",
    order: "desc",
    limit: 50,
  });
  assert.equal(qs, "limit=50&order=desc&sort=created&status=all");
});

test("tidak ada parameter kosong atau null yang terkirim", () => {
  const qs = buildQueryString({
    q: "",
    status: null,
    sort: undefined,
    order: null,
    limit: null,
    cursor: null,
  });
  assert.equal(qs, "");
});

test("limit di-clamp 1..100 dan cursor kosong dibuang", () => {
  assert.equal(buildQueryString({ limit: 500 }), "limit=100");
  assert.equal(buildQueryString({ limit: 0 }), "limit=1");
  assert.equal(buildQueryString({ limit: 42.7 }), "limit=42");
  assert.equal(buildQueryString({ cursor: "" }), "");
  assert.equal(buildQueryString({ cursor: "abc" }), "cursor=abc");
});
