import { describe, expect, it } from "vitest";
import defaultForm from "@/lib/cash/default-form.json";
import {
  evaluateDefinition,
  validateDefinition,
  type FormDefinition,
} from "@/lib/cash/form-definition";
import { effectiveRole, type AccessRole } from "@/lib/auth/permissions";
const definition = defaultForm as FormDefinition;
describe("configurable form engine", () => {
  it("matches the original OS formula in integer cents", () => {
    expect(validateDefinition(definition)).toBeNull();
    const inputs = {
      turnover_cents: 10000,
      sold_vouchers_cents: 0,
      ideal_cents: 1000,
      pax_cents: 2500,
      paynl_cents: 1000,
      shop_vouchers_cents: 500,
      redeemed_vouchers_cents: 500,
    };
    const actual = evaluateDefinition(definition, inputs, 20000, 15000, true);
    expect(actual.values).toMatchObject({
      cash: 5000,
      required: 10000,
      result: -500,
      register: 23500,
    });
    expect(actual.errors).toEqual({});
  });
  it("rejects invalid references and negative defaults", () => {
    const broken = structuredClone(definition);
    broken.fields[0].default = -1;
    expect(validateDefinition(broken)).not.toBeNull();
    broken.fields[0].default = 0;
    broken.fields[7].terms = [{ key: "result", sign: 1 }];
    expect(validateDefinition(broken)).not.toBeNull();
  });
  it("does not treat missing required input as zero", () => {
    expect(
      evaluateDefinition(definition, {}, 20000, 15000, true).errors
        .turnover_cents,
    ).toBeTruthy();
  });
});
describe("effective personal permissions", () => {
  const role: AccessRole = {
    id: "test",
    name: "Test",
    description: "",
    permissions: ["cash.submit"],
    is_admin: false,
    all_locations: false,
    version: 1,
  };
  it("adds active rights and the module dependency while retaining role rights", () => {
    const effective = effectiveRole(
      role,
      [
        { permission: "cash.review", expires_at: null },
        { permission: "cash.reports", expires_at: "2000-01-01" },
      ],
      Date.parse("2026-11-02"),
    );
    expect(effective.permissions).toEqual([
      "cash.submit",
      "cash.review",
      "cash.open",
    ]);
    expect(effective.is_admin).toBe(false);
    expect(role.permissions).toEqual(["cash.submit"]);
  });
  it("does not enable shared identity mode or unknown privileges through an exception", () => {
    expect(
      effectiveRole(role, [
        { permission: "cash.shared_account", expires_at: null },
        { permission: "users.manage", expires_at: null },
      ]).permissions,
    ).toEqual(role.permissions);
  });
});
