/* eslint-disable @typescript-eslint/unbound-method --
 * Detaching these methods is the entire point of this file: it reproduces what
 * the IPC adapters used to do, so the rule's warning is the behaviour under test.
 */
import { describe, it, expect } from "vitest";
import { GenKeyCommand } from "./commands/GenKeyCommand";
import { ReqCommand } from "./commands/ReqCommand";
import { X509Command } from "./commands/X509Command";
import { AES256Service } from "../encryption/AES256Service";

/**
 * The IPC layer builds its infrastructure adapters from bare method references
 * (`parseMetadata: X509Command.parseMetadata`), which detaches them from the
 * class. Any static method that reaches for `this` then blows up at runtime
 * with "this.<helper> is not a function" — and only on the code path that calls
 * it, so it survives typechecking, linting and every mocked unit test.
 *
 * These tests call the methods exactly the way the adapters do.
 */
describe("static methods survive being passed as bare references", () => {
  it("X509Command.parseMetadata", async () => {
    const key = await GenKeyCommand.generatePrivateKey({ algorithm: "RSA_2048" });
    const cert = await ReqCommand.createSelfSignedCA({
      privateKeyPem: key,
      dn: { commonName: "detached-check" },
      validityDays: 1,
    });

    const parseMetadata = X509Command.parseMetadata;
    const meta = await parseMetadata(cert);

    expect(meta.subject).toContain("detached-check");
  }, 60_000);

  it("X509Command.pemToDer", async () => {
    const key = await GenKeyCommand.generatePrivateKey({ algorithm: "RSA_2048" });
    const cert = await ReqCommand.createSelfSignedCA({
      privateKeyPem: key,
      dn: { commonName: "detached-der" },
      validityDays: 1,
    });

    const pemToDer = X509Command.pemToDer;
    const der = await pemToDer(cert);

    expect(der[0]).toBe(0x30);
  }, 60_000);

  it("AES256Service.encrypt / decrypt", () => {
    const encrypt = AES256Service.encrypt;
    const decrypt = AES256Service.decrypt;

    const blob = encrypt("secret material", "pw");
    expect(decrypt(blob, "pw")).toBe("secret material");
  });
});
