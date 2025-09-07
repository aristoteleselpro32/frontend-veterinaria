
"use client";
import { useEffect, useState } from "react";
import { Button, Form, Row, Col, Modal, Table, Container, Alert, Spinner } from "react-bootstrap";

export default function Consultorio({ setView, setMascotaSeleccionada, setPropietarioSeleccionado }) {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [mascotas, setMascotas] = useState({});
  const [busquedaPropietario, setBusquedaPropietario] = useState("");
  const [busquedaMascota, setBusquedaMascota] = useState("");
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [showModalVer, setShowModalVer] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [showMascotaFilter, setShowMascotaFilter] = useState(false);
  const [formNuevo, setFormNuevo] = useState({ nombre: "", correo: "", telefono: "", direccion: "" });
  const [formMascota, setFormMascota] = useState({ nombre: "", especie: "", raza: "", edad: "", fecha_nacimiento: "", sexo: "", peso: "", color: "" });
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState("");

  const fetchUsuarios = async () => {
    try {
      const res = await fetch("https://usuarios-service-emf5.onrender.com/api/usuarios/obtenerusuarios", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Error al cargar usuarios: ${res.status} ${res.statusText}`, text);
        throw new Error("Error al obtener usuarios");
      }
      const data = await res.json();
      const propietarios = data.filter((u) => u.rol === "usuario");
      setUsuarios(propietarios);
      return propietarios;
    } catch (err) {
      console.error("❌ Error al cargar usuarios:", err);
      setError("❌ Error al cargar usuarios.");
      return [];
    }
  };

  const fetchMascotas = async (propietarios) => {
    const mascotasPorUsuario = {};
    for (const user of propietarios) {
      try {
        const resMascotas = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${user.id}`, {
          headers: { Accept: "application/json" },
        });
        if (!resMascotas.ok) {
          const text = await resMascotas.text();
          console.error(`Error al cargar mascotas para usuario ${user.id}: ${resMascotas.status} ${resMascotas.statusText}`, text);
          throw new Error("Error al obtener mascotas");
        }
        const dataMascotas = await resMascotas.json();
        mascotasPorUsuario[user.id] = dataMascotas;
      } catch (err) {
        console.error(`❌ Error al cargar mascotas para usuario ${user.id}:`, err);
        mascotasPorUsuario[user.id] = [];
      }
    }
    setMascotas(mascotasPorUsuario);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const propietarios = await fetchUsuarios();
      await fetchMascotas(propietarios);
      setLoading(false);
    };
    fetchData();
  }, []);

  const usuariosFiltrados = usuarios.filter((usuario) => {
    return usuario.nombre.toLowerCase().includes(busquedaPropietario.toLowerCase());
  });

  const mascotasFiltradas = (usuarioId) => {
    if (!busquedaMascota || !showMascotaFilter) return mascotas[usuarioId] || [];
    return (mascotas[usuarioId] || []).filter((m) => m.nombre.toLowerCase().includes(busquedaMascota.toLowerCase()));
  };

  const handleRegistroPropietario = async () => {
    setError("");
    setConfirmacion("");
    if (!formNuevo.nombre || !formNuevo.correo || !formNuevo.telefono) {
      setError("⚠️ Nombre, correo y teléfono son obligatorios.");
      return;
    }
    const body = { ...formNuevo, rol: "usuario", password: "12345678" };
    try {
      const res = await fetch("https://usuarios-service-emf5.onrender.com/api/usuarios/crearusuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Error al registrar propietario: ${res.status} ${res.statusText}`, text);
        throw new Error("Error al registrar propietario");
      }
      setConfirmacion("✅ Propietario registrado correctamente.");
      setFormNuevo({ nombre: "", correo: "", telefono: "", direccion: "" });
      setShowModalNuevo(false);
      const propietarios = await fetchUsuarios();
      await fetchMascotas(propietarios);
    } catch (err) {
      setError("❌ Error al registrar propietario: " + err.message);
    }
  };

  const handleAgregarMascota = async () => {
    setError("");
    setConfirmacion("");
    if (!formMascota.nombre || !formMascota.especie) {
      setError("⚠️ Nombre y especie de la mascota son obligatorios.");
      return;
    }
    const body = { ...formMascota, cliente_id: usuarioSeleccionado.id };
    try {
      const res = await fetch("https://mascota-service.onrender.com/api/mascotas/mascotas", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Error al registrar mascota: ${res.status} ${res.statusText}`, text);
        throw new Error("Error al registrar mascota");
      }
      setConfirmacion("✅ Mascota registrada correctamente.");
      setFormMascota({ nombre: "", especie: "", raza: "", edad: "", fecha_nacimiento: "", sexo: "", peso: "", color: "" });
      setShowModalVer(false);
      const resMascotas = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${usuarioSeleccionado.id}`, {
        headers: { Accept: "application/json" },
      });
      if (!resMascotas.ok) {
        const text = await resMascotas.text();
        console.error(`Error al cargar mascotas: ${resMascotas.status} ${resMascotas.statusText}`, text);
        throw new Error("Error al cargar mascotas");
      }
      const data = await resMascotas.json();
      setMascotas((prev) => ({ ...prev, [usuarioSeleccionado.id]: data }));
    } catch (err) {
      setError("❌ Error al registrar mascota: " + err.message);
    }
  };

  return (
    <Container
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        minHeight: "100vh",
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
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <i className="bi bi-house-door me-2"></i>Consultorio
        </h2>
        <Button
          variant="success"
          onClick={() => setShowModalNuevo(true)}
          style={{
            borderRadius: "8px",
            padding: "0.6rem 1.2rem",
            fontWeight: 500,
            transition: "all 0.3s ease",
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
        >
          <i className="bi bi-plus-circle me-2"></i>Registrar Propietario
        </Button>
      </div>

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
      {confirmacion && (
        <Alert
          variant="success"
          onClose={() => setConfirmacion("")}
          dismissible
          style={{ borderRadius: "6px", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif" }}
        >
          {confirmacion}
        </Alert>
      )}

      <div
        style={{
          background: "#2c2c2c",
          borderRadius: "8px",
          padding: "1.5rem",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
          border: "1px solid #444",
        }}
      >
        <h3
          style={{
            fontSize: "1.4rem",
            fontWeight: 500,
            color: "#ffffff",
            marginBottom: "1rem",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Buscar Propietarios y Mascotas
        </h3>
        <Row className="mb-3 align-items-end">
          <Col md={5}>
            <Form.Group>
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Buscar Propietario</Form.Label>
              <Form.Control
                className="bg-dark text-light"
                placeholder="🔎 Ingrese nombre del propietario"
                value={busquedaPropietario}
                onChange={(e) => setBusquedaPropietario(e.target.value)}
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </Form.Group>
          </Col>
          <Col md={2} className="d-flex align-items-end">
            <Button
              variant="outline-primary"
              onClick={() => {
                setShowMascotaFilter(!showMascotaFilter);
                setBusquedaMascota(""); // Limpiar búsqueda de mascota al toggle
              }}
              style={{
                borderRadius: "6px",
                padding: "0.4rem 0.8rem",
                fontWeight: 500,
                transition: "all 0.3s ease",
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              <i className={showMascotaFilter ? "bi bi-dash-circle" : "bi bi-plus-circle"}></i>{" "}
              {showMascotaFilter ? "Ocultar Filtro Mascota" : "Filtrar por Mascota"}
            </Button>
          </Col>
        </Row>
        {showMascotaFilter && (
          <Row className="mb-3">
            <Col md={5}>
              <Form.Group>
                <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Buscar Mascota</Form.Label>
                <Form.Control
                  className="bg-dark text-light"
                  placeholder="🔎 Ingrese nombre de la mascota"
                  value={busquedaMascota}
                  onChange={(e) => setBusquedaMascota(e.target.value)}
                  style={{
                    background: "#333",
                    border: "1px solid #555",
                    color: "#e0e0e0",
                    borderRadius: "6px",
                    padding: "0.6rem",
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </Form.Group>
            </Col>
          </Row>
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
                <th style={{ padding: "1rem" }}><i className="bi bi-person me-2"></i>Nombre</th>
                <th style={{ padding: "1rem" }}><i className="bi bi-envelope me-2"></i>Correo</th>
                <th style={{ padding: "1rem" }}><i className="bi bi-telephone me-2"></i>Teléfono</th>
                <th style={{ padding: "1rem" }}><i className="bi bi-paw me-2"></i>Mascotas</th>
                <th style={{ padding: "1rem" }}><i className="bi bi-gear me-2"></i>Acción</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr
                  key={u.id}
                  style={{
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3a3a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{u.nombre}</td>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{u.correo}</td>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{u.telefono}</td>
                  <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>
                    <ul className="mb-0">
                      {mascotasFiltradas(u.id).map((m) => (
                        <li
                          key={m.id}
                          style={{ cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => {
                            setMascotaSeleccionada(m);
                            setPropietarioSeleccionado(u);
                            setView("perfilMascota");
                          }}
                        >
                          {m.nombre} ({m.especie})
                        </li>
                      ))}
                      {mascotasFiltradas(u.id).length === 0 && (
                        <li style={{ color: "#999" }}>No hay mascotas registradas</li>
                      )}
                    </ul>
                  </td>
                  <td style={{ padding: "0.8rem" }}>
                    <Button
                      variant="outline-info"
                      size="sm"
                      onClick={() => {
                        setUsuarioSeleccionado(u);
                        setShowModalVer(true);
                        setError("");
                        setConfirmacion("");
                      }}
                      style={{
                        borderRadius: "6px",
                        padding: "0.4rem 0.8rem",
                        fontWeight: 500,
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                    >
                      <i className="bi bi-eye me-2"></i>Ver
                    </Button>
                  </td>
                </tr>
              ))}
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </div>

      <Modal
        show={showModalNuevo}
        onHide={() => {
          setShowModalNuevo(false);
          setError("");
          setConfirmacion("");
          setFormNuevo({ nombre: "", correo: "", telefono: "", direccion: "" });
        }}
        centered
        dialogClassName="modal-dark"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            Registrar Nuevo Propietario
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
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Nombre</Form.Label>
              <Form.Control
                value={formNuevo.nombre}
                onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Correo</Form.Label>
              <Form.Control
                type="email"
                value={formNuevo.correo}
                onChange={(e) => setFormNuevo({ ...formNuevo, correo: e.target.value })}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Teléfono</Form.Label>
              <Form.Control
                value={formNuevo.telefono}
                onChange={(e) => setFormNuevo({ ...formNuevo, telefono: e.target.value })}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Dirección</Form.Label>
              <Form.Control
                value={formNuevo.direccion}
                onChange={(e) => setFormNuevo({ ...formNuevo, direccion: e.target.value })}
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              />
            </Form.Group>
            <Button
              variant="success"
              onClick={handleRegistroPropietario}
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
              <i className="bi bi-save me-2"></i>Guardar
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal
        show={showModalVer}
        onHide={() => {
          setShowModalVer(false);
          setError("");
          setConfirmacion("");
          setFormMascota({ nombre: "", especie: "", raza: "", edad: "", fecha_nacimiento: "", sexo: "", peso: "", color: "" });
        }}
        size="lg"
        centered
        dialogClassName="modal-dark"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            Propietario: {usuarioSeleccionado?.nombre}
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
          <p style={{ color: "#e0e0e0" }}><strong>Correo:</strong> {usuarioSeleccionado?.correo}</p>
          <p style={{ color: "#e0e0e0" }}><strong>Teléfono:</strong> {usuarioSeleccionado?.telefono}</p>
          <p style={{ color: "#e0e0e0" }}><strong>Dirección:</strong> {usuarioSeleccionado?.direccion || "N/D"}</p>
          <hr style={{ borderColor: "#444" }} />
          <h5 style={{ color: "#ffffff", fontWeight: 600 }}><i className="bi bi-paw me-2"></i>Registrar Mascota</h5>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Nombre</Form.Label>
                  <Form.Control
                    placeholder="Nombre"
                    value={formMascota.nombre}
                    onChange={(e) => setFormMascota({ ...formMascota, nombre: e.target.value })}
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
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Especie</Form.Label>
                  <Form.Control
                    placeholder="Especie"
                    value={formMascota.especie}
                    onChange={(e) => setFormMascota({ ...formMascota, especie: e.target.value })}
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
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Raza</Form.Label>
                  <Form.Control
                    placeholder="Raza"
                    value={formMascota.raza}
                    onChange={(e) => setFormMascota({ ...formMascota, raza: e.target.value })}
                    style={{
                      background: "#333",
                      border: "1px solid #555",
                      color: "#e0e0e0",
                      borderRadius: "6px",
                      padding: "0.6rem",
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Edad</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Edad"
                    value={formMascota.edad}
                    onChange={(e) => setFormMascota({ ...formMascota, edad: e.target.value })}
                    style={{
                      background: "#333",
                      border: "1px solid #555",
                      color: "#e0e0e0",
                      borderRadius: "6px",
                      padding: "0.6rem",
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Fecha de Nacimiento</Form.Label>
                  <Form.Control
                    type="date"
                    value={formMascota.fecha_nacimiento}
                    onChange={(e) => setFormMascota({ ...formMascota, fecha_nacimiento: e.target.value })}
                    style={{
                      background: "#333",
                      border: "1px solid #555",
                      color: "#e0e0e0",
                      borderRadius: "6px",
                      padding: "0.6rem",
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Sexo</Form.Label>
                  <Form.Control
                    placeholder="Sexo"
                    value={formMascota.sexo}
                    onChange={(e) => setFormMascota({ ...formMascota, sexo: e.target.value })}
                    style={{
                      background: "#333",
                      border: "1px solid #555",
                      color: "#e0e0e0",
                      borderRadius: "6px",
                      padding: "0.6rem",
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Peso</Form.Label>
                  <Form.Control
                    placeholder="Peso"
                    value={formMascota.peso}
                    onChange={(e) => setFormMascota({ ...formMascota, peso: e.target.value })}
                    style={{
                      background: "#333",
                      border: "1px solid #555",
                      color: "#e0e0e0",
                      borderRadius: "6px",
                      padding: "0.6rem",
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Color</Form.Label>
                  <Form.Control
                    placeholder="Color"
                    value={formMascota.color}
                    onChange={(e) => setFormMascota({ ...formMascota, color: e.target.value })}
                    style={{
                      background: "#333",
                      border: "1px solid #555",
                      color: "#e0e0e0",
                      borderRadius: "6px",
                      padding: "0.6rem",
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Button
              variant="success"
              onClick={handleAgregarMascota}
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
              <i className="bi bi-save me-2"></i>Agregar Mascota
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
