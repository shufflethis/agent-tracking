import assert from "node:assert/strict";
import { test } from "node:test";
import { BodyLimitError, readLimitedBody } from "./request-body";

test("bounded reader rejects chunked input before consuming the whole stream", async () => {
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls++;
      controller.enqueue(new Uint8Array(10));
      if (pulls > 10) controller.close();
    },
  });
  const request = new Request("https://example.test", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  await assert.rejects(readLimitedBody(request, 15), BodyLimitError);
  assert.ok(pulls < 10);
});

test("bounded reader accepts exact byte limit", async () => {
  const request = new Request("https://example.test", { method: "POST", body: "é" });
  assert.equal((await readLimitedBody(request, 2)).byteLength, 2);
});
