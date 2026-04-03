"use client";

import { useEffect, useMemo, useState } from "react";

type TemplateType = "ORDER_PLACED" | "ORDER_SHIPPED";

type EmailTemplateDto = {
  type: TemplateType;
  label: string;
  subject: string;
  body: string;
  allowedPlaceholders: string[];
  requiredPlaceholders: string[];
};

type ApiResult = {
  message?: string;
  templates?: EmailTemplateDto[];
};

type Flash = {
  kind: "success" | "error";
  message: string;
};

const SAMPLE_VALUES: Record<string, string> = {
  "[order-link]": "https://your-shop.com/order/demo-order-123",
  "[tracking-code]": "3SABC123456789",
};

function renderPreview(body: string, placeholders: string[]) {
  let text = body;
  for (const placeholder of placeholders) {
    text = text.replaceAll(placeholder, SAMPLE_VALUES[placeholder] ?? "");
  }
  return text;
}

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplateDto[]>([]);
  const [activeType, setActiveType] = useState<TemplateType>("ORDER_PLACED");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      setLoading(true);
      const response = await fetch("/api/emails/templates", {
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as ApiResult;

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setFlash({ kind: "error", message: data.message ?? "Unable to load templates" });
        setLoading(false);
        return;
      }

      setTemplates(data.templates ?? []);
      if (data.templates && data.templates.length > 0) {
        setActiveType(data.templates[0].type);
      }
      setLoading(false);
    }

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTemplate = useMemo(
    () => templates.find((template) => template.type === activeType) ?? null,
    [activeType, templates],
  );

  function updateActiveTemplate(patch: Partial<EmailTemplateDto>) {
    setTemplates((prev) =>
      prev.map((template) =>
        template.type === activeType
          ? {
              ...template,
              ...patch,
            }
          : template,
      ),
    );
  }

  async function saveActiveTemplate() {
    if (!activeTemplate) {
      return;
    }

    setSaving(true);
    setFlash(null);

    const response = await fetch("/api/emails/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: activeTemplate.type,
        subject: activeTemplate.subject,
        body: activeTemplate.body,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as ApiResult;

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Unable to save template" });
      setSaving(false);
      return;
    }

    setFlash({ kind: "success", message: data.message ?? "Template saved" });
    setSaving(false);
  }

  async function sendTestEmail() {
    if (!activeTemplate) {
      return;
    }

    setSendingTest(true);
    setFlash(null);

    const response = await fetch("/api/emails/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: activeTemplate.type,
        subject: activeTemplate.subject,
        body: activeTemplate.body,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as ApiResult;

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Unable to send test email" });
      setSendingTest(false);
      return;
    }

    setFlash({ kind: "success", message: data.message ?? "Test email sent" });
    setSendingTest(false);
  }

  if (loading) {
    return <p className="text-secondary mb-0">Loading templates…</p>;
  }

  if (!activeTemplate) {
    return <p className="text-secondary mb-0">No templates found.</p>;
  }

  const missingRequiredPlaceholders = activeTemplate.requiredPlaceholders.filter(
    (placeholder) => !activeTemplate.body.includes(placeholder),
  );

  return (
    <div className="row g-4 mt-1">
      <div className="col-lg-4">
        <div className="list-group">
          {templates.map((template) => (
            <button
              key={template.type}
              type="button"
              className={`list-group-item list-group-item-action ${template.type === activeType ? "active" : ""}`}
              onClick={() => setActiveType(template.type)}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      <div className="col-lg-8">
        {flash?.kind === "success" ? <div className="alert alert-success">{flash.message}</div> : null}
        {flash?.kind === "error" ? <div className="alert alert-danger">{flash.message}</div> : null}

        <div className="settings-section">
          <h2 className="h5 mb-3">{activeTemplate.label}</h2>

          <div className="mb-3">
            <label className="form-label">Subject</label>
            <input
              className="form-control"
              value={activeTemplate.subject}
              onChange={(event) => updateActiveTemplate({ subject: event.target.value })}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Body</label>
            <textarea
              className="form-control"
              rows={7}
              value={activeTemplate.body}
              onChange={(event) => updateActiveTemplate({ body: event.target.value })}
            />
          </div>

          <div className="mb-3">
            <p className="small text-secondary mb-2">Available placeholders</p>
            <div className="d-flex flex-wrap gap-2">
              {activeTemplate.allowedPlaceholders.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    updateActiveTemplate({
                      body: `${activeTemplate.body} ${placeholder}`.trim(),
                    });
                  }}
                >
                  {placeholder}
                </button>
              ))}
            </div>
          </div>

          {missingRequiredPlaceholders.length > 0 && (
            <div className="alert alert-warning py-2">
              Missing required placeholders: {missingRequiredPlaceholders.join(", ")}
            </div>
          )}

          <div className="mb-3">
            <p className="small text-secondary mb-1">Preview (sample data)</p>
            <div className="border rounded p-3 bg-light">
              <p className="fw-semibold mb-2">{activeTemplate.subject}</p>
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {renderPreview(activeTemplate.body, activeTemplate.allowedPlaceholders)}
              </p>
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-dark"
              onClick={saveActiveTemplate}
              disabled={saving || missingRequiredPlaceholders.length > 0}
            >
              {saving ? "Saving…" : "Save template"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={sendTestEmail}
              disabled={sendingTest || missingRequiredPlaceholders.length > 0}
            >
              {sendingTest ? "Sending…" : "Send test email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
