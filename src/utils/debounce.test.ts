import assert from "node:assert/strict";
import { test } from "node:test";
import { debounce } from "./debounce";

test("debounce: hanya memanggil sekali setelah jeda", async () => {
  let calls = 0;
  const fn = debounce((value: string) => {
    calls += 1;
    assert.equal(value, "abc");
  }, 20);

  fn("a");
  fn("ab");
  fn("abc");

  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(calls, 1);
});

test("debounce: cancel mencegah eksekusi", async () => {
  let calls = 0;
  const fn = debounce(() => {
    calls += 1;
  }, 20);

  fn();
  fn.cancel();

  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(calls, 0);
});

test("debounce: flush mengeksekusi segera", () => {
  let calls = 0;
  const fn = debounce(() => {
    calls += 1;
  }, 1_000);

  fn();
  fn.flush();
  assert.equal(calls, 1);

  fn.cancel();
  assert.equal(calls, 1);
});
