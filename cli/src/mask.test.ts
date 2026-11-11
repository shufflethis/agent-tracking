import assert from "node:assert/strict";
import { test } from "node:test";
import { maskSecrets } from "./mask.js";

const cases: [string, string][] = [
  ["Authorization: Bearer abc.def-ghi", "abc.def-ghi"],
  ["token ghp_1234567890abcdefABCD", "ghp_1234567890abcdefABCD"],
  ["key sk-proj-abcdefgh12345678", "sk-proj-abcdefgh12345678"],
  ["using atk_AAAAAAAAAAAAAAAAAAAAAAAA", "atk_AAAAAAAAAAAAAAAAAAAAAAAA"],
  ["slack xoxb-1234567890-abcdef", "xoxb-1234567890-abcdef"],
  ["password=hunter2 done", "hunter2"],
  ["API_KEY: s3cr3tvalue", "s3cr3tvalue"],
  ["X-Admin-Key: 0123456789abcdef0123456789abcdef", "0123456789abcdef0123456789abcdef"],
  ["blob 0123456789abcdef0123456789abcdef0123", "0123456789abcdef0123456789abcdef0123"],
  ["db postgres://admin:S3cretPass@db.internal:5432/app", "S3cretPass"],
  ['json {"api_key":"abcdef123"}', "abcdef123"],
  ["Authorization: Basic YWRtaW46aHVudGVyMg==", "YWRtaW46aHVudGVyMg=="],
  ["mysql -u root -pHunter2xyz", "Hunter2xyz"],
  ["b64 QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9w", "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9w"],
  ["aws AKIAIOSFODNN7EXAMPLE failed", "AKIAIOSFODNN7EXAMPLE"],
  ["gcp AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe denied", "AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe"],
  ["stripe rk_live_51Nabcdefgh12345678", "rk_live_51Nabcdefgh12345678"],
  ["webhook whsec_abcdefgh1234567890", "whsec_abcdefgh1234567890"],
  ["anthropic sk-ant-api03-abcdefgh12345678", "sk-ant-api03-abcdefgh12345678"],
  ["npm npm_1234567890abcdefABCD", "npm_1234567890abcdefABCD"],
  ["tg 123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw", "AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"],
  ["key -----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjE=\n-----END OPENSSH PRIVATE KEY-----", "b3BlbnNzaC1rZXktdjE="],
];

for (const [input, secret] of cases) {
  test(`masks ${input.slice(0, 24)}`, () => {
    const out = maskSecrets(input);
    assert.equal(out.includes(secret), false, out);
    assert.match(out, /\[masked\]/);
  });
}

test("normal text survives", () => {
  const line = "Error: ENOSPC: no space left on device, write at /var/log/app.log line 42";
  assert.equal(maskSecrets(line), line);
});
