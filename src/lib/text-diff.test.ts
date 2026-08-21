import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diffText } from "./text-diff.ts";

describe("diffText", () => {
  it("marks everything as same when the texts are identical", () => {
    const { before, after } = diffText("Dear Ivan,", "Dear Ivan,");

    assert.deepEqual(before, [{ value: "Dear Ivan,", status: "same" }]);
    assert.deepEqual(after, [{ value: "Dear Ivan,", status: "same" }]);
  });

  it("marks an appended word as added, not as a full rewrite", () => {
    const { before, after } = diffText("Thank you", "Thank you very much");

    assert.deepEqual(before, [{ value: "Thank you", status: "same" }]);
    assert.deepEqual(after, [
      { value: "Thank you", status: "same" },
      { value: " very much", status: "added" },
    ]);
  });

  it("marks a removed word as removed on the before side only", () => {
    const { before, after } = diffText("Please reply very soon.", "Please reply soon.");

    assert.deepEqual(before, [
      { value: "Please reply", status: "same" },
      { value: " very", status: "removed" },
      { value: " soon.", status: "same" },
    ]);
    assert.deepEqual(after, [{ value: "Please reply soon.", status: "same" }]);
  });

  it("returns empty segments for two empty strings", () => {
    const { before, after } = diffText("", "");

    assert.deepEqual(before, []);
    assert.deepEqual(after, []);
  });

  it("treats a full replacement as removed + added, not a same match", () => {
    const { before, after } = diffText("Regards", "Best regards");

    assert.equal(
      before.every((segment) => segment.status !== "same"),
      true
    );
    assert.equal(after.some((segment) => segment.status === "added"), true);
  });
});
