"use client";
import { useState, useEffect } from "react";
import { Table, Button, Form, Modal, Alert, Spinner, Row, Col } from "react-bootstrap";

export default function Servicios() {
  const [servicios, setServicios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    duracion_minutos: "",
  });
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(true);

  // 🔍 Cargar servicios
  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios");
        if (!res.ok) throw new Error("Error al obtener servicios");
        const data = await res.json();
        setServicios(data);
      } catch (err) {
        setError("❌ No se pudieron cargar los servicios.");
      } finally {
        setCargando(false);
      }
    };
    cargarServicios();
  }, []);

  // ➕ Abrir modal para crear
  const abrirModalCrear = () => {
    setForm({ nombre: "", descripcion: "", precio: "", duracion_minutos: "" });
    setIsEditing(false);
    setShowModal(true);
  };

  // ✏️ Abrir modal para editar
  const abrirModalEdicion = (servicio) => {
    setServicioSeleccionado(servicio);
    setForm({
      nombre: servicio.nombre || "",
      descripcion: servicio.descripcion || "",
      precio: servicio.precio?.toString() || "",
      duracion_minutos: servicio.duracion_minutos?.toString() || "",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  // 🧹 Cerrar modal
  const cerrarModal = () => {
    setShowModal(false);
    setServicioSeleccionado(null);
    setError("");
    setConfirmacion("");
    setForm({ nombre: "", descripcion: "", precio: "", duracion_minutos: "" });
  };

  // 💾 Crear/Editar
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setConfirmacion("");

    if (!form.nombre.trim() || !form.descripcion.trim() || !form.precio || !form.duracion_minutos) {
      setError("⚠️ Todos los campos son obligatorios.");
      return;
    }
    const precio = parseFloat(form.precio);
    const duracion = parseInt(form.duracion_minutos, 10);
    if (isNaN(precio) || precio <= 0) {
      setError("⚠️ El precio debe ser un número positivo.");
      return;
    }
    if (isNaN(duracion) || duracion <= 0) {
      setError("⚠️ La duración debe ser un número positivo (en minutos).");
      return;
    }

    try {
      const url = isEditing
        ? `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios/${servicioSeleccionado.id}`
        : `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion,
          precio,
          duracion_minutos: duracion,
        }),
      });

      if (!res.ok) throw new Error(`Error al ${isEditing ? "actualizar" : "crear"} el servicio.`);

      const data = await res.json();
      const servicioActualizado = {
        id: isEditing ? servicioSeleccionado.id : data.data[0].id,
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio,
        duracion_minutos: duracion,
      };

      if (isEditing) {
        setServicios((prev) =>
          prev.map((s) => (s.id === servicioSeleccionado.id ? servicioActualizado : s))
        );
      } else {
        setServicios((prev) => [...prev, servicioActualizado]);
      }

      cerrarModal();
    } catch (err) {
      setError("❌ " + err.message);
    }
  };

  // ❌ Eliminar servicio
  const eliminarServicio = async (id) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    try {
      const res = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar el servicio.");
      setServicios((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError("❌ " + err.message);
    }
  };

  return (
    <div className="p-4 bg-dark text-light rounded shadow-lg">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">💉 Gestión de Servicios</h2>
        <Button variant="success" onClick={abrirModalCrear}>
          + Crear Servicio
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {confirmacion && <Alert variant="success" dismissible onClose={() => setConfirmacion("")}>{confirmacion}</Alert>}

      {cargando ? (
        <div className="text-center">
          <Spinner animation="border" variant="light" />
          <p className="mt-2">Cargando servicios...</p>
        </div>
      ) : servicios.length === 0 ? (
        <p>No hay servicios disponibles.</p>
      ) : (
        <Table striped bordered hover variant="dark" responsive className="shadow-sm">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Duración (min)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((s) => (
              <tr key={s.id}>
                <td>{s.nombre}</td>
                <td>{s.descripcion}</td>
                <td>${s.precio.toFixed(2)}</td>
                <td>{s.duracion_minutos}</td>
                <td>
                  <Button variant="warning" size="sm" className="me-2" onClick={() => abrirModalEdicion(s)}>
                    ✏️ Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => eliminarServicio(s.id)}>
                    🗑 Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal Crear/Editar Servicio */}
      <Modal show={showModal} onHide={cerrarModal} centered>
        <Modal.Header closeButton className="bg-dark text-light">
          <Modal.Title>{isEditing ? "Editar Servicio" : "Crear Servicio"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-light">
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control
                    className="bg-dark text-light border-secondary"
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Consulta General"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Precio</Form.Label>
                  <Form.Control
                    className="bg-dark text-light border-secondary"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="Ej: 50.00"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                className="bg-dark text-light border-secondary"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Detalles del servicio"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Duración (minutos)</Form.Label>
              <Form.Control
                className="bg-dark text-light border-secondary"
                type="number"
                min="1"
                value={form.duracion_minutos}
                onChange={(e) => setForm({ ...form, duracion_minutos: e.target.value })}
                placeholder="Ej: 30"
                required
              />
            </Form.Group>

            <Button variant="success" type="submit" className="w-100">
              {isEditing ? "Actualizar Servicio" : "Crear Servicio"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
