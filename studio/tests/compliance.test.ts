import { test } from "node:test";
import assert from "node:assert/strict";
import { auditCreative, gateProduct, verdictFor } from "../lib/compliance.ts";

const CTA = "לפרטים: וואטסאפ בביו";
const rules = (r: ReturnType<typeof auditCreative>) => r.findings.map((f) => f.rule).sort();

test("gate blocks PHOENIX and TRANQUILO even when COMPLETE", () => {
  assert.equal(gateProduct({ slug: "phoenix", name: "PHOENIX", copy_status: "COMPLETE" }).allowed, false);
  assert.equal(gateProduct({ slug: "tranquilo", name: "TRANQUILO", copy_status: "COMPLETE" }).allowed, false);
});

test("gate blocks non-COMPLETE copy and flags SPF products", () => {
  assert.equal(gateProduct({ slug: "pro-bio-lift", name: "PRO BIO LIFT", copy_status: "AWAITING_SHEET" }).allowed, false);
  const one = gateProduct({ slug: "one-tone", name: "ONE TONE", copy_status: "COMPLETE" });
  assert.equal(one.allowed, true);
  assert.equal(one.spfRequired, true);
});

test("clean cosmetic copy passes", () => {
  const r = auditCreative({ caption_he: `מרקם משיי שנספג ברכות. רגע של טקס טיפוח בסוף היום. ${CTA}` }, { kind: "caption", productSlug: "pro_bio_lift" });
  assert.equal(r.verdict, "GO", JSON.stringify(r.findings));
});

test("catches the two real violations found in the factory audit", () => {
  const r = auditCreative({ caption_he: `medical-grade formula. 10% הנחה על טיפול פנים החודש. ${CTA}` }, { kind: "caption" });
  assert.deepEqual(rules(r), ["medical_claim", "treatment_price_promo"]);
  assert.equal(r.verdict, "BLOCK");
});

test("blocks Hebrew medical, cure, guarantee and before/after", () => {
  const r = auditCreative(
    { a: "פורמולה רפואית", b: "מעלים קמטים", c: "תוצאות מובטחות", d: "תמונות לפני ואחרי", cta: CTA },
    { kind: "post" },
  );
  assert.deepEqual(rules(r), ["before_after", "cure_claim", "guarantee", "medical_claim"]);
});

test("blocks words put in Dana's mouth", () => {
  const r = auditCreative({ caption_he: `דנה ממליצה למרוח בבוקר. ${CTA}` }, { kind: "caption" });
  assert.ok(rules(r).includes("dana_attributed_speech"));
  assert.equal(r.verdict, "BLOCK");
});

test("requires WhatsApp CTA on public content only", () => {
  assert.ok(rules(auditCreative({ caption_he: "מרקם קטיפתי" }, { kind: "caption" })).includes("missing_cta"));
  assert.equal(auditCreative({ summary: "מרקם קטיפתי" }, { kind: "research" }).verdict, "GO");
});

test("requires SPF note for acid/retinoid products", () => {
  const without = auditCreative({ caption_he: `טקס ערב שקט. ${CTA}` }, { kind: "caption", productSlug: "glyco_10" });
  assert.ok(rules(without).includes("missing_spf_note"));
  const withNote = auditCreative({ caption_he: `טקס שקט. מומלץ לשלב קרם הגנה ביום. ${CTA}` }, { kind: "caption", productSlug: "glyco-10" });
  assert.equal(withNote.verdict, "GO", JSON.stringify(withNote.findings));
});

test("product price is allowed, treatment price is not", () => {
  assert.equal(auditCreative({ c: `ONE TONE ב-189 ₪. ${CTA}` }, { kind: "caption" }).verdict, "GO");
  assert.equal(auditCreative({ c: `טיפול פנים ב-250 ₪. ${CTA}` }, { kind: "caption" }).verdict, "BLOCK");
});

test("does not flag 'אירופאי' as medical framing, flags 'מטופלים'", () => {
  assert.equal(auditCreative({ c: `ניחוח אירופאי עדין. ${CTA}` }, { kind: "caption" }).verdict, "GO");
  assert.equal(auditCreative({ c: `המטופלים שלנו אוהבים. ${CTA}` }, { kind: "caption" }).verdict, "REVIEW");
});

test("ignores internal note fields and do_not lists", () => {
  const r = auditCreative({ caption_he: `מרקם עשיר. ${CTA}`, do_not: ["לפני ואחרי"], rationale: "לא רפואי" }, { kind: "caption" });
  assert.equal(r.verdict, "GO", JSON.stringify(r.findings));
});

test("low confidence downgrades to REVIEW", () => {
  assert.equal(verdictFor([], 0.79), "REVIEW");
  assert.equal(verdictFor([], 0.8), "GO");
});
