
"use client";
import { useEffect, useState } from "react";
import { Container, Table, Button, Modal, Form, Alert, Spinner, Pagination, FormControl } from "react-bootstrap";
import { format } from "date-fns";

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const veterinario = JSON.parse(localStorage.getItem("user"));

  const cargarSolicitudes = async () => {
    setIsLoading(true);
    try {
      if (!veterinario?.id) {
        throw new Error("ID del veterinario no definido.");
      }
      const res = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/solicitudes`);
      if (!res.ok) throw new Error("Error al cargar solicitudes");
      const data = await res.json();
      setSolicitudes(data || []);
      setFilteredSolicitudes(data || []);
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
      setErrors({ general: "❌ Error al cargar solicitudes: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  useEffect(() => {
    let filtered = [...solicitudes];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.mascota_nombre?.toLowerCase().includes(query) ||
          s.usuario_nombre?.toLowerCase().includes(query) ||
          s.motivo?.toLowerCase().includes(query)
      );
    }
    filtered.sort((a, b) => {
      const fieldA = a[sortField] || "";
      const fieldB = b[sortField] || "";
      if (sortField === "created_at") {
        return sortOrder === "asc"
          ? new Date(fieldA) - new Date(fieldB)
          : new Date(fieldB) - new Date(fieldA);
      }
      return sortOrder === "asc"
        ? fieldA.toString().localeCompare(fieldB.toString())
        : fieldB.toString().localeCompare(fieldA.toString());
    });
    setFilteredSolicitudes(filtered);
    setCurrentPage(1);
  }, [solicitudes, searchQuery, sortField, sortOrder]);

  const abrirEdicion = (sol) => {
    setSelected({ ...sol });
    setShowEdit(true);
    setErrors({});
  };

  const guardarCambios = async () => {
    const newErrors = {};
    if (!selected?.estado || !["pendiente", "confirmada", "rechazada"].includes(selected.estado)) {
      newErrors.estado = "Estado debe ser pendiente, confirmada o rechazada.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/solicitudes/${selected.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: selected.estado }),
        }
      );
      if (!res.ok) throw new Error("Error actualizando solicitud");
      setShowEdit(false);
      setErrors({ success: "✅ Solicitud actualizada con éxito." });
      cargarSolicitudes();
    } catch (err) {
      console.error("Error actualizando solicitud:", err);
      setErrors({ general: "❌ Error al actualizar solicitud: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const eliminarSolicitud = async (id) => {
    if (!window.confirm("¿Eliminar esta solicitud?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/solicitudes/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Error eliminando solicitud");
      setErrors({ success: "🗑 Solicitud eliminada con éxito." });
      cargarSolicitudes();
    } catch (err) {
      console.error("Error eliminando solicitud:", err);
      setErrors({ general: "❌ Error al eliminar solicitud: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSolicitudes = filteredSolicitudes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSolicitudes.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const buttonStyle = {
    borderRadius: "6px",
    padding: "0.5rem 1rem",
    fontSize: "0.9rem",
    textTransform: "capitalize",
    transition: "all 0.3s ease",
  };

  const buttonHover = {
    onMouseEnter: (e) => (e.target.style.transform = "translateY(-2px)"),
    onMouseLeave: (e) => (e.target.style.transform = "translateY(0)"),
  };

  return (
    <Container className="mt-4 text-light">
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
      <h3 className="mb-3"><i className="bi bi-file-earmark-text-fill me-2"></i>Solicitudes de Cartilla / Servicios</h3>

      {errors.success && (
        <Alert variant="success" onClose={() => setErrors({})} dismissible className="shadow-sm">
          {errors.success}
        </Alert>
      )}
      {errors.general && (
        <Alert variant="danger" onClose={() => setErrors({})} dismissible className="shadow-sm">
          {errors.general}
        </Alert>
      )}

      <Form.Group className="mb-3">
        <Form.Label className="fw-bold"><i className="bi bi-search me-2"></i>Buscar</Form.Label>
        <FormControl
          placeholder="Buscar por mascota, dueño o motivo"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-dark text-light border-secondary"
        />
      </Form.Group>

      {isLoading ? (
        <div className="text-center">
          <Spinner animation="border" variant="light" />
          <span className="ms-2">Cargando...</span>
        </div>
      ) : (
        <>
          <Table striped bordered hover variant="dark" size="sm" className="border-secondary">
            <thead>
              <tr>
                <th onClick={() => handleSort("mascota_nombre")} style={{ cursor: "pointer" }}>
                  Mascota {sortField === "mascota_nombre" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("usuario_nombre")} style={{ cursor: "pointer" }}>
                  Dueño {sortField === "usuario_nombre" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("veterinario_nombre")} style={{ cursor: "pointer" }}>
                  Veterinario {sortField === "veterinario_nombre" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("motivo")} style={{ cursor: "pointer" }}>
                  Motivo {sortField === "motivo" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("estado")} style={{ cursor: "pointer" }}>
                  Estado {sortField === "estado" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("created_at")} style={{ cursor: "pointer" }}>
                  Fecha {sortField === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentSolicitudes.length > 0 ? (
                currentSolicitudes.map((s) => (
                  <tr key={s.id}>
                    <td>{s.mascota_nombre || "N/D"}</td>
                    <td>{s.usuario_nombre || "N/D"}</td>
                    <td>{s.veterinario_nombre || "N/D"}</td>
                    <td>{s.motivo || "N/D"}</td>
                    <td>{s.estado}</td>
                    <td>{format(new Date(s.created_at), "dd/MM/yyyy")}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => abrirEdicion(s)}
                        style={buttonStyle}
                        {...buttonHover}
                      >
                        <i className="bi bi-pencil-fill me-2"></i>Editar
                      </Button>{" "}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => eliminarSolicitud(s.id)}
                        style={buttonStyle}
                        {...buttonHover}
                      >
                        <i className="bi bi-trash-fill me-2"></i>Eliminar
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    No hay solicitudes registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <Pagination className="justify-content-center mt-3">
              <Pagination.Prev
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              />
              {[...Array(totalPages)].map((_, i) => (
                <Pagination.Item
                  key={i + 1}
                  active={i + 1 === currentPage}
                  onClick={() => paginate(i + 1)}
                >
                  {i + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          )}
        </>
      )}

      <Modal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        centered
        backdrop="static"
        keyboard={false}
        className="fade"
      >
        <Modal.Header closeButton className="bg-dark text-white border-secondary">
          <Modal.Title><i className="bi bi-file-earmark-text-fill me-2"></i>Editar Solicitud</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {errors.estado && (
            <Alert variant="danger" onClose={() => setErrors({})} dismissible className="shadow-sm">
              {errors.estado}
            </Alert>
          )}
          {selected && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Mascota</Form.Label>
                <Form.Control
                  value={selected.mascota_nombre || ""}
                  disabled
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Dueño</Form.Label>
                <Form.Control
                  value={selected.usuario_nombre || ""}
                  disabled
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Veterinario</Form.Label>
                <Form.Control
                  value={selected.veterinario_nombre || ""}
                  disabled
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Motivo</Form.Label>
                <Form.Control
                  value={selected.motivo || ""}
                  disabled
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Estado</Form.Label>
                <Form.Select
                  value={selected.estado}
                  onChange={(e) => setSelected({ ...selected, estado: e.target.value })}
                  className="bg-dark text-light border-secondary"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="rechazada">Rechazada</option>
                </Form.Select>
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button
            variant="secondary"
            onClick={() => setShowEdit(false)}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-x-circle-fill me-2"></i>Cancelar
          </Button>
          <Button
            variant="success"
            onClick={guardarCambios}
            disabled={isLoading}
            style={buttonStyle}
            {...buttonHover}
          >
            {isLoading ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <i className="bi bi-save-fill me-2"></i>
            )}
            Guardar cambios
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
