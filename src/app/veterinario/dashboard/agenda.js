
"use client";
import { useState, useEffect } from "react";
import {
  Row, Col, Button, Modal, Spinner, Table, Form, Alert
} from "react-bootstrap";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, parse, isValid, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";

export default function Agenda() {
  const [vista, setVista] = useState("lista");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [mostrarModal, setMostrarModal] = useState(false);
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [form, setForm] = useState({
    cliente_id: "",
    mascota_id: "",
    servicio_id: "",
    fecha: "",
    hora: "",
  });
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [veterinarioId, setVeterinarioId] = useState("");
  const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [cargandoActualizacion, setCargandoActualizacion] = useState(false);

  const abrirModal = () => setMostrarModal(true);
  const cerrarModal = () => {
    setMostrarModal(false);
    setForm({ cliente_id: "", mascota_id: "", servicio_id: "", fecha: "", hora: "" });
    setError("");
    setConfirmacion("");
  };

  const cambiarVista = (tipo) => setVista(tipo);

  const abrirModalEdicion = (reserva) => {
    setReservaSeleccionada(reserva);
    setModalEdicionVisible(true);
    setError("");
    setConfirmacion("");
  };

  const cerrarModalEdicion = () => {
    setModalEdicionVisible(false);
    setReservaSeleccionada(null);
    setError("");
    setConfirmacion("");
  };

  const cargarReservas = async () => {
    setCargando(true);
    setCargandoActualizacion(true);

      const res = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/veterinario/${veterinarioId}`, {
        headers: { Accept: "application/json" },
      });

      
      const data = await res.json();
      const ids = data.map((r) => r.id);
      if (new Set(ids).size !== ids.length) {
        console.warn("⚠️ IDs duplicados detectados en las reservas:", ids);
      }
      const transformadas = data.map((r) => ({
        id: r.id,
        mascota: r.mascota?.nombre || "Sin nombre",
        cliente: r.cliente?.nombre || "Sin nombre",
        servicio: r.servicio?.nombre || "Sin servicio",
        fecha: new Date(r.fecha),
        estado: r.estado,
      }));
      setReservas(transformadas);
    
      setCargando(false);
      setCargandoActualizacion(false);
    
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    const { id } = JSON.parse(storedUser);
    setVeterinarioId(id);

    const cargarDatos = async () => {
      try {
        const [cli, serv] = await Promise.all([
          fetch("https://usuarios-service-emf5.onrender.com/api/usuarios/obtenerusuarios", {
            headers: { Accept: "application/json" },
          }).then(async (r) => {
            if (!r.ok) throw new Error("Error al obtener usuarios");
            return r.json();
          }),
          fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios", {
            headers: { Accept: "application/json" },
          }).then(async (r) => {
            if (!r.ok) throw new Error("Error al obtener servicios");
            return r.json();
          }),
        ]);
        const usuariosFiltrados = cli.filter((c) => c.rol === "usuario");
        setClientes(usuariosFiltrados);
        setServicios(serv);
      } catch (err) {
        console.error("❌ Error al cargar datos:", err);
        setError("❌ Error al cargar clientes o servicios.");
      }
    };

    cargarReservas();
    cargarDatos();
  }, [veterinarioId]);

  useEffect(() => {
    const cargarMascotas = async () => {
      if (!form.cliente_id) {
        setMascotas([]);
        return;
      }
      try {
        const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${form.cliente_id}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Error al obtener mascotas");
        const data = await res.json();
        setMascotas(data);
      } catch (err) {
        console.error("❌ Error al cargar mascotas:", err);
        setError("❌ Error al cargar mascotas.");
      }
    };
    cargarMascotas();
  }, [form.cliente_id]);

  const reservasFiltradas = () => {
    const fechaBase = new Date(fechaSeleccionada);
    let filtradas;
    switch (vista) {
      case "lista":
        filtradas = [...reservas].sort((a, b) => a.fecha - b.fecha);
        break;
      case "día":
        filtradas = reservas.filter((r) => r.fecha.toDateString() === fechaBase.toDateString());
        break;
      case "semana":
        const inicioSemana = new Date(fechaBase);
        const finSemana = new Date(fechaBase);
        finSemana.setDate(finSemana.getDate() + 6);
        filtradas = reservas.filter((r) => r.fecha >= inicioSemana && r.fecha <= finSemana);
        break;
      case "mes":
        filtradas = reservas.filter(
          (r) =>
            r.fecha.getMonth() === fechaBase.getMonth() &&
            r.fecha.getFullYear() === fechaBase.getFullYear()
        );
        break;
      default:
        filtradas = [];
    }
    return filtradas;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setConfirmacion("");

    if (!form.cliente_id || !form.mascota_id || !form.servicio_id || !form.fecha || !form.hora) {
      setError("⚠️ Todos los campos son obligatorios.");
      return;
    }

    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(form.hora)) {
      setError("⚠️ La hora ingresada no es válida.");
      return;
    }

    let fechaHora;
    try {
      fechaHora = parse(`${form.fecha} ${form.hora}`, "yyyy-MM-dd HH:mm", new Date());
      if (!isValid(fechaHora)) {
        setError("⚠️ La fecha u hora ingresada no es válida.");
        return;
      }
    } catch (err) {
      setError("⚠️ Error al procesar la fecha y hora.");
      return;
    }

    const conflicto = reservas.some((reserva) => {
      const diff = Math.abs(differenceInMinutes(fechaHora, reserva.fecha));
      return diff < 60;
    });

    if (conflicto) {
      setError("⚠️ Ya existe una reserva dentro del rango de 1 hora.");
      return;
    }

    const fechaHoraISO = format(fechaHora, "yyyy-MM-dd'T'HH:mm:ss'Z'", { locale: es });

    try {
      const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          cliente_id: form.cliente_id,
          mascota_id: form.mascota_id,
          servicio_id: form.servicio_id,
          veterinario_id: veterinarioId,
          fecha: fechaHoraISO,
          estado: "pendiente",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Error al crear reserva: ${res.status} ${res.statusText}`, text);
        throw new Error("Error al crear la cita.");
      }

      setConfirmacion("✅ Cita creada correctamente.");
      cerrarModal();
      await cargarReservas();
    } catch (err) {
      setError("❌ " + err.message);
    }
  };

  const marcarAtendido = async () => {
    if (!reservaSeleccionada) return;
    if (reservaSeleccionada.estado === "atendido") {
      setError("⚠️ Esta cita ya está marcada como atendida.");
      return;
    }
    try {
      const res = await fetch(
        `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/${reservaSeleccionada.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ estado: "atendido" }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        console.error(`Error al actualizar estado: ${res.status} ${res.statusText}`, text);
        throw new Error("Error al marcar como atendido.");
      }
      setReservas((prev) =>
        prev.map((r) =>
          r.id === reservaSeleccionada.id ? { ...r, estado: "atendido" } : r
        )
      );
      setConfirmacion("✅ Cita marcada como atendida.");
      setTimeout(cerrarModalEdicion, 900);
      await cargarReservas();
    } catch (err) {
      setError("❌ " + err.message);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
      }}
    >
      <style>
        {`
          .react-calendar {
            background: #2c2c2c !important;
            border: 1px solid #444 !important;
            border-radius: 8px !important;
            color: #e0e0e0 !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          }
          .react-calendar__navigation {
            background: #2c2c2c !important;
            color: #e0e0e0 !important;
          }
          .react-calendar__navigation__label,
          .react-calendar__navigation__arrow {
            background: #2c2c2c !important;
            color: #e0e0e0 !important;
            border: none !important;
          }
          .react-calendar__navigation__arrow:hover,
          .react-calendar__navigation__label:hover {
            background: #3a3a3a !important;
            color: #ffffff !important;
          }
          .react-calendar__month-view__weekdays {
            background: #2c2c2c !important;
            color: #e0e0e0 !important;
          }
          .react-calendar__month-view__weekdays__weekday abbr {
            color: #e0e0e0 !important;
            text-decoration: none !important;
          }
          .react-calendar__month-view__days__day {
            background: #2c2c2c !important;
            color: #e0e0e0 !important;
            border-radius: 4px !important;
          }
          .react-calendar__tile {
            background: #2c2c2c !important;
            color: #e0e0e0 !important;
            border-radius: 4px !important;
            transition: background 0.2s ease !important;
          }
          .react-calendar__tile:hover {
            background: #3a3a3a !important;
            color: #ffffff !important;
          }
          .react-calendar__tile--active,
          .react-calendar__tile--now {
            background: #007bff !important;
            color: #ffffff !important;
          }
          .react-calendar__tile--neighboringMonth {
            color: #a0a0a0 !important;
          }
        `}
      </style>

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
          <i className="bi bi-calendar3 me-2"></i>Agenda Veterinaria
        </h2>
        <Button
          variant="success"
          onClick={abrirModal}
          style={{
            borderRadius: "8px",
            padding: "0.6rem 1.2rem",
            fontWeight: 500,
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
        >
          <i className="bi bi-plus-circle me-2"></i>Crear Cita
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

      <Row>
        <Col md={3}>
          <Calendar
            onChange={setFechaSeleccionada}
            value={fechaSeleccionada}
            className="border-0 rounded"
            style={{
              background: "#2c2c2c",
              color: "#e0e0e0",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
              border: "1px solid #444",
            }}
            tileClassName={({ date, view }) => (view === "month" ? "rounded" : null)}
            tileContent={({ date, view }) => {
              if (view !== "month") return null;
              const hasReserva = reservas.some(
                (r) => r.fecha.toDateString() === date.toDateString()
              );
              return hasReserva ? (
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    background: "#1d72d3ff",
                    borderRadius: "50%",
                    margin: "0 auto",
                  }}
                />
              ) : null;
            }}
          />
        </Col>

        <Col md={9}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "1rem",
            }}
          >
            {["lista", "día", "semana", "mes"].map((v) => (
              <Button
                key={v}
                variant={vista === v ? "primary" : "secondary"}
                className="mx-1"
                onClick={() => cambiarVista(v)}
                style={{
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem",
                  textTransform: "capitalize",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </Button>
            ))}
            <Button
              variant="info"
              onClick={cargarReservas}
              disabled={cargandoActualizacion}
              style={{
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              {cargandoActualizacion ? (
                <i className="bi bi-arrow-clockwise fa-spin me-2"></i>
              ) : (
                <i className="bi bi-arrow-clockwise me-2"></i>
              )}
              Actualizar
            </Button>
          </div>

          <div
            style={{
              background: "#2c2c2c",
              borderRadius: "8px",
              padding: "1.5rem",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            }}
          >
            {cargando ? (
              <div style={{ textAlign: "center" }}>
                <Spinner animation="border" variant="light" />
                <p style={{ marginTop: "0.5rem", color: "#e0e0e0" }}>
                  Cargando reservas...
                </p>
              </div>
            ) : reservasFiltradas().length === 0 ? (
              <p style={{ color: "#e0e0e0" }}>No hay reservas para esta vista.</p>
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
                    <th style={{ padding: "1rem" }}>
                      <i className="bi bi-paw me-2"></i>Mascota
                    </th>
                    <th style={{ padding: "1rem" }}>
                      <i className="bi bi-person me-2"></i>Cliente
                    </th>
                    <th style={{ padding: "1rem" }}>
                      <i className="bi bi-clipboard-check me-2"></i>Servicio
                    </th>
                    <th style={{ padding: "1rem" }}>
                      <i className="bi bi-calendar-event me-2"></i>Fecha
                    </th>
                    <th style={{ padding: "1rem" }}>
                      <i className="bi bi-check-circle me-2"></i>Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas().map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => abrirModalEdicion(r)}
                      style={{
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#3a3a3a")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                        {r.mascota}
                      </td>
                      <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                        {r.cliente}
                      </td>
                      <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                        {r.servicio}
                      </td>
                      <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                        {format(r.fecha, "dd/MM/yyyy HH:mm", { locale: es })}
                      </td>
                      <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                        {r.estado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Col>
      </Row>

      <Modal
        show={mostrarModal}
        onHide={cerrarModal}
        dialogClassName="modal-dark"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            Crear Cita
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#2c2c2c", padding: "1.5rem" }}>
          {error && (
            <Alert variant="danger" style={{ borderRadius: "6px", fontSize: "0.9rem" }}>
              {error}
            </Alert>
          )}
          {confirmacion && (
            <Alert variant="success" style={{ borderRadius: "6px", fontSize: "0.9rem" }}>
              {confirmacion}
            </Alert>
          )}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>
                Cliente
              </Form.Label>
              <Form.Select
                value={form.cliente_id}
                onChange={(e) => setForm({ ...form, cliente_id: e.target.value, mascota_id: "" })}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>
                Mascota
              </Form.Label>
              <Form.Select
                value={form.mascota_id}
                onChange={(e) => setForm({ ...form, mascota_id: e.target.value })}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                }}
              >
                <option value="">Selecciona una mascota</option>
                {mascotas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>
                Servicio
              </Form.Label>
              <Form.Select
                value={form.servicio_id}
                onChange={(e) => setForm({ ...form, servicio_id: e.target.value })}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>
                Fecha
              </Form.Label>
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
                }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>
                Hora
              </Form.Label>
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
                }}
              />
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
              <i className="bi bi-save me-2"></i>Guardar Cita
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal
        show={modalEdicionVisible}
        onHide={cerrarModalEdicion}
        dialogClassName="modal-dark"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            Detalles de la Cita
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#2c2c2c", padding: "1.5rem" }}>
          {error && (
            <Alert variant="danger" style={{ borderRadius: "6px", fontSize: "0.9rem" }}>
              {error}
            </Alert>
          )}
          {confirmacion && (
            <Alert variant="success" style={{ borderRadius: "6px", fontSize: "0.9rem" }}>
              {confirmacion}
            </Alert>
          )}
          {reservaSeleccionada && (
            <>
              <p style={{ color: "#e0e0e0" }}>
                <strong>Mascota:</strong> {reservaSeleccionada.mascota}
              </p>
              <p style={{ color: "#e0e0e0" }}>
                <strong>Cliente:</strong> {reservaSeleccionada.cliente}
              </p>
              <p style={{ color: "#e0e0e0" }}>
                <strong>Servicio:</strong> {reservaSeleccionada.servicio}
              </p>
              <p style={{ color: "#e0e0e0" }}>
                <strong>Fecha:</strong>{" "}
                {format(reservaSeleccionada.fecha, "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
              <p style={{ color: "#e0e0e0" }}>
                <strong>Estado:</strong> {reservaSeleccionada.estado}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "1rem",
                }}
              >
                <Button
                  variant="primary"
                  onClick={marcarAtendido}
                  style={{
                    borderRadius: "8px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 500,
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                  disabled={reservaSeleccionada?.estado === "atendido"}
                >
                  <i className="bi bi-check-circle me-2"></i>Atendido
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (window.confirm("¿Eliminar esta cita?")) {
                      try {
                        const res = await fetch(
                          `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/${reservaSeleccionada.id}`,
                          {
                            method: "DELETE",
                            headers: { Accept: "application/json" },
                          }
                        );
                        if (!res.ok) {
                          const text = await res.text();
                          console.error(`Error al eliminar: ${res.status} ${res.statusText}`, text);
                          throw new Error("Error al eliminar la cita.");
                        }
                        setReservas(reservas.filter((r) => r.id !== reservaSeleccionada.id));
                        setConfirmacion("✅ Cita eliminada correctamente.");
                        setTimeout(cerrarModalEdicion, 900);
                        await cargarReservas();
                      } catch (err) {
                        setError("❌ Error al eliminar la cita: " + err.message);
                      }
                    }
                  }}
                  style={{
                    borderRadius: "8px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 500,
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                >
                  <i className="bi bi-trash me-2"></i>Eliminar
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
