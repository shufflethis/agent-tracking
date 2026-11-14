import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPrivateAddress } from "./public-host";

describe("isPrivateAddress", () => {
  it("rejects loopback, RFC 1918, link-local, NAT64, 6to4 and CGNAT", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "::ffff:7f00:1", "64:ff9b::7f00:1", "2002:7f00:1::1", "ff02::1"]) {
      assert.equal(isPrivateAddress(ip), true, ip);
    }
  });
  it("accepts public addresses", () => {
    for (const ip of ["5.175.245.50", "172.32.0.1", "8.8.8.8", "2a14:7c0:1300:10b::1", "::ffff:8.8.8.8"]) {
      assert.equal(isPrivateAddress(ip), false, ip);
    }
  });
});
