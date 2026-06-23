import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getMyClaim, submitClaim } from "@/lib/winner-claim.functions";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

export const Route = createFileRoute("/_authenticated/claim/$drawDate")({
  head: () => ({
    meta: [{ title: i18n.t("claim.metaTitle") }],
  }),
  component: ClaimPage,
});

const BLUE = "#1e3a5f";
const GOLD = "#c9a35a";
const BEIGE = "#f4f1ea";
const BEIGE_DEEP = "#d9d2c2";

function ClaimPage() {
  const { t } = useTranslation();
  const { drawDate } = useParams({ from: "/_authenticated/claim/$drawDate" });
  const getClaim = useServerFn(getMyClaim);
  const submit = useServerFn(submitClaim);

  const { data: claim, isLoading, refetch } = useQuery({
    queryKey: ["winner-claim", drawDate],
    queryFn: () => getClaim({ data: { drawDate } }),
  });

  const [form, setForm] = useState({
    fullName: "", address1: "", address2: "", city: "", state: "", zip: "",
    dob: "", phone: "", paymentMethod: "paypal" as "paypal" | "zelle" | "check",
    paymentDestination: "",
  });
  const [idPath, setIdPath] = useState<string>("");
  const [w9Path, setW9Path] = useState<string>("");
  const [accept, setAccept] = useState(false);
  const [uploading, setUploading] = useState<"id" | "w9" | null>(null);

  const m = useMutation({
    mutationFn: () => submit({ data: {
      drawDate, ...form, state: form.state.toUpperCase(),
      idDocumentPath: idPath, w9DocumentPath: w9Path, acceptTax: true as const,
    }}),
    onSuccess: (res) => {
      if (res.ok) { toast.success(t("claim.submitted")); refetch(); }
      else toast.error(res.error);
    },
  });

  async function uploadFile(kind: "id" | "w9", file: File) {
    setUploading(kind);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("claim.sessionExpired")); return; }
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${drawDate}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("winner-documents").upload(path, file, { upsert: true });
      if (error) { toast.error(error.message); return; }
      if (kind === "id") setIdPath(path); else setW9Path(path);
      toast.success(kind === "id" ? t("claim.idUploadedToast") : t("claim.w9UploadedToast"));
    } finally { setUploading(null); }
  }

  if (isLoading) return <main style={page}><p>{t("claim.loading")}</p></main>;

  if (!claim) {
    return (
      <main style={page}>
        <Link to="/ruleta" style={link}>{t("claim.back")}</Link>
        <h1 style={h1}>{t("claim.noClaimTitle")}</h1>
        <p>{t("claim.noClaimBody", { date: drawDate })}</p>
      </main>
    );
  }

  const deadline = new Date(claim.claim_deadline as string);
  const expired = deadline.getTime() < Date.now();
  const status = claim.status as string;
  const statusKey = `claim.statusLabels.${status}`;
  const statusLabel = i18n.exists(statusKey) ? t(statusKey) : status;

  return (
    <main style={page}>
      <Link to="/ruleta" style={link}>{t("claim.backToRoulette")}</Link>
      <h1 style={h1}>{t("claim.claimTitleFor", { date: drawDate })}</h1>
      <div style={prizeCard}>
        <div style={{ fontSize: 13, color: BLUE, opacity: 0.7 }}>{t("claim.prize")}</div>
        <div style={{ fontSize: 42, fontWeight: 900, color: GOLD }}>${Number(claim.prize_usd).toFixed(2)}</div>
        <div style={{ fontSize: 13, marginTop: 8 }}>
          {t("claim.status")} <strong>{statusLabel}</strong>
        </div>
        <div style={{ fontSize: 13 }}>
          {t("claim.deadline")} <strong>{deadline.toLocaleDateString()}</strong>
          {expired && <span style={{ color: "#b91c1c" }}>{t("claim.expired")}</span>}
        </div>
      </div>

      {status !== "pending_verification" ? (
        <div style={card}>
          <p>
            {t("claim.thisClaimIsPre")}
            <strong>{statusLabel}</strong>
            {t("claim.thisClaimIsPost")}
          </p>
          {status === "verified" && <p>{t("claim.verifiedMsg")}</p>}
          {status === "paid" && claim.payment_reference && (
            <p>
              {t("claim.paymentRefLabel")}
              <code>{claim.payment_reference as string}</code>
            </p>
          )}
          {status === "rejected" && claim.rejection_reason && (
            <p style={{ color: "#b91c1c" }}>
              {t("claim.rejectedReason", { reason: claim.rejection_reason as string })}
            </p>
          )}
        </div>
      ) : expired ? (
        <div style={card}><p>{t("claim.expiredBody")}</p></div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!accept) return toast.error(t("claim.mustAcceptTax"));
            if (!idPath || !w9Path) return toast.error(t("claim.uploadIdW9"));
            m.mutate();
          }}
          style={{ display: "grid", gap: 12, marginTop: 16 }}
        >
          <p style={{ fontSize: 13, opacity: 0.8 }}>{t("claim.kycIntro")}</p>
          <input required placeholder={t("claim.fullName")} value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={input} />
          <div style={{ display: "grid", gap: 6 }}>
            <label style={lab}>{t("claim.dobLabel")}</label>
            <input required type="date" value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })} style={input} />
          </div>
          <input required type="tel" placeholder={t("claim.phone")} value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} style={input} />
          <input required placeholder={t("claim.address1")} value={form.address1}
            onChange={(e) => setForm({ ...form, address1: e.target.value })} style={input} />
          <input placeholder={t("claim.address2")} value={form.address2}
            onChange={(e) => setForm({ ...form, address2: e.target.value })} style={input} />
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
            <input required placeholder={t("claim.city")} value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })} style={input} />
            <input required placeholder={t("claim.stateField")} maxLength={2} value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} style={input} />
            <input required placeholder={t("claim.zip")} value={form.zip}
              onChange={(e) => setForm({ ...form, zip: e.target.value })} style={input} />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={lab}>{t("claim.paymentMethod")}</label>
            <select value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as "paypal" | "zelle" | "check" })}
              style={input}>
              <option value="paypal">{t("claim.paypal")}</option>
              <option value="zelle">{t("claim.zelle")}</option>
              <option value="check">{t("claim.check")}</option>
            </select>
          </div>
          <input required placeholder={
            form.paymentMethod === "check" ? t("claim.destCheck") :
            form.paymentMethod === "paypal" ? t("claim.destPaypal") : t("claim.destZelle")
          } value={form.paymentDestination}
            onChange={(e) => setForm({ ...form, paymentDestination: e.target.value })} style={input} />

          <div style={{ display: "grid", gap: 6 }}>
            <label style={lab}>{t("claim.idLabel")}</label>
            <input type="file" accept="image/*,application/pdf" disabled={uploading === "id"}
              onChange={(e) => e.target.files?.[0] && uploadFile("id", e.target.files[0])} />
            {idPath && <span style={{ fontSize: 12, color: "#1f7a3a" }}>{t("claim.idUploaded")}</span>}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={lab}>
              {t("claim.w9LabelPre")}
              <a href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noreferrer" style={{ color: BLUE }}>
                {t("claim.w9LabelLink")}
              </a>
              {t("claim.w9LabelPost")}
            </label>
            <input type="file" accept="application/pdf,image/*" disabled={uploading === "w9"}
              onChange={(e) => e.target.files?.[0] && uploadFile("w9", e.target.files[0])} />
            {w9Path && <span style={{ fontSize: 12, color: "#1f7a3a" }}>{t("claim.w9Uploaded")}</span>}
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>
              {t("claim.acceptTaxPre")}
              <strong>{t("claim.acceptTaxBold")}</strong>
              {t("claim.acceptTaxPost")}
            </span>
          </label>

          <button type="submit" disabled={m.isPending} style={btn}>
            {m.isPending ? t("claim.sending") : t("claim.submitClaim")}
          </button>
        </form>
      )}
    </main>
  );
}

const page = { maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif", color: BLUE, lineHeight: 1.6 } as const;
const link = { color: BLUE, textDecoration: "none" } as const;
const h1 = { fontSize: 30, fontWeight: 900, marginTop: 16 } as const;
const prizeCard = { background: BEIGE, border: `1px solid ${BEIGE_DEEP}`, borderRadius: 16, padding: 20, marginTop: 16 } as const;
const card = { background: "white", border: `1px solid ${BEIGE_DEEP}`, borderRadius: 12, padding: 16, marginTop: 16 } as const;
const input = { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${BEIGE_DEEP}`, background: "white", color: BLUE, fontSize: 15 } as const;
const lab = { fontSize: 12, opacity: 0.7 } as const;
const btn = { padding: 14, background: BLUE, color: BEIGE, border: "none", borderRadius: 10, fontWeight: 800, letterSpacing: "0.1em", cursor: "pointer" } as const;
