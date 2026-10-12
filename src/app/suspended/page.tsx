import type { CSSProperties } from "react";

export const metadata = { title: "Service Temporarily Unavailable", robots: "noindex" };

const defaultMessage =
  "This website has been temporarily suspended due to a pending account matter. Please contact the site administrator for assistance.";

export default async function Suspended() {
  let reason = defaultMessage;
  let message = "";
  let email = "";
  let phone = "";
  const url = process.env.CONTROL_URL;
  const key = process.env.SITE_KEY;
  if (url && key) {
    try {
      const res = await fetch(`${url}/api/status`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.suspendReason === "string" && data.suspendReason.trim()) reason = data.suspendReason.trim();
        else if (typeof data.message === "string" && data.message.trim()) reason = data.message.trim();
        if (typeof data.message === "string") message = data.message.trim();
        email = typeof data.email === "string" ? data.email.trim() : "";
        phone = typeof data.phone === "string" ? data.phone.trim() : "";
      }
    } catch {
      // Use defaults if the control panel cannot be reached.
    }
  }

  const card: CSSProperties = {
    maxWidth: 520,
    width: "100%",
    padding: "40px 36px",
    background: "#ffffff",
    borderRadius: 16,
    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
    border: "1px solid #e2e8f0",
    textAlign: "center",
    color: "#0f172a",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        background: "linear-gradient(160deg, #f0f4f8 0%, #e8eef5 100%)",
        padding: 24,
        margin: 0,
        color: "#0f172a",
      }}
    >
      <div style={card}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 20px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0787f8, #0565d8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            color: "#ffffff",
            fontWeight: 700,
          }}
          aria-hidden
        >
          !
        </div>
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.25,
            color: "#0f172a",
          }}
        >
          Service Temporarily Unavailable
        </h1>
        <div
          style={{
            margin: "0 0 24px",
            padding: "18px 16px",
            borderRadius: 12,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            textAlign: "left",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a3412" }}>
            Reason
          </p>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "#1e293b", fontWeight: 600 }}>
            {reason}
          </p>
        </div>
        {message && message !== reason ? (
          <p style={{ margin: "0 0 24px", fontSize: 15, lineHeight: 1.65, color: "#475569" }}>{message}</p>
        ) : null}
        <div
          style={{
            padding: "20px 18px",
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            textAlign: "left",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Contact administrator
          </p>
          {email ? (
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "#0f172a" }}>
              <strong style={{ color: "#475569", fontWeight: 600 }}>Email: </strong>
              <a href={`mailto:${email}`} style={{ color: "#0565d8", textDecoration: "none", fontWeight: 600 }}>
                {email}
              </a>
            </p>
          ) : null}
          {phone ? (
            <p style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>
              <strong style={{ color: "#475569", fontWeight: 600 }}>Phone: </strong>
              <a href={`tel:${phone.replace(/\s/g, "")}`} style={{ color: "#0565d8", textDecoration: "none", fontWeight: 600 }}>
                {phone}
              </a>
            </p>
          ) : null}
          {!email && !phone ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "#475569" }}>
              Please reach out to your hosting provider or the team that manages this website.
            </p>
          ) : null}
        </div>
        <p style={{ margin: "20px 0 0", fontSize: 13, color: "#94a3b8" }}>
          We apologize for the inconvenience. Access will be restored once your account is in good standing.
        </p>
      </div>
    </main>
  );
}
