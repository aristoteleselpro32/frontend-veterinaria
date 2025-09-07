"use client";
import { useState, useEffect } from "react";
import { Table, Button, Form, Modal, Alert, Spinner } from "react-bootstrap";
import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import axios from "axios";
import { API } from "./api";

const httpMascotas = axios.create({
  baseURL: API.mascotas,
  headers: { "Content-Type": "application/json" },
});

const httpUsuarios = axios.create({
  baseURL: API.usuarios,
  headers: { "Content-Type": "application/json" },
});

const httpCartillas = axios.create({
  baseURL: API.cartillas,
  headers: { "Content-Type": "application/json" },
});

export default function Mascotas() {
  const [mascotas, setMascotas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCartillaModal, setShowCartillaModal] = useState(false);
  const [showVacunaModal, setShowVacunaModal] = useState(false);
  const [showAntiparasitarioModal, setShowAntiparasitarioModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState(null);
  const [cartilla, setCartilla] = useState(null);
  const [vacunaSeleccionada, setVacunaSeleccionada] = useState(null);
  const [antiparasitarioSeleccionado, setAntiparasitarioSeleccionado] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    especie: "",
    raza: "",
    fecha_nacimiento: "",
    sexo: "",
    cliente_id: "",
    edad: "",
    peso: "",
    color: "",
  });
  const [vacunaForm, setVacunaForm] = useState({
    mascota_id: "",
    nombre: "",
    fecha_aplicacion: "",
    fecha_refuerzo: "",
    firma_veterinario: "",
    etiqueta_vacuna: "",
  });
  const [antiparasitarioForm, setAntiparasitarioForm] = useState({
    mascota_id: "",
    fecha_aplicacion: "",
    peso_mascota: "",
    nombre_producto: "",
    proxima_aplicacion: "",
    firma_veterinario: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cargando, setCargando] = useState(true);
  const [cargandoCartilla, setCargandoCartilla] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      try {
        const [resMascotas, resClientes] = await Promise.all([
          httpMascotas.get("/mascotas"),
          httpUsuarios.get("/obtenerusuarios"),
        ]);
        const mascotasTransformadas = resMascotas.data.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          especie: m.especie,
          raza: m.raza,
          fecha_nacimiento: m.fecha_nacimiento ? new Date(m.fecha_nacimiento) : null,
          sexo: m.sexo,
          cliente: m.cliente?.nombre || resClientes.data.find((c) => c.id === m.cliente_id)?.nombre || "Sin cliente",
          cliente_id: m.cliente_id || "",
          edad: m.edad || "",
          peso: m.peso || "",
          color: m.color || "",
        }));
        setMascotas(mascotasTransformadas);
        setClientes(resClientes.data.filter((c) => c.rol === "usuario"));
      } catch (err) {
        setError(`❌ Error al cargar datos: ${err.response?.statusText || err.message}`);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  const abrirModalCrear = () => {
    setForm({
      nombre: "",
      especie: "",
      raza: "",
      fecha_nacimiento: "",
      sexo: "",
      cliente_id: "",
      edad: "",
      peso: "",
      color: "",
    });
    setIsEditing(false);
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const abrirModalEdicion = (mascota) => {
    setMascotaSeleccionada(mascota);
    setForm({
      nombre: mascota.nombre || "",
      especie: mascota.especie || "",
      raza: mascota.raza || "",
      fecha_nacimiento: mascota.fecha_nacimiento
        ? format(mascota.fecha_nacimiento, "yyyy-MM-dd", { locale: es })
        : "",
      sexo: mascota.sexo || "",
      cliente_id: mascota.cliente_id || "",
      edad: mascota.edad || "",
      peso: mascota.peso || "",
      color: mascota.color || "",
    });
    setIsEditing(true);
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const abrirModalCartilla = async (mascota) => {
    setMascotaSeleccionada(mascota);
    setCargandoCartilla(true);
    try {
      const res = await httpCartillas.get(`/cartilla/${mascota.id}`);
      setCartilla(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setCartilla(null);
      } else {
        setError(`❌ Error al cargar cartilla: ${err.response?.statusText || err.message}`);
      }
    } finally {
      setCargandoCartilla(false);
      setShowCartillaModal(true);
    }
  };

  const abrirModalVacuna = (vacuna = {}) => {
    setVacunaSeleccionada(vacuna);
    setVacunaForm({
      mascota_id: mascotaSeleccionada.id,
      nombre: vacuna.nombre || "",
      fecha_aplicacion: vacuna.fecha_aplicacion ? format(new Date(vacuna.fecha_aplicacion), "yyyy-MM-dd", { locale: es }) : "",
      fecha_refuerzo: vacuna.fecha_refuerzo ? format(new Date(vacuna.fecha_refuerzo), "yyyy-MM-dd", { locale: es }) : "",
      firma_veterinario: vacuna.firma_veterinario || "",
      etiqueta_vacuna: vacuna.etiqueta_vacuna || "",
    });
    setShowVacunaModal(true);
    setError("");
    setSuccess("");
  };

  const abrirModalAntiparasitario = (antiparasitario = {}) => {
    setAntiparasitarioSeleccionado(antiparasitario);
    setAntiparasitarioForm({
      mascota_id: mascotaSeleccionada.id,
      fecha_aplicacion: antiparasitario.fecha_aplicacion ? format(new Date(antiparasitario.fecha_aplicacion), "yyyy-MM-dd", { locale: es }) : "",
      peso_mascota: antiparasitario.peso_mascota || "",
      nombre_producto: antiparasitario.nombre_producto || "",
      proxima_aplicacion: antiparasitario.proxima_aplicacion ? format(new Date(antiparasitario.proxima_aplicacion), "yyyy-MM-dd", { locale: es }) : "",
      firma_veterinario: antiparasitario.firma_veterinario || "",
    });
    setShowAntiparasitarioModal(true);
    setError("");
    setSuccess("");
  };

  const cerrarModal = () => {
    setShowModal(false);
    setMascotaSeleccionada(null);
    setError("");
    setSuccess("");
    setForm({
      nombre: "",
      especie: "",
      raza: "",
      fecha_nacimiento: "",
      sexo: "",
      cliente_id: "",
      edad: "",
      peso: "",
      color: "",
    });
  };

  const cerrarModalCartilla = () => {
    setShowCartillaModal(false);
    setMascotaSeleccionada(null);
    setCartilla(null);
    setError("");
    setSuccess("");
  };

  const cerrarModalVacuna = () => {
    setShowVacunaModal(false);
    setVacunaSeleccionada(null);
    setVacunaForm({
      mascota_id: "",
      nombre: "",
      fecha_aplicacion: "",
      fecha_refuerzo: "",
      firma_veterinario: "",
      etiqueta_vacuna: "",
    });
    setError("");
    setSuccess("");
  };

  const cerrarModalAntiparasitario = () => {
    setShowAntiparasitarioModal(false);
    setAntiparasitarioSeleccionado(null);
    setAntiparasitarioForm({
      mascota_id: "",
      fecha_aplicacion: "",
      peso_mascota: "",
      nombre_producto: "",
      proxima_aplicacion: "",
      firma_veterinario: "",
    });
    setError("");
    setSuccess("");
  };

  const crearCartilla = async () => {
    if (!window.confirm("¿Crear cartilla para esta mascota?")) return;
    try {
      const res = await httpCartillas.post("/cartilla", { mascota_id: mascotaSeleccionada.id });
      setCartilla(res.data.cartilla);
      setSuccess("✅ Cartilla creada correctamente.");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error creando cartilla.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nombre || !form.especie || !form.raza || !form.fecha_nacimiento || !form.sexo || !form.cliente_id || !form.edad || !form.peso) {
      setError("⚠️ Todos los campos obligatorios deben estar completos.");
      return;
    }

    let fechaNacimiento;
    try {
      fechaNacimiento = parse(form.fecha_nacimiento, "yyyy-MM-dd", new Date());
      if (!isValid(fechaNacimiento)) {
        setError("⚠️ La fecha de nacimiento no es válida.");
        return;
      }
    } catch (err) {
      setError("⚠️ Error al procesar la fecha de nacimiento.");
      return;
    }

    if (isNaN(parseInt(form.edad)) || parseInt(form.edad) < 0) {
      setError("⚠️ La edad debe ser un número positivo.");
      return;
    }

    if (isNaN(parseFloat(form.peso)) || parseFloat(form.peso) <= 0) {
      setError("⚠️ El peso debe ser un número positivo.");
      return;
    }

    try {
      const url = isEditing ? `/mascotas/${mascotaSeleccionada.id}` : "/mascotas";
      const method = isEditing ? httpMascotas.put : httpMascotas.post;

      const res = await method(url, {
        nombre: form.nombre,
        especie: form.especie,
        raza: form.raza,
        fecha_nacimiento: format(fechaNacimiento, "yyyy-MM-dd", { locale: es }),
        sexo: form.sexo,
        cliente_id: form.cliente_id,
        edad: parseInt(form.edad),
        peso: parseFloat(form.peso),
        color: form.color,
      });

      const mascotaActualizada = {
        id: isEditing ? mascotaSeleccionada.id : res.data.id,
        nombre: form.nombre,
        especie: form.especie,
        raza: form.raza,
        fecha_nacimiento: fechaNacimiento,
        sexo: form.sexo,
        cliente: clientes.find((c) => c.id === form.cliente_id)?.nombre || "Sin cliente",
        cliente_id: form.cliente_id,
        edad: parseInt(form.edad),
        peso: parseFloat(form.peso),
        color: form.color,
      };

      if (isEditing) {
        setMascotas((prev) =>
          prev.map((m) => (m.id === mascotaSeleccionada.id ? mascotaActualizada : m))
        );
      } else {
        setMascotas((prev) => [...prev, mascotaActualizada]);
      }

      setSuccess(`✅ Mascota ${isEditing ? "actualizada" : "creada"} correctamente.`);
      cerrarModal();
    } catch (err) {
      setError(err.response?.data?.error || `❌ Error al ${isEditing ? "actualizar" : "crear"} la mascota.`);
    }
  };

  const handleVacunaSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const url = vacunaSeleccionada
        ? `/cartilla/vacuna/${vacunaSeleccionada._id}`
        : "/cartilla/vacuna";
      const method = vacunaSeleccionada ? httpCartillas.put : httpCartillas.post;

      const res = await method(url, vacunaForm);
      setCartilla(res.data.cartilla);
      setSuccess(`✅ Vacuna ${vacunaSeleccionada ? "actualizada" : "creada"} correctamente.`);
      cerrarModalVacuna();
    } catch (err) {
      setError(err.response?.data?.error || `❌ Error al ${vacunaSeleccionada ? "actualizar" : "crear"} la vacuna.`);
    }
  };

  const handleAntiparasitarioSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const url = antiparasitarioSeleccionado
        ? `/cartilla/antiparasitario/${antiparasitarioSeleccionado._id}`
        : "/cartilla/antiparasitario";
      const method = antiparasitarioSeleccionado ? httpCartillas.put : httpCartillas.post;

      const res = await method(url, antiparasitarioForm);
      setCartilla(res.data.cartilla);
      setSuccess(`✅ Antiparasitario ${antiparasitarioSeleccionado ? "actualizado" : "creado"} correctamente.`);
      cerrarModalAntiparasitario();
    } catch (err) {
      setError(err.response?.data?.error || `❌ Error al ${antiparasitarioSeleccionado ? "actualizar" : "crear"} el antiparasitario.`);
    }
  };

  const eliminarMascota = async (id) => {
    if (!window.confirm("¿Eliminar esta mascota?")) return;
    try {
      await httpMascotas.delete(`/mascotas/${id}`);
      setMascotas((prev) => prev.filter((m) => m.id !== id));
      setSuccess("✅ Mascota eliminada correctamente.");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error al eliminar la mascota.");
    }
  };

  const eliminarVacuna = async (id) => {
    if (!window.confirm("¿Eliminar esta vacuna?")) return;
    try {
      await httpCartillas.delete(`/cartilla/vacuna/${id}`, {
        data: { mascota_id: mascotaSeleccionada.id },
      });
      setCartilla((prev) => ({
        ...prev,
        vacunas: prev.vacunas.filter((v) => v._id !== id),
      }));
      setSuccess("✅ Vacuna eliminada correctamente.");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error al eliminar la vacuna.");
    }
  };

  const eliminarAntiparasitario = async (id) => {
    if (!window.confirm("¿Eliminar este antiparasitario?")) return;
    try {
      await httpCartillas.delete(`/cartilla/antiparasitario/${id}`, {
        data: { mascota_id: mascotaSeleccionada.id },
      });
      setCartilla((prev) => ({
        ...prev,
        desparasitaciones: prev.desparasitaciones.filter((d) => d._id !== id),
      }));
      setSuccess("✅ Antiparasitario eliminado correctamente.");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error al eliminar el antiparasitario.");
    }
  };

  return (
    <div className="container mt-5" style={{ background: "#212529", color: "#e0e0e0", padding: "2rem", borderRadius: "8px" }}>
      <h2 style={{ color: "#f8f9fa", marginBottom: "1.5rem" }}>Gestión de Mascotas</h2>
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}
      <Button
        variant="primary"
        onClick={abrirModalCrear}
        className="mb-4"
        style={{ borderRadius: "6px", padding: "0.5rem 1rem", fontWeight: 500 }}
      >
        <i className="bi bi-plus-circle me-2"></i>Crear Mascota
      </Button>
      {cargando ? (
        <div className="text-center">
          <Spinner animation="border" variant="light" />
        </div>
      ) : (
        <Table striped bordered hover variant="dark" style={{ borderRadius: "8px", overflow: "hidden" }}>
          <thead>
            <tr>
              <th style={{ padding: "0.8rem" }}>Nombre</th>
              <th style={{ padding: "0.8rem" }}>Dueño</th>
              <th style={{ padding: "0.8rem" }}>Especie</th>
              <th style={{ padding: "0.8rem" }}>Raza</th>
              <th style={{ padding: "0.8rem" }}>Edad</th>
              <th style={{ padding: "0.8rem" }}>Peso</th>
              <th style={{ padding: "0.8rem" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mascotas.length > 0 ? (
              mascotas.map((mascota) => (
                <tr key={mascota.id}>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{mascota.nombre}</td>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{mascota.cliente}</td>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{mascota.especie}</td>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{mascota.raza}</td>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{mascota.edad} años</td>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{mascota.peso} kg</td>
                  <td style={{ padding: "0.8rem" }}>
                    <Button
                      variant="info"
                      size="sm"
                      className="me-2"
                      onClick={() => abrirModalCartilla(mascota)}
                      style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
                    >
                      <i className="bi bi-clipboard me-2"></i>Cartilla
                    </Button>
                    <Button
                      variant="warning"
                      size="sm"
                      className="me-2"
                      onClick={() => abrirModalEdicion(mascota)}
                      style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
                    >
                      <i className="bi bi-pencil me-2"></i>Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => eliminarMascota(mascota.id)}
                      style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
                    >
                      <i className="bi bi-trash me-2"></i>Eliminar
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: "0.8rem", color: "#e0e0e0", textAlign: "center" }}>
                  No hay mascotas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={cerrarModal} centered>
        <Modal.Header closeButton style={{ background: "#343a40", color: "#f8f9fa", borderBottom: "1px solid #555" }}>
          <Modal.Title>{isEditing ? "Editar Mascota" : "Crear Mascota"}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#212529", color: "#e0e0e0" }}>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Dueño *</Form.Label>
              <Form.Select
                value={form.cliente_id}
                onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              >
                <option value="">Seleccione un dueño</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Especie *</Form.Label>
              <Form.Control
                type="text"
                value={form.especie}
                onChange={(e) => setForm({ ...form, especie: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Raza *</Form.Label>
              <Form.Control
                type="text"
                value={form.raza}
                onChange={(e) => setForm({ ...form, raza: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Fecha de Nacimiento *</Form.Label>
              <Form.Control
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Sexo *</Form.Label>
              <Form.Select
                value={form.sexo}
                onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              >
                <option value="">Seleccione</option>
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Edad (en años) *</Form.Label>
              <Form.Control
                type="number"
                value={form.edad}
                onChange={(e) => setForm({ ...form, edad: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Peso (en kg) *</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={form.peso}
                onChange={(e) => setForm({ ...form, peso: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Color</Form.Label>
              <Form.Control
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              style={{ borderRadius: "6px", padding: "0.5rem 1rem", fontWeight: 500 }}
            >
              {isEditing ? "Actualizar" : "Crear"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showCartillaModal} onHide={cerrarModalCartilla} centered size="lg">
        <Modal.Header closeButton style={{ background: "#343a40", color: "#f8f9fa", borderBottom: "1px solid #555" }}>
          <Modal.Title>Cartilla de {mascotaSeleccionada?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#212529", color: "#e0e0e0" }}>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          {cargandoCartilla ? (
            <div className="text-center">
              <Spinner animation="border" variant="light" />
            </div>
          ) : cartilla ? (
            <>
              <h4 style={{ color: "#f8f9fa" }}>Vacunas</h4>
              <Button
                variant="outline-light"
                size="sm"
                className="mb-3"
                onClick={() => abrirModalVacuna()}
                style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
              >
                <i className="bi bi-plus-circle me-2"></i>Añadir Vacuna
              </Button>
              <Table striped bordered hover variant="dark" style={{ borderRadius: "8px", overflow: "hidden" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "0.8rem" }}>Nombre</th>
                    <th style={{ padding: "0.8rem" }}>Fecha Aplicación</th>
                    <th style={{ padding: "0.8rem" }}>Fecha Refuerzo</th>
                    <th style={{ padding: "0.8rem" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cartilla.vacunas.length > 0 ? (
                    cartilla.vacunas.map((vacuna) => (
                      <tr key={vacuna._id}>
                        <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{vacuna.nombre}</td>
                        <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                          {vacuna.fecha_aplicacion ? format(new Date(vacuna.fecha_aplicacion), "dd/MM/yyyy", { locale: es }) : "N/A"}
                        </td>
                        <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                          {vacuna.fecha_refuerzo ? format(new Date(vacuna.fecha_refuerzo), "dd/MM/yyyy", { locale: es }) : "N/A"}
                        </td>
                        <td style={{ padding: "0.8rem" }}>
                          <Button
                            variant="warning"
                            size="sm"
                            className="me-2"
                            onClick={() => abrirModalVacuna(vacuna)}
                            style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
                          >
                            <i className="bi bi-pencil me-2"></i>Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => eliminarVacuna(vacuna._id)}
                            style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
                          >
                            <i className="bi bi-trash me-2"></i>Eliminar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: "0.8rem", color: "#e0e0e0", textAlign: "center" }}>
                        No hay vacunas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <h4 style={{ color: "#f8f9fa", marginTop: "2rem" }}>Antiparasitarios</h4>
              <Button
                variant="outline-light"
                size="sm"
                className="mb-3"
                onClick={() => abrirModalAntiparasitario()}
                style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
              >
                <i className="bi bi-plus-circle me-2"></i>Añadir Antiparasitario
              </Button>
              <Table striped bordered hover variant="dark" style={{ borderRadius: "8px", overflow: "hidden" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "0.8rem" }}>Nombre Producto</th>
                    <th style={{ padding: "0.8rem" }}>Fecha Aplicación</th>
                    <th style={{ padding: "0.8rem" }}>Peso Mascota</th>
                    <th style={{ padding: "0.8rem" }}>Próxima Aplicación</th>
                    <th style={{ padding: "0.8rem" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cartilla.desparasitaciones.length > 0 ? (
                    cartilla.desparasitaciones.map((antiparasitario) => (
                      <tr key={antiparasitario._id}>
                        <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{antiparasitario.nombre_producto}</td>
                        <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                          {antiparasitario.fecha_aplicacion ? format(new Date(antiparasitario.fecha_aplicacion), "dd/MM/yyyy", { locale: es }) : "N/A"}
                        </td>
                        <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{antiparasitario.peso_mascota} kg</td>
                        <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                          {antiparasitario.proxima_aplicacion ? format(new Date(antiparasitario.proxima_aplicacion), "dd/MM/yyyy", { locale: es }) : "N/A"}
                        </td>
                        <td style={{ padding: "0.8rem" }}>
                          <Button
                            variant="warning"
                            size="sm"
                            className="me-2"
                            onClick={() => abrirModalAntiparasitario(antiparasitario)}
                            style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
                          >
                            <i className="bi bi-pencil me-2"></i>Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => eliminarAntiparasitario(antiparasitario._id)}
                            style={{ borderRadius: "6px", padding: "0.4rem 0.8rem", fontWeight: 500 }}
                          >
                            <i className="bi bi-trash me-2"></i>Eliminar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: "0.8rem", color: "#e0e0e0", textAlign: "center" }}>
                        No hay antiparasitarios registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </>
          ) : (
            <div className="text-center">
              <p style={{ color: "#e0e0e0" }}>No hay cartilla asociada.</p>
              <Button
                variant="primary"
                onClick={crearCartilla}
                style={{ borderRadius: "6px", padding: "0.5rem 1rem", fontWeight: 500 }}
              >
                Crear Cartilla
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showVacunaModal} onHide={cerrarModalVacuna} centered>
        <Modal.Header closeButton style={{ background: "#343a40", color: "#f8f9fa", borderBottom: "1px solid #555" }}>
          <Modal.Title>{vacunaSeleccionada ? "Editar Vacuna" : "Añadir Vacuna"}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#212529", color: "#e0e0e0" }}>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={handleVacunaSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={vacunaForm.nombre}
                onChange={(e) => setVacunaForm({ ...vacunaForm, nombre: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Fecha de Aplicación *</Form.Label>
              <Form.Control
                type="date"
                value={vacunaForm.fecha_aplicacion}
                onChange={(e) => setVacunaForm({ ...vacunaForm, fecha_aplicacion: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Fecha de Refuerzo</Form.Label>
              <Form.Control
                type="date"
                value={vacunaForm.fecha_refuerzo}
                onChange={(e) => setVacunaForm({ ...vacunaForm, fecha_refuerzo: e.target.value })}
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Firma Veterinario</Form.Label>
              <Form.Control
                type="text"
                value={vacunaForm.firma_veterinario}
                onChange={(e) => setVacunaForm({ ...vacunaForm, firma_veterinario: e.target.value })}
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Etiqueta Vacuna</Form.Label>
              <Form.Control
                type="text"
                value={vacunaForm.etiqueta_vacuna}
                onChange={(e) => setVacunaForm({ ...vacunaForm, etiqueta_vacuna: e.target.value })}
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              style={{ borderRadius: "6px", padding: "0.5rem 1rem", fontWeight: 500 }}
            >
              {vacunaSeleccionada ? "Actualizar" : "Añadir"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showAntiparasitarioModal} onHide={cerrarModalAntiparasitario} centered>
        <Modal.Header closeButton style={{ background: "#343a40", color: "#f8f9fa", borderBottom: "1px solid #555" }}>
          <Modal.Title>{antiparasitarioSeleccionado ? "Editar Antiparasitario" : "Añadir Antiparasitario"}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#212529", color: "#e0e0e0" }}>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={handleAntiparasitarioSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Nombre Producto *</Form.Label>
              <Form.Control
                type="text"
                value={antiparasitarioForm.nombre_producto}
                onChange={(e) => setAntiparasitarioForm({ ...antiparasitarioForm, nombre_producto: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Fecha de Aplicación *</Form.Label>
              <Form.Control
                type="date"
                value={antiparasitarioForm.fecha_aplicacion}
                onChange={(e) => setAntiparasitarioForm({ ...antiparasitarioForm, fecha_aplicacion: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Peso Mascota (kg) *</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={antiparasitarioForm.peso_mascota}
                onChange={(e) => setAntiparasitarioForm({ ...antiparasitarioForm, peso_mascota: e.target.value })}
                required
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Próxima Aplicación</Form.Label>
              <Form.Control
                type="date"
                value={antiparasitarioForm.proxima_aplicacion}
                onChange={(e) => setAntiparasitarioForm({ ...antiparasitarioForm, proxima_aplicacion: e.target.value })}
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0" }}>Firma Veterinario</Form.Label>
              <Form.Control
                type="text"
                value={antiparasitarioForm.firma_veterinario}
                onChange={(e) => setAntiparasitarioForm({ ...antiparasitarioForm, firma_veterinario: e.target.value })}
                style={{ background: "#333", border: "1px solid #555", color: "#e0e0e0", borderRadius: "6px" }}
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              style={{ borderRadius: "6px", padding: "0.5rem 1rem", fontWeight: 500 }}
            >
              {antiparasitarioSeleccionado ? "Actualizar" : "Añadir"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}