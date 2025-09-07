
"use client";
import { useState, useEffect } from "react";
import { Table, Button, Form, Modal, Alert, Spinner } from "react-bootstrap";
import { format, parse, isValid, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";

export default function Reservas() {
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [form, setForm] = useState({
    cliente_id: "",
    mascota_id: "",
    servicio_id: "",
    fecha: "",
    hora: "",
    estado: "pendiente",
  });
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [veterinarioId, setVeterinarioId] = useState("");

  // 🔍 Cargar datos iniciales
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      setError("⚠️ No se encontró el usuario en localStorage.");
      setCargando(false);
      return;
    }
    const user = JSON.parse(storedUser);
    if (!user.id) {
      setError("⚠️ ID de usuario no válido en localStorage.");
      setCargando(false);
      return;
    }
    setVeterinarioId(user.id);

    const cargarReservas = async () => {
      try {
        const res = await fetch(
          `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          const text = await res.text();
          console.error(`Error en reservas: ${res.status} ${res.statusText}`, text);
          throw new Error("Error al obtener reservas");
        }
        const data = await res.json();
        console.log("Reservas recibidas:", data);
        const ids = data.map((r) => r.id);
        if (new Set(ids).size !== ids.length) {
          console.warn("⚠️ IDs duplicados detectados en las reservas:", ids);
        }
        const transformadas = data.map((r) => ({
          id: r.id,
          cliente: r.cliente?.nombre || "Sin nombre",
          cliente_id: r.cliente?.id || "",
          mascota: r.mascota?.nombre || "Sin nombre",
          mascota_id: r.mascota?.id || "",
          servicio: r.servicio?.nombre || "Sin servicio",
          servicio_id: r.servicio?.id || "",
          fecha: new Date(r.fecha),
          estado: r.estado || "pendiente",
        }));
        setReservas(transformadas);
      } catch (err) {
        console.error("❌ Error al cargar reservas:", err);
        setError("❌ Error al cargar reservas: " + err.message);
      }
    };

    const cargarDatos = async () => {
      try {
        const [cli, serv] = await Promise.all([
          fetch("https://usuarios-service-emf5.onrender.com/api/usuarios/obtenerusuarios", {
            headers: { Accept: "application/json" },
          }).then(async (r) => {
            if (!r.ok) {
              const text = await r.text();
              console.error(`Error en clientes: ${r.status} ${r.statusText}`, text);
              throw new Error("Error al obtener clientes");
            }
            return r.json();
          }),
          fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios", {
            headers: { Accept: "application/json" },
          }).then(async (r) => {
            if (!r.ok) {
              const text = await r.text();
              console.error(`Error en servicios: ${r.status} ${r.statusText}`, text);
              throw new Error("Error al obtener servicios");
            }
            return r.json();
          }),
        ]);
        console.log("Clientes recibidos:", cli);
        console.log("Servicios recibidos:", serv);
        setClientes(cli.filter((c) => c.rol === "usuario"));
        setServicios(serv);
      } catch (err) {
        console.error("❌ Error al cargar clientes o servicios:", err);
        setError("❌ Error al cargar clientes o servicios: " + err.message);
      }
    };

    const cargarTodo = async () => {
      await Promise.all([cargarReservas(), cargarDatos()]);
      setCargando(false);
    };

    cargarTodo();
  }, []);

  // 🔍 Cargar mascotas según cliente seleccionado
  useEffect(() => {
    const cargarMascotas = async () => {
      if (!form.cliente_id) {
        setMascotas([]);
        setForm((prev) => ({ ...prev, mascota_id: "" }));
        return;
      }
      try {
        const res = await fetch(
          `https://mascota-service.onrender.com/api/mascotas/mascotascliente/${form.cliente_id}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          const text = await res.text();
          console.error(`Error en mascotas: ${res.status} ${res.statusText}`, text);
          throw new Error("Error al obtener mascotas");
        }
        const data = await res.json();
        console.log("Mascotas recibidas:", data);
        setMascotas(data);
      } catch (err) {
        console.error("❌ Error al cargar mascotas:", err);
        setError("❌ Error al cargar mascotas: " + err.message);
      }
    };
    cargarMascotas();
  }, [form.cliente_id]);

  // ✏️ Abrir modal para editar
  const abrirModalEdicion = (reserva) => {
    setReservaSeleccionada(reserva);
    setForm({
      cliente_id: reserva.cliente_id || "",
      mascota_id: reserva.mascota_id || "",
      servicio_id: reserva.servicio_id || "",
      fecha: reserva.fecha ? format(reserva.fecha, "yyyy-MM-dd", { locale: es }) : "",
      hora: reserva.fecha ? format(reserva.fecha, "HH:mm", { locale: es }) : "",
      estado: reserva.estado || "pendiente",
    });
    setIsEditing(true);
    setShowModal(true);
    setError("");
    setConfirmacion("");
  };

  // ➕ Abrir modal para crear
  const abrirModalCrear = () => {
    setForm({
      cliente_id: "",
      mascota_id: "",
      servicio_id: "",
      fecha: "",
      hora: "",
      estado: "pendiente",
    });
    setIsEditing(false);
    setShowModal(true);
    setError("");
    setConfirmacion("");
  };

  // 🧹 Cerrar modal
  const cerrarModal = () => {
    setShowModal(false);
    setReservaSeleccionada(null);
    setError("");
    setConfirmacion("");
    setForm({
      cliente_id: "",
      mascota_id: "",
      servicio_id: "",
      fecha: "",
      hora: "",
      estado: "pendiente",
    });
  };

  // 💾 Manejar creación o edición
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setConfirmacion("");

    // Validar campos
    if (!form.cliente_id || !form.mascota_id || !form.servicio_id || !form.fecha || !form.hora) {
      setError("⚠️ Todos los campos son obligatorios.");
      return;
    }

    // Validar formato de hora
    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(form.hora)) {
      setError("⚠️ La hora ingresada no es válida (formato HH:mm).");
      return;
    }

    // Validar fecha futura
    let fechaHora;
    try {
      fechaHora = parse(`${form.fecha} ${form.hora}`, "yyyy-MM-dd HH:mm", new Date());
      if (!isValid(fechaHora)) {
        setError("⚠️ La fecha u hora ingresada no es válida.");
        return;
      }
      if (fechaHora < new Date()) {
        setError("⚠️ La fecha debe ser futura.");
        return;
      }
    } catch (err) {
      setError("⚠️ Error al procesar la fecha y hora.");
      return;
    }

    // Validar conflictos de reservas (±1 hora)
    const conflicto = reservas.some((reserva) => {
      if (isEditing && reservaSeleccionada && reserva.id === reservaSeleccionada.id) return false;
      const diff = Math.abs(differenceInMinutes(fechaHora, reserva.fecha));
      return diff < 60;
    });

    if (conflicto) {
      setError("⚠️ Ya existe una reserva dentro del rango de 1 hora.");
      return;
    }

    // Convertir a formato ISO 8601
    const fechaHoraISO = format(fechaHora, "yyyy-MM-dd'T'HH:mm:ss'Z'", { locale: es });

    try {
      const url = isEditing
        ? `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/${reservaSeleccionada.id}`
        : `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          cliente_id: form.cliente_id,
          mascota_id: form.mascota_id,
          servicio_id: form.servicio_id,
          veterinario_id: veterinarioId,
          fecha: fechaHoraISO,
          estado: form.estado,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Error en ${method} reservas: ${res.status} ${res.statusText}`, text);
        throw new Error(`Error al ${isEditing ? "actualizar" : "crear"} la reserva.`);
      }

      // Recargar reservas para reflejar cambios
      const resReservas = await fetch(
        `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/veterinario/${veterinarioId}`,
        { headers: { Accept: "application/json" } }
      );
      if (!resReservas.ok) {
        const text = await resReservas.text();
        console.error(`Error al recargar reservas: ${resReservas.status} ${resReservas.statusText}`, text);
        throw new Error("Error al recargar reservas");
      }
      const data = await resReservas.json();
      const transformadas = data.map((r) => ({
        id: r.id,
        cliente: r.cliente?.nombre || "Sin nombre",
        cliente_id: r.cliente?.id || "",
        mascota: r.mascota?.nombre || "Sin nombre",
        mascota_id: r.mascota?.id || "",
        servicio: r.servicio?.nombre || "Sin servicio",
        servicio_id: r.servicio?.id || "",
        fecha: new Date(r.fecha),
        estado: r.estado || "pendiente",
      }));
      setReservas(transformadas);

      setConfirmacion(`✅ Reserva ${isEditing ? "actualizada" : "creada"} correctamente.`);
      cerrarModal();
    } catch (err) {
      setError("❌ " + err.message);
    }
  };

  // ❌ Eliminar reserva
  const eliminarReserva = async (id) => {
    if (!window.confirm("¿Eliminar esta reserva?")) return;
    try {
      const res = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Error en DELETE reservas: ${res.status} ${res.statusText}`, text);
        throw new Error("Error al eliminar la reserva.");
      }
      setReservas((prev) => prev.filter((r) => r.id !== id));
      setConfirmacion("✅ Reserva eliminada correctamente.");
    } catch (err) {
      setError("❌ Error al eliminar la reserva: " + err.message);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: 600,
            color: "#ffffff",
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          }}
        >
          <i className="bi bi-calendar3 me-2"></i>Reservas Veterinarias
        </h2>
        <Button
          variant="success"
          onClick={abrirModalCrear}
          style={{
            borderRadius: "8px",
            padding: "0.6rem 1.2rem",
            fontWeight: 500,
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
        >
          <i className="bi bi-plus-circle me-2"></i>Crear Reserva
        </Button>
      </div>

      {error && (
        <Alert
          variant="danger"
          onClose={() => setError("")}
          dismissible
          style={{ borderRadius: "6px", fontSize: "0.9rem" }}
        >
          {error}
        </Alert>
      )}
      {confirmacion && (
        <Alert
          variant="success"
          onClose={() => setConfirmacion("")}
          dismissible
          style={{ borderRadius: "6px", fontSize: "0.9rem" }}
        >
          {confirmacion}
        </Alert>
      )}

      {cargando ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <Spinner animation="border" variant="light" />
          <p style={{ marginTop: "0.5rem", color: "#e0e0e0" }}>
            Cargando reservas...
          </p>
        </div>
      ) : reservas.length === 0 ? (
        <p style={{ color: "#e0e0e0" }}>No hay reservas disponibles.</p>
      ) : (
        <Table
          striped
          bordered
          hover
          variant="dark"
          responsive
          style={{ borderRadius: "8px", overflow: "hidden" }}
        >
          <thead>
            <tr>
              <th style={{ padding: "1rem" }}><i className="bi bi-paw me-2"></i>Mascota</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-person me-2"></i>Cliente</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-clipboard-check me-2"></i>Servicio</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-calendar-event me-2"></i>Fecha</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-check-circle me-2"></i>Estado</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-gear me-2"></i>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr
                key={r.id}
                style={{
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3a3a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{r.mascota}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{r.cliente}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{r.servicio}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                  {format(r.fecha, "dd/MM/yyyy HH:mm", { locale: es })}
                </td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{r.estado}</td>
                <td style={{ padding: "0.8rem" }}>
                  <Button
                    variant="warning"
                    size="sm"
                    className="me-2"
                    onClick={() => abrirModalEdicion(r)}
                    style={{
                      borderRadius: "6px",
                      padding: "0.4rem 0.8rem",
                      fontWeight: 500,
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                  >
                    <i className="bi bi-pencil me-2"></i>Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => eliminarReserva(r.id)}
                    style={{
                      borderRadius: "6px",
                      padding: "0.4rem 0.8rem",
                      fontWeight: 500,
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                  >
                    <i className="bi bi-trash me-2"></i>Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal Crear/Editar Reserva */}
      <Modal
        show={showModal}
        onHide={cerrarModal}
        dialogClassName="modal-dark"
        centered
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            {isEditing ? "Editar Reserva" : "Crear Reserva"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#2c2c2c", padding: "1.5rem" }}>
          {error && (
            <Alert
              variant="danger"
              onClose={() => setError("")}
              dismissible
              style={{ borderRadius: "6px", fontSize: "0.9rem" }}
            >
              {error}
            </Alert>
          )}
          {confirmacion && (
            <Alert
              variant="success"
              onClose={() => setConfirmacion("")}
              dismissible
              style={{ borderRadius: "6px", fontSize: "0.9rem" }}
            >
              {confirmacion}
            </Alert>
          )}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Cliente</Form.Label>
              <Form.Select
                value={form.cliente_id}
                onChange={(e) =>
                  setForm({ ...form, cliente_id: e.target.value, mascota_id: "" })
                }
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              >
                <option value="">Selecciona un cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Mascota</Form.Label>
              <Form.Select
                value={form.mascota_id}
                onChange={(e) => setForm({ ...form, mascota_id: e.target.value })}
                required
                disabled={!form.cliente_id}
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              >
                <option value="">Selecciona una mascota</option>
                {mascotas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m.especie})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Servicio</Form.Label>
              <Form.Select
                value={form.servicio_id}
                onChange={(e) => setForm({ ...form, servicio_id: e.target.value })}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              >
                <option value="">Selecciona un servicio</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Fecha</Form.Label>
              <Form.Control
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Hora</Form.Label>
              <Form.Control
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Estado</Form.Label>
              <Form.Select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              >
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="cancelada">Cancelada</option>
                <option value="atendido">Atendido</option>
              </Form.Select>
            </Form.Group>

            <Button
              variant="success"
              type="submit"
              className="w-100"
              style={{
                borderRadius: "8px",
                padding: "0.6rem",
                fontWeight: 500,
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              <i className="bi bi-save me-2"></i>
              {isEditing ? "Actualizar Reserva" : "Crear Reserva"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
