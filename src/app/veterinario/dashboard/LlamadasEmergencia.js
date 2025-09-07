
"use client";
import { useState, useEffect } from "react";
import { Container, Table, Spinner, Alert } from "react-bootstrap";

export default function LlamadasEmergencia({ veterinarioId }) {
  const [llamadas, setLlamadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLlamadas = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/llamadas/emergencias/veterinario/${veterinarioId}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error("Error al obtener las llamadas de emergencia");
        }
        const data = await response.json();
        setLlamadas(data);
      } catch (err) {
        console.error("Error fetching llamadas:", err);
        setError("❌ Error al cargar las llamadas de emergencia");
      } finally {
        setLoading(false);
      }
    };

    if (veterinarioId) {
      fetchLlamadas();
    }
  }, [veterinarioId]);

  return (
    <Container
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
      }}
    >
      <h2
        style={{
          fontSize: "1.8rem",
          fontWeight: 600,
          color: "#ffffff",
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <i className="bi bi-telephone me-2"></i>Llamadas de Emergencia
      </h2>

      {error && (
        <Alert
          variant="danger"
          onClose={() => setError("")}
          dismissible
          style={{ borderRadius: "6px", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif" }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <Spinner animation="border" variant="light" />
          <p style={{ marginTop: "0.5rem", color: "#e0e0e0", fontFamily: "'Inter', sans-serif" }}>
            Cargando datos...
          </p>
        </div>
      ) : (
        <Table
          striped
          bordered
          hover
          variant="dark"
          responsive
          style={{ borderRadius: "8px", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}
        >
          <thead>
            <tr>
              <th style={{ padding: "1rem" }}><i className="bi bi-person me-2"></i>Cliente</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-person me-2"></i>Veterinario</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-clock me-2"></i>Duración</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-calendar me-2"></i>Fecha</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-check-circle me-2"></i>Aceptada</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-x-circle me-2"></i>Finalizada</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-telephone me-2"></i>Teléfono</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-info-circle me-2"></i>Motivo</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-currency-dollar me-2"></i>Precio</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-geo-alt me-2"></i>Localización</th>
            </tr>
          </thead>
          <tbody>
            {llamadas.map((llamada) => (
              <tr key={llamada.id}>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{llamada.cliente_nombre || "N/D"}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{llamada.veterinario_nombre || "N/D"}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{llamada.duracion_formato || "N/D"}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                  {new Date(llamada.created_at).toLocaleString() || "N/D"}
                </td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                  {llamada.accepted_at ? new Date(llamada.accepted_at).toLocaleString() : "N/D"}
                </td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                  {llamada.ended_at ? new Date(llamada.ended_at).toLocaleString() : "N/D"}
                </td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{llamada.cliente_telefono || "N/D"}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{llamada.motivo || "N/D"}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                  {llamada.precio ? `$${llamada.precio.toFixed(2)}` : "N/D"}
                </td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{llamada.cliente_localizacion || "N/D"}</td>
              </tr>
            ))}
            {llamadas.length === 0 && (
              <tr>
                <td colSpan="10" className="text-center text-muted">
                  No se encontraron llamadas de emergencia
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
