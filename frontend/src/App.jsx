import { useState, useMemo } from "react";
import axios from "axios";
import { faker } from '@faker-js/faker';

function mapTypeToInputType(t) {
  if (!t || typeof t !== 'string') return "text";
  switch (t.toLowerCase()) {
    case "text":
      return "textarea";
    case "id":
    case "number":
      return "number";
    case "date":
      return "date";
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}

function snakeToTitleCase(str) {
  return str
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function generateRandomData(type) {
  switch (type) {
    case "id":
      return Math.floor(Math.random() * 1000);
    case "string":
      return faker.lorem.words();
    case "first_name":
      return faker.person.firstName();
    case "last_name":
      return faker.person.lastName();
    case "name":
      return faker.person.fullName();
    case "email":
      return faker.internet.email();
    case "text":
      return faker.lorem.lines();
    case "number":
      return Math.floor(Math.random() * 100);
    case "date":
      return faker.date.past().toISOString();
    case "boolean":
      return Math.random() < 0.5 ? "0" : "1";
    default:
      return "...";
  }
}

function MockEntityForm({ entity }) {
  return (
    <form style={{ border: "1px solid #e6e6e6", padding: 12, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{entity.name}</h3>
      </div>

      <div style={{ marginTop: 8 }}>
        {entity.fields.map((f, i) => {
          const inputType = mapTypeToInputType(f.type);
          return (
            <div key={i} style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ minWidth: 120 }}>{snakeToTitleCase(f.name)}</label>
              {inputType === "checkbox" ? (
                <input type="checkbox"/>
              ) : (inputType === "textarea" ? (
                <textarea
                  rows={3}
                  style={{ padding: 8, flex: 1, background: "#242424", border: "1px solid #eee", resize: "vertical" }}
                />
              ) : (
                <input
                  type={inputType}
                  style={{ padding: 8, flex: 1, background: "#242424", border: "1px solid #eee" }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </form>
  );
}

function MockEntityTable({ entity }) {
  return (
    <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{entity.name} Table</h3>
      </div>

      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              {entity.fields.map((f, i) => <th key={i} style={{ padding: "8px 6px", minWidth: 120 }}>{f.name}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              {entity.fields.map((f, i) => <td key={i} style={{ padding: "10px 6px", color: "#666" }}>{generateRandomData(f.type)}</td>)}
            </tr>
            <tr>
              {entity.fields.map((f, i) => <td key={i} style={{ padding: "10px 6px", color: "#666" }}>{generateRandomData(f.type)}</td>)}
            </tr>
            <tr>
              {entity.fields.map((f, i) => <td key={i} style={{ padding: "10px 6px", color: "#666" }}>{generateRandomData(f.type)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [desc, setDesc] = useState("");
  const [reqs, setReqs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const [activeActionIndex, setActiveActionIndex] = useState(0);
  const [error, setError] = useState(null);

  const activeRoleObj = reqs?.roles.find(r => r.name === activeRole) ?? null;

  const activeAction = useMemo(() => {
    if (!activeRoleObj) return null;
    return activeRoleObj.actions[activeActionIndex] ?? null;
  }, [activeRoleObj, activeActionIndex]);

  function getEntityByName(name) {
    return reqs.entities.find(e => e.name === name) || null;
  }

  async function submit() {
    if (!desc.trim()) return;
    setLoading(true);
    setReqs(null);
    setError(null);
    setActiveRole(null);
    setActiveActionIndex(0);
    try {
      const res = await axios.post("http://localhost:5050/api/extract", {
        description: desc,
      }, {
        headers: { "Content-Type": "application/json" }
      });
      const data = res.data;
      if (data.app_name === "" || data.entities?.length === 0 || data.roles?.length === 0) {
        throw new Error("App requirements not found in the response. Please try a different description.");
      }
      setReqs(data);
      setActiveRole(data.roles[0].name);
      setActiveActionIndex(0);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: 24, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 980, fontFamily: "Inter, system-ui, sans-serif" }}>
        <h1 style={{ marginBottom: 6 }}>AI App Builder</h1>
        <p style={{ marginTop: 0, color: "#555" }}>Describe the app. After extraction, select a role then pick an action tab to open the mock UI for that action.</p>

        <textarea
          rows={4}
          style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ddd", boxSizing: "border-box" }}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder='e.g. "I want an app to manage student courses and grades. Teachers add courses, students enrol, and admins manage reports."'
        />

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={submit} disabled={loading || !desc.trim()} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#111", color: "#fff" }}>
            {loading ? "Working…" : "Extract Requirements"}
          </button>
        </div>

        {error && <div style={{ marginTop: 12, color: "crimson" }}>Error: {String(error)}</div>}

        {!error && reqs && (
          <div style={{ marginTop: 20 }}>
            <h2 style={{ marginBottom: 6 }}>{reqs.app_name || "Generated App"}</h2>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {reqs.roles.map(role => (
                <button
                  key={role.name}
                  onClick={() => { setActiveRole(role.name); setActiveActionIndex(0); }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: activeRole === role.name ? "#111" : "#eee",
                    color: activeRole === role.name ? "#fff" : "#000",
                    border: "none"
                  }}
                >
                  {role.name}
                </button>
              ))}
            </div>

            {activeRoleObj && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {activeRoleObj.actions.map((act, i) => (
                    <button
                      key={`${act.name}-${i}`}
                      onClick={() => act.type === "none" ? null : setActiveActionIndex(i)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: i === activeActionIndex ? "#111" : "#fff",
                        color: i === activeActionIndex ? "#fff" : "#111",
                        border: i === activeActionIndex ? "none" : "1px solid #eee",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        cursor: "pointer"
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{act.name}</span>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 12 }}>
                  {activeAction && (() => {
                    const entName = activeAction.entity;
                    const entity = getEntityByName(entName, reqs.entities);
                    if (!entity) {
                      return;
                    }

                    if (activeAction.type === "form") {
                      return (
                        <MockEntityForm
                          entity={entity}
                        />
                      );
                    }

                    if (activeAction.type === "table") {
                      return (
                        <MockEntityTable
                          entity={entity}
                        />
                      );
                    }

                    return <div>Unsupported action type: {activeAction.type}</div>;
                  })()}
                </div>
              </div>
            )}

            <div>
              <h3 style={{ marginTop: 8 }}>Entities</h3>
              {reqs.entities.map(e => (
                <div key={e.name} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{e.name}</div>
                  <div style={{ fontSize: 13, color: "#555" }}>{e.fields.map(f => f.name).join(", ")}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}