"use client";
import { useEffect, useState } from "react";
import { Table, Button, Form, Modal, Alert, Spinner } from "react-bootstrap";
import axios from "axios";
import { API } from "./api";

const httpUsuarios = axios.create({
  baseURL: API.usuarios,
  headers: { "Content-Type": "application/json" },
});

const httpMascotas = axios.create({
  baseURL: API.mascotas,
  headers: { "Content-Type": "application/json" },
});

const httpCartillas = axios.create({
  baseURL: API.cartillas,
  headers: { "Content-Type": "application/json" },
});

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModalUser, setShowModalUser] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [rol, setRol] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cargando, setCargando] = useState(true);

  const [showModalMascotas, setShowModalMascotas] = useState(false);
  const [mascotas, setMascotas] = useState([]);
  const [selectedMascota, setSelectedMascota] = useState(null);
  const [showModalMascotaEdit, setShowModalMascotaEdit] = useState(false);
  const [showModalMascotaCrear, setShowModalMascotaCrear] = useState(false);

  const [mascotaNombre, setMascotaNombre] = useState("");
  const [mascotaEspecie, setMascotaEspecie] = useState("");
  const [mascotaRaza, setMascotaRaza] = useState("");
  const [mascotaEdad, setMascotaEdad] = useState("");
  const [mascotaSexo, setMascotaSexo] = useState("");
  const [mascotaColor, setMascotaColor] = useState("");
  const [mascotaPeso, setMascotaPeso] = useState("");

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setCargando(true);
    try {
      const res = await httpUsuarios.get("/obtenerusuarios");
      const usuariosData = res.data;

      // Fetch pets for each user
      const usuariosConMascotas = await Promise.all(
        usuariosData.map(async (user) => {
          try {
            const resMascotas = await httpMascotas.get(`/mascotascliente/${user.id}`);
            return { ...user, hasPets: resMascotas.data.length > 0 };
          } catch (err) {
            console.error(`Error fetching pets for user ${user.id}:`, err);
            return { ...user, hasPets: false };
          }
        })
      );
      setUsuarios(usuariosConMascotas);
      setCargando(false);
    } catch (err) {
      setError("❌ Error obteniendo usuarios.");
      console.error("Error obteniendo usuarios:", err);
      setCargando(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const crearUsuario = async () => {
    if (!nombre || !correo || !rol || (!selectedUser && !password)) {
      setError("⚠️ Todos los campos obligatorios deben estar completos.");
      return;
    }
    if (!validateEmail(correo)) {
      setError("⚠️ Formato de correo inválido.");
      return;
    }
    try {
      await httpUsuarios.post("/crearusuarios", {
        nombre,
        correo,
        password,
        telefono,
        direccion,
        rol,
      });
      fetchUsuarios();
      setShowModalUser(false);
      setSuccess("✅ Usuario creado correctamente.");
      setNombre("");
      setCorreo("");
      setPassword("");
      setTelefono("");
      setDireccion("");
      setRol("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error creando usuario.");
      console.error("Error creando usuario:", err);
    }
  };

  const actualizarUsuario = async () => {
    if (!selectedUser) return;
    if (!nombre || !correo || !rol) {
      setError("⚠️ Todos los campos obligatorios deben estar completos.");
      return;
    }
    if (!validateEmail(correo)) {
      setError("⚠️ Formato de correo inválido.");
      return;
    }
    try {
      await httpUsuarios.put(`/modificarusuarios/${selectedUser.id}`, {
        nombre,
        correo,
        password: password || undefined,
        telefono,
        direccion,
        rol,
      });
      fetchUsuarios();
      setShowModalUser(false);
      setSuccess("✅ Usuario actualizado correctamente.");
      setNombre("");
      setCorreo("");
      setPassword("");
      setTelefono("");
      setDireccion("");
      setRol("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error actualizando usuario.");
      console.error("Error actualizando usuario:", err);
    }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    try {
      await httpUsuarios.delete(`/eliminarusuarios/${id}`);
      fetchUsuarios();
      setSuccess("✅ Usuario eliminado correctamente.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error eliminando usuario.");
      console.error("Error eliminando usuario:", err);
    }
  };

  const verMascotas = async (usuario) => {
    setSelectedUser(usuario);
    setError("");
    try {
      const res = await httpMascotas.get(`/mascotascliente/${usuario.id}`);
      setMascotas(res.data);
      setShowModalMascotas(true);
    } catch (err) {
      setError("❌ No se pudieron cargar las mascotas.");
      console.error("Error obteniendo mascotas:", err);
    }
  };

  const crearMascota = async () => {
    if (!mascotaNombre || !mascotaEspecie || !mascotaEdad || !mascotaSexo || !mascotaPeso) {
      setError("⚠️ Todos los campos obligatorios deben estar completos.");
      return;
    }
    if (isNaN(parseInt(mascotaEdad)) || parseInt(mascotaEdad) < 0) {
      setError("⚠️ La edad debe ser un número positivo.");
      return;
    }
    if (isNaN(parseFloat(mascotaPeso)) || parseFloat(mascotaPeso) <= 0) {
      setError("⚠️ El peso debe ser un número positivo.");
      return;
    }
    try {
      await httpMascotas.post("/mascotas", {
        cliente_id: selectedUser.id,
        nombre: mascotaNombre,
        especie: mascotaEspecie,
        raza: mascotaRaza,
        edad: parseInt(mascotaEdad),
        sexo: mascotaSexo,
        color: mascotaColor,
        peso: parseFloat(mascotaPeso),
      });
      verMascotas(selectedUser);
      setShowModalMascotaCrear(false);
      setSuccess("✅ Mascota creada correctamente.");
      setMascotaNombre("");
      setMascotaEspecie("");
      setMascotaRaza("");
      setMascotaEdad("");
      setMascotaSexo("");
      setMascotaColor("");
      setMascotaPeso("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error creando mascota.");
      console.error("Error creando mascota:", err);
    }
  };

  const editarMascota = (mascota) => {
    setSelectedMascota(mascota);
    setMascotaNombre(mascota.nombre || "");
    setMascotaEspecie(mascota.especie || "");
    setMascotaRaza(mascota.raza || "");
    setMascotaEdad(mascota.edad || "");
    setMascotaSexo(mascota.sexo || "");
    setMascotaColor(mascota.color || "");
    setMascotaPeso(mascota.peso || "");
    setShowModalMascotaEdit(true);
  };

  const guardarMascota = async () => {
    if (!selectedMascota) return;
    if (!mascotaNombre || !mascotaEspecie || !mascotaEdad || !mascotaSexo || !mascotaPeso) {
      setError("⚠️ Todos los campos obligatorios deben estar completos.");
      return;
    }
    if (isNaN(parseInt(mascotaEdad)) || parseInt(mascotaEdad) < 0) {
      setError("⚠️ La edad debe ser un número positivo.");
      return;
    }
    if (isNaN(parseFloat(mascotaPeso)) || parseFloat(mascotaPeso) <= 0) {
      setError("⚠️ El peso debe ser un número positivo.");
      return;
    }
    try {
      await httpMascotas.put(`/mascotas/${selectedMascota.id}`, {
        nombre: mascotaNombre,
        especie: mascotaEspecie,
        raza: mascotaRaza,
        edad: parseInt(mascotaEdad),
        sexo: mascotaSexo,
        color: mascotaColor,
        peso: parseFloat(mascotaPeso),
      });
      verMascotas(selectedUser);
      setShowModalMascotaEdit(false);
      setSuccess("✅ Mascota actualizada correctamente.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error actualizando mascota.");
      console.error("Error actualizando mascota:", err);
    }
  };

  const eliminarMascota = async (id) => {
    if (!window.confirm("¿Eliminar esta mascota?")) return;
    try {
      await httpMascotas.delete(`/mascotas/${id}`);
      verMascotas(selectedUser);
      setSuccess("✅ Mascota eliminada correctamente.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error eliminando mascota.");
      console.error("Error eliminando mascota:", err);
    }
  };

  const crearCartilla = async (mascota_id) => {
    if (!window.confirm("¿Crear cartilla para esta mascota?")) return;
    try {
      await httpCartillas.post("/cartilla", { mascota_id });
      setSuccess("✅ Cartilla creada correctamente.");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error creando cartilla.");
    }
  };

  const eliminarCartilla = async (mascota_id) => {
    if (!window.confirm("¿Eliminar la cartilla de esta mascota?")) return;
    try {
      await httpCartillas.delete(`/cartilla/${mascota_id}`);
      setSuccess("✅ Cartilla eliminada correctamente.");
    } catch (err) {
      setError(err.response?.data?.error || "❌ Error eliminando cartilla.");
    }
  };

  const verCartilla = async (mascota_id) => {
    try {
      const res = await httpCartillas.get(`/cartilla/${mascota_id}`);
      setSuccess("📋 Cartilla encontrada.");
    } catch (err) {
      if (err.response?.status === 404) {
        crearCartilla(mascota_id);
      } else {
        setError(err.response?.data?.error || "❌ Error al verificar cartilla.");
      }
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
          <i className="bi bi-people me-2"></i>Lista de Usuarios
        </h2>
        <Button
          variant="success"
          onClick={() => {
            setSelectedUser(null);
            setNombre("");
            setCorreo("");
            setPassword("");
            setTelefono("");
            setDireccion("");
            setRol("");
            setShowModalUser(true);
            setError("");
            setSuccess("");
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
          <i className="bi bi-person-plus me-2"></i>Agregar Usuario
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
      {success && (
        <Alert
          variant="success"
          onClose={() => setSuccess("")}
          dismissible
          style={{ borderRadius: "6px", fontSize: "0.9rem" }}
        >
          {success}
        </Alert>
      )}

      {cargando ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <Spinner animation="border" variant="light" />
          <p style={{ marginTop: "0.5rem", color: "#e0e0e0" }}>
            Cargando usuarios...
          </p>
        </div>
      ) : usuarios.length === 0 ? (
        <p style={{ color: "#e0e0e0" }}>No hay usuarios registrados.</p>
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
              <th style={{ padding: "1rem" }}><i className="bi bi-person me-2"></i>Nombre</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-envelope me-2"></i>Correo</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-telephone me-2"></i>Teléfono</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-geo-alt me-2"></i>Dirección</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-person-badge me-2"></i>Rol</th>
              <th style={{ padding: "1rem" }}><i className="bi bi-gear me-2"></i>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr
                key={user.id}
                style={{
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3a3a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{user.nombre}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{user.correo}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{user.telefono || "N/A"}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{user.direccion || "N/A"}</td>
                <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{user.rol}</td>
                <td style={{ padding: "0.8rem" }}>
                  {user.hasPets && (
                    <Button
                      variant="info"
                      size="sm"
                      className="me-2"
                      onClick={() => verMascotas(user)}
                      style={{
                        borderRadius: "6px",
                        padding: "0.4rem 0.8rem",
                        fontWeight: 500,
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                    >
                      <i className="bi bi-paw me-2"></i>Mascotas
                    </Button>
                  )}
                  <Button
                    variant="warning"
                    size="sm"
                    className="me-2"
                    onClick={() => {
                      setSelectedUser(user);
                      setNombre(user.nombre);
                      setCorreo(user.correo);
                      setPassword("");
                      setTelefono(user.telefono || "");
                      setDireccion(user.direccion || "");
                      setRol(user.rol);
                      setShowModalUser(true);
                      setError("");
                      setSuccess("");
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
                    <i className="bi bi-pencil me-2"></i>Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => eliminarUsuario(user.id)}
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

      {/* Modal Crear/Editar Usuario */}
      <Modal
        show={showModalUser}
        onHide={() => setShowModalUser(false)}
        centered
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            {selectedUser ? "Editar Usuario" : "Crear Usuario"}
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
          {success && (
            <Alert
              variant="success"
              onClose={() => setSuccess("")}
              dismissible
              style={{ borderRadius: "6px", fontSize: "0.9rem" }}
            >
              {success}
            </Alert>
          )}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Correo *</Form.Label>
              <Form.Control
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>
                Contraseña {selectedUser ? "(opcional)" : "*"}
              </Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!selectedUser}
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
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
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
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Rol *</Form.Label>
              <Form.Select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              >
                <option value="">Seleccionar rol</option>
                <option value="admin">Admin</option>
                <option value="usuario">Usuario</option>
              </Form.Select>
            </Form.Group>
            <Button
              variant="success"
              onClick={selectedUser ? actualizarUsuario : crearUsuario}
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
              {selectedUser ? "Actualizar" : "Crear"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal Mascotas */}
      <Modal
        show={showModalMascotas}
        onHide={() => setShowModalMascotas(false)}
        size="lg"
        centered
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            Mascotas de {selectedUser && selectedUser.nombre}
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
          {success && (
            <Alert
              variant="success"
              onClose={() => setSuccess("")}
              dismissible
              style={{ borderRadius: "6px", fontSize: "0.9rem" }}
            >
              {success}
            </Alert>
          )}
          <Button
            variant="success"
            onClick={() => {
              setMascotaNombre("");
              setMascotaEspecie("");
              setMascotaRaza("");
              setMascotaEdad("");
              setMascotaSexo("");
              setMascotaColor("");
              setMascotaPeso("");
              setShowModalMascotaCrear(true);
              setError("");
              setSuccess("");
            }}
            style={{
              borderRadius: "8px",
              padding: "0.6rem 1.2rem",
              fontWeight: 500,
              transition: "all 0.3s ease",
              marginBottom: "1rem",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            <i className="bi bi-plus-circle me-2"></i>Crear Mascota
          </Button>
          {mascotas.length === 0 ? (
            <p style={{ color: "#e0e0e0" }}>No hay mascotas registradas para este usuario.</p>
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
                  <th style={{ padding: "1rem" }}><i className="bi bi-paw me-2"></i>Nombre</th>
                  <th style={{ padding: "1rem" }}><i className="bi bi-tags me-2"></i>Especie</th>
                  <th style={{ padding: "1rem" }}><i className="bi bi-bookmark me-2"></i>Raza</th>
                  <th style={{ padding: "1rem" }}><i className="bi bi-clock me-2"></i>Edad</th>
                  <th style={{ padding: "1rem" }}><i className="bi bi-gender-ambiguous me-2"></i>Sexo</th>
                  <th style={{ padding: "1rem" }}><i className="bi bi-gear me-2"></i>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mascotas.map((m) => (
                  <tr
                    key={m.id}
                    style={{
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3a3a")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{m.nombre}</td>
                    <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{m.especie}</td>
                    <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{m.raza || "N/A"}</td>
                    <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{m.edad}</td>
                    <td style={{ padding: "0.8rem", color: "#e0e0e0" }}>{m.sexo}</td>
                    <td style={{ padding: "0.8rem" }}>
                      <Button
                        variant="warning"
                        size="sm"
                        className="me-2"
                        onClick={() => editarMascota(m)}
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
                        className="me-2"
                        onClick={() => eliminarMascota(m.id)}
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
                      <Button
                        variant="info"
                        size="sm"
                        className="me-2"
                        onClick={() => verCartilla(m.id)}
                        style={{
                          borderRadius: "6px",
                          padding: "0.4rem 0.8rem",
                          fontWeight: 500,
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                        onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                      >
                        <i className="bi bi-clipboard-check me-2"></i>Cartilla
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => eliminarCartilla(m.id)}
                        style={{
                          borderRadius: "6px",
                          padding: "0.4rem 0.8rem",
                          fontWeight: 500,
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
                        onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                      >
                        <i className="bi bi-trash3 me-2"></i>Eliminar Cartilla
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer style={{ background: "#2c2c2c", borderTop: "1px solid #444" }}>
          <Button
            variant="secondary"
            onClick={() => setShowModalMascotas(false)}
            style={{
              borderRadius: "8px",
              padding: "0.6rem 1.2rem",
              fontWeight: 500,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Editar Mascota */}
      <Modal
        show={showModalMascotaEdit}
        onHide={() => setShowModalMascotaEdit(false)}
        centered
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            Editar Mascota
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
          {success && (
            <Alert
              variant="success"
              onClose={() => setSuccess("")}
              dismissible
              style={{ borderRadius: "6px", fontSize: "0.9rem" }}
            >
              {success}
            </Alert>
          )}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Nombre *</Form.Label>
              <Form.Control
                value={mascotaNombre}
                onChange={(e) => setMascotaNombre(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Especie *</Form.Label>
              <Form.Control
                value={mascotaEspecie}
                onChange={(e) => setMascotaEspecie(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Raza</Form.Label>
              <Form.Control
                value={mascotaRaza}
                onChange={(e) => setMascotaRaza(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Edad *</Form.Label>
              <Form.Control
                type="number"
                value={mascotaEdad}
                onChange={(e) => setMascotaEdad(e.target.value)}
                required
                min="0"
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Sexo *</Form.Label>
              <Form.Select
                value={mascotaSexo}
                onChange={(e) => setMascotaSexo(e.target.value)}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              >
                <option value="">Seleccionar sexo</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Color</Form.Label>
              <Form.Control
                value={mascotaColor}
                onChange={(e) => setMascotaColor(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Peso (kg) *</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={mascotaPeso}
                onChange={(e) => setMascotaPeso(e.target.value)}
                required
                min="0"
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
              onClick={guardarMascota}
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

      {/* Modal Crear Mascota */}
      <Modal
        show={showModalMascotaCrear}
        onHide={() => setShowModalMascotaCrear(false)}
        centered
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{ background: "#2c2c2c", borderBottom: "1px solid #444", color: "#ffffff" }}
        >
          <Modal.Title style={{ fontSize: "1.4rem", fontWeight: 600 }}>
            Crear Mascota
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
          {success && (
            <Alert
              variant="success"
              onClose={() => setSuccess("")}
              dismissible
              style={{ borderRadius: "6px", fontSize: "0.9rem" }}
            >
              {success}
            </Alert>
          )}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Nombre *</Form.Label>
              <Form.Control
                value={mascotaNombre}
                onChange={(e) => setMascotaNombre(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Especie *</Form.Label>
              <Form.Control
                value={mascotaEspecie}
                onChange={(e) => setMascotaEspecie(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Raza</Form.Label>
              <Form.Control
                value={mascotaRaza}
                onChange={(e) => setMascotaRaza(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Edad *</Form.Label>
              <Form.Control
                type="number"
                value={mascotaEdad}
                onChange={(e) => setMascotaEdad(e.target.value)}
                required
                min="0"
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Sexo *</Form.Label>
              <Form.Select
                value={mascotaSexo}
                onChange={(e) => setMascotaSexo(e.target.value)}
                required
                style={{
                  background: "#333",
                  border: "1px solid #555",
                  color: "#e0e0e0",
                  borderRadius: "6px",
                  padding: "0.6rem",
                }}
              >
                <option value="">Seleccionar sexo</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Color</Form.Label>
              <Form.Control
                value={mascotaColor}
                onChange={(e) => setMascotaColor(e.target.value)}
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
              <Form.Label style={{ color: "#e0e0e0", fontWeight: 500 }}>Peso (kg) *</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={mascotaPeso}
                onChange={(e) => setMascotaPeso(e.target.value)}
                required
                min="0"
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
              onClick={crearMascota}
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
              <i className="bi bi-save me-2"></i>Crear
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
