
"use client";
import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Table,
  Accordion,
  Collapse,
  Dropdown,
  Modal,
  Form,
} from "react-bootstrap";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PerfilMascota({ mascota, propietario, setView }) {
  const [mostrarInfo, setMostrarInfo] = useState(true);
  const [mascotasUsuario, setMascotasUsuario] = useState([]);
  const [mascotaActual, setMascotaActual] = useState(mascota);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalAgregar, setShowModalAgregar] = useState(false);
  const [editPropietario, setEditPropietario] = useState({ ...propietario });
  const [editMascota, setEditMascota] = useState({ ...mascota });
  const [nuevaMascota, setNuevaMascota] = useState({
    nombre: "",
    especie: "",
    raza: "",
    edad: "",
    sexo: "",
    peso: "",
    color: "",
    fecha_nacimiento: "",
  });
  const [propietarioActual, setPropietarioActual] = useState(propietario);
  const [consultas, setConsultas] = useState([]);
  const [laboratorio, setLaboratorio] = useState([]);
  const [cirugias, setCirugias] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [peluqueria, setPeluqueria] = useState([]);
  const [openExamenFisico, setOpenExamenFisico] = useState({});

  useEffect(() => {
    if (propietario?.id) {
      fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${propietario.id}`)
        .then(res => res.json())
        .then(data => setMascotasUsuario(data))
        .catch(() => setMascotasUsuario([]));
    }
  }, [propietario]);

  useEffect(() => {
    const id = mascotaActual?._id || mascotaActual?.id;
    if (!id) return;

    const cargar = (endpoint, setter) => {
      fetch(`https://mascota-service.onrender.com/api/mascotas/${endpoint}/${id}`)
        .then(res => res.json())
        .then(setter)
        .catch(() => setter([]));
    };

    cargar("consultas", setConsultas);
    cargar("labo", setLaboratorio);
    cargar("cirugias", setCirugias);
    cargar("medicamentos", setMedicamentos);
    cargar("seguimientos", setSeguimientos);
    cargar("peluqueria", setPeluqueria);
  }, [mascotaActual]);

  const guardarCambios = async () => {
    try {
      const resUser = await fetch(`https://usuarios-service-emf5.onrender.com/api/usuarios/modificarusuarios/${editPropietario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPropietario),
      });

      const resMascota = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotas/${editMascota.id || editMascota._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editMascota),
      });

      if (!resUser.ok || !resMascota.ok) {
        throw new Error("Error al guardar los cambios");
      }

      alert("✅ Datos actualizados correctamente");
      setMascotaActual({ ...editMascota });
      setPropietarioActual({ ...editPropietario });

      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${editPropietario.id}`);
      const data = await res.json();
      setMascotasUsuario(data);
      setShowModalEditar(false);
    } catch (error) {
      console.error("❌ Error al guardar cambios:", error);
      alert("Error al guardar los cambios.");
    }
  };

  const eliminarMascota = async () => {
    if (confirm("¿Estás seguro de eliminar esta mascota?")) {
      await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotas/${mascotaActual.id || mascotaActual._id}`, {
        method: "DELETE",
      });
      alert("🐾 Mascota eliminada");
      setView("consultorio");
    }
  };

  const agregarMascota = async () => {
    await fetch("https://mascota-service.onrender.com/api/mascotas/mascotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nuevaMascota, cliente_id: propietarioActual.id }),
    });
    setShowModalAgregar(false);
    setNuevaMascota({ nombre: "", especie: "", raza: "", edad: "", sexo: "", peso: "", color: "", fecha_nacimiento: "" });
    const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${propietarioActual.id}`);
    const data = await res.json();
    setMascotasUsuario(data);
  };

  const toggleExamenFisico = (id) => {
    setOpenExamenFisico((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  const renderServiceTable = (titulo, datos, fields, icon, hasExamenFisico = false) => (
    <Accordion defaultActiveKey="0" className="mb-3">
      <Accordion.Item eventKey="0" className="bg-dark text-light border border-secondary rounded shadow-sm">
        <Accordion.Header>
          <i className={`bi ${icon} me-2`}></i> {titulo}
        </Accordion.Header>
        <Accordion.Body className="p-4">
          {datos.length === 0 ? (
            <p className="text mb-0">Sin registros.</p>
          ) : (
            <Table striped bordered hover variant="dark" responsive className="mb-0">
              <thead>
                <tr>
                  {fields.map((field, i) => (
                    <th key={i} className="text-center">{field.label}</th>
                  ))}
                  {hasExamenFisico && <th className="text-center">Examen Físico</th>}
                </tr>
              </thead>
              <tbody>
                {datos.map((item, i) => (
                  <>
                    <tr key={i}>
                      {fields.map((field, j) => (
                        <td key={j} className="text-center">
                          {field.key.includes("fecha")
                            ? format(new Date(item[field.key] || item.createdAt), "dd/MM/yyyy", { locale: es })
                            : field.key === "medicamentos"
                            ? item[field.key]?.map(m => m.nombre).join(", ") || "-"
                            : item[field.key] || "-"}
                        </td>
                      ))}
                      {hasExamenFisico && (
                        <td className="text-center">
                          {item.examen_fisico && Object.values(item.examen_fisico).some(val => val) && (
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => toggleExamenFisico(item._id || item.id)}
                              style={buttonStyle}
                              {...buttonHover}
                            >
                              <i className="bi bi-eye-fill me-1"></i> Ver Examen
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                    {hasExamenFisico && item.examen_fisico && (
                      <tr>
                        <td colSpan={fields.length + 1}>
                          <Collapse in={openExamenFisico[item._id || item.id]}>
                            <div>
                              <Table striped bordered hover variant="dark" className="mt-2 mb-0">
                                <thead>
                                  <tr>
                                    {[
                                      { key: "temperatura", label: "Temperatura" },
                                      { key: "peso", label: "Peso" },
                                      { key: "frecuencia_cardiaca", label: "Frec. Cardiaca" },
                                      { key: "frecuencia_respiratoria", label: "Frec. Respiratoria" },
                                      { key: "mucosas", label: "Mucosas" },
                                      { key: "observaciones", label: "Observaciones" },
                                    ].map((field, k) => (
                                      <th key={k} className="text-center">{field.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    {[
                                      "temperatura",
                                      "peso",
                                      "frecuencia_cardiaca",
                                      "frecuencia_respiratoria",
                                      "mucosas",
                                      "observaciones",
                                    ].map((key, k) => (
                                      <td key={k} className="text-center">
                                        {item.examen_fisico[key] ? `${item.examen_fisico[key]} ${key === "temperatura" ? item.examen_fisico.unidad_temperatura : key === "peso" ? item.examen_fisico.unidad_peso : ""}` : "-"}
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </Table>
                            </div>
                          </Collapse>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </Table>
          )}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
      <Container className="text-light mt-5 p-4 bg-dark rounded shadow-lg">
        <h3 className="mb-4 d-flex align-items-center fw-bold">
          <i className="bi bi-heart-pulse me-2"></i> Perfil Médico de {mascotaActual?.nombre}
          {mascotasUsuario.length > 1 && (
            <Dropdown className="ms-3">
              <Dropdown.Toggle
                variant="info"
                size="sm"
                className="mx-1"
                style={buttonStyle}
                {...buttonHover}
              >
                <i className="bi bi-arrow-repeat me-1"></i> Cambiar
              </Dropdown.Toggle>
              <Dropdown.Menu className="bg-dark text-light border-secondary">
                {mascotasUsuario.map(m => (
                  <Dropdown.Item
                    key={m.id || m._id}
                    onClick={() => setMascotaActual(m)}
                    className="text-light"
                  >
                    {m.nombre} ({m.especie})
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </h3>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setView("consultorio")}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-arrow-left me-1"></i> Volver
          </Button>
          <Button
            variant="info"
            size="lg"
            onClick={() => setMostrarInfo(true)}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-folder-fill me-1"></i> Información General
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setView("servicios");
              localStorage.setItem("mascota_servicio", JSON.stringify(mascotaActual));
              localStorage.setItem("propietario_servicio", JSON.stringify(propietarioActual));
            }}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-clipboard-check-fill me-1"></i> Historial Médico
          </Button>
          <Button
            variant="warning"
            size="lg"
            onClick={() => setShowModalEditar(true)}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-pencil-fill me-1"></i> Editar Datos
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={eliminarMascota}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-trash-fill me-1"></i> Eliminar Mascota
          </Button>
          <Button
            variant="success"
            size="lg"
            onClick={() => setShowModalAgregar(true)}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-plus-circle-fill me-1"></i> Nueva Mascota
          </Button>
        </div>

        {mostrarInfo && (
          <Collapse in={mostrarInfo} appear mountOnEnter>
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <Card bg="dark" text="light" border="secondary" className="shadow-sm rounded p-3">
                    <Card.Header className="bg-secondary text-light">
                      <i className="bi bi-person-fill me-2"></i> Propietario
                    </Card.Header>
                    <Card.Body>
                      <p className="mb-2"><strong>Nombre:</strong> {propietarioActual?.nombre || "N/D"}</p>
                      <p className="mb-2"><strong>Correo:</strong> {propietarioActual?.correo || "N/D"}</p>
                      <p className="mb-2"><strong>Teléfono:</strong> {propietarioActual?.telefono || "N/D"}</p>
                      <p className="mb-0"><strong>Dirección:</strong> {propietarioActual?.direccion || "N/D"}</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card bg="dark" text="light" border="secondary" className="shadow-sm rounded p-3">
                    <Card.Header className="bg-secondary text-light">
                      <i className="bi bi-paw me-2"></i> Mascota
                    </Card.Header>
                    <Card.Body>
                      <p className="mb-2"><strong>Nombre:</strong> {mascotaActual?.nombre || "N/D"}</p>
                      <p className="mb-2"><strong>Especie:</strong> {mascotaActual?.especie || "N/D"}</p>
                      <p className="mb-2"><strong>Raza:</strong> {mascotaActual?.raza || "N/D"}</p>
                      <p className="mb-2"><strong>Edad:</strong> {mascotaActual?.edad || "N/D"}</p>
                      <p className="mb-2"><strong>Sexo:</strong> {mascotaActual?.sexo || "N/D"}</p>
                      <p className="mb-2"><strong>Peso:</strong> {mascotaActual?.peso ? `${mascotaActual.peso} kg` : "N/D"}</p>
                      <p className="mb-2"><strong>Color:</strong> {mascotaActual?.color || "N/D"}</p>
                      <p className="mb-0"><strong>Fecha nacimiento:</strong> {mascotaActual?.fecha_nacimiento ? format(new Date(mascotaActual.fecha_nacimiento), "dd/MM/yyyy", { locale: es }) : "N/D"}</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {renderServiceTable(
                "Consultas",
                consultas,
                [
                  { key: "fecha", label: "Fecha" },
                  { key: "motivo", label: "Motivo" },
                  { key: "objetivo", label: "Objetivo" },
                  { key: "plan_terapeutico", label: "Plan Terapéutico" },
                ],
                "bi-heart-pulse-fill",
                true
              )}
              {renderServiceTable(
                "Laboratorio",
                laboratorio,
                [
                  { key: "fecha", label: "Fecha" },
                  { key: "prueba", label: "Prueba" },
                  { key: "diagnostico_presuntivo", label: "Diagnóstico Presuntivo" },
                  { key: "encargado", label: "Encargado" },
                ],
                "bi-flask"
              )}
              {renderServiceTable(
                "Cirugías",
                cirugias,
                [
                  { key: "fecha", label: "Fecha" },
                  { key: "procedimiento", label: "Procedimiento" },
                  { key: "descripcion_quirurgica", label: "Descripción Quirúrgica" },
                  { key: "anestesico", label: "Anestésico" },
                ],
                "bi-scissors"
              )}
              {renderServiceTable(
                "Medicamentos",
                medicamentos,
                [
                  { key: "fecha", label: "Fecha" },
                  { key: "diagnostico", label: "Diagnóstico" },
                  { key: "medicamentos", label: "Medicamentos" },
                ],
                "bi-capsule"
              )}
              {renderServiceTable(
                "Seguimientos",
                seguimientos,
                [
                  { key: "fecha", label: "Fecha" },
                  { key: "tipo", label: "Tipo" },
                  { key: "motivo", label: "Motivo" },
                  { key: "detalles", label: "Detalles" },
                ],
                "bi-clipboard-check",
                true
              )}
              {renderServiceTable(
                "Peluquería",
                peluqueria,
                [
                  { key: "fecha", label: "Fecha" },
                  { key: "servicio", label: "Servicio" },
                  { key: "motivo", label: "Motivo" },
                  { key: "encargado", label: "Encargado" },
                ],
                "bi-scissors"
              )}
            </div>
          </Collapse>
        )}

        {/* Modal Editar */}
        <Modal
          show={showModalEditar}
          onHide={() => setShowModalEditar(false)}
          centered
          className="fade"
        >
          <Modal.Header closeButton className="bg-dark text-white border-secondary">
            <Modal.Title><i className="bi bi-pencil-fill me-2"></i>Editar Datos</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white">
            <Form>
              <h6 className="fw-bold"><i className="bi bi-person-fill me-2"></i>Propietario</h6>
              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  value={editPropietario.nombre}
                  onChange={e => setEditPropietario({ ...editPropietario, nombre: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Correo</Form.Label>
                <Form.Control
                  value={editPropietario.correo}
                  onChange={e => setEditPropietario({ ...editPropietario, correo: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control
                  value={editPropietario.telefono}
                  onChange={e => setEditPropietario({ ...editPropietario, telefono: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Dirección</Form.Label>
                <Form.Control
                  value={editPropietario.direccion}
                  onChange={e => setEditPropietario({ ...editPropietario, direccion: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>

              <hr className="border-secondary" />
              <h6 className="fw-bold"><i className="bi bi-paw me-2"></i>Mascota</h6>
              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  value={editMascota.nombre}
                  onChange={e => setEditMascota({ ...editMascota, nombre: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Especie</Form.Label>
                <Form.Control
                  value={editMascota.especie}
                  onChange={e => setEditMascota({ ...editMascota, especie: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Raza</Form.Label>
                <Form.Control
                  value={editMascota.raza}
                  onChange={e => setEditMascota({ ...editMascota, raza: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Edad</Form.Label>
                <Form.Control
                  value={editMascota.edad}
                  onChange={e => setEditMascota({ ...editMascota, edad: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Sexo</Form.Label>
                <Form.Control
                  value={editMascota.sexo}
                  onChange={e => setEditMascota({ ...editMascota, sexo: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Peso</Form.Label>
                <Form.Control
                  value={editMascota.peso}
                  onChange={e => setEditMascota({ ...editMascota, peso: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Color</Form.Label>
                <Form.Control
                  value={editMascota.color}
                  onChange={e => setEditMascota({ ...editMascota, color: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fecha de Nacimiento</Form.Label>
                <Form.Control
                  type="date"
                  value={editMascota.fecha_nacimiento?.slice(0, 10)}
                  onChange={e => setEditMascota({ ...editMascota, fecha_nacimiento: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
            </Form>
            <Button
              variant="success"
              size="lg"
              className="w-100"
              onClick={guardarCambios}
              style={buttonStyle}
              {...buttonHover}
            >
              <i className="bi bi-save-fill me-2"></i> Guardar Cambios
            </Button>
          </Modal.Body>
        </Modal>

        {/* Modal Agregar Mascota */}
        <Modal
          show={showModalAgregar}
          onHide={() => setShowModalAgregar(false)}
          centered
          className="fade"
        >
          <Modal.Header closeButton className="bg-dark text-white border-secondary">
            <Modal.Title><i className="bi bi-plus-circle-fill me-2"></i>Nueva Mascota</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  value={nuevaMascota.nombre}
                  onChange={e => setNuevaMascota({ ...nuevaMascota, nombre: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Especie</Form.Label>
                <Form.Control
                  value={nuevaMascota.especie}
                  onChange={e => setNuevaMascota({ ...nuevaMascota, especie: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Raza</Form.Label>
                <Form.Control
                  value={nuevaMascota.raza}
                  onChange={e => setNuevaMascota({ ...nuevaMascota, raza: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Edad</Form.Label>
                <Form.Control
                  value={nuevaMascota.edad}
                  onChange={e => setNuevaMascota({ ...nuevaMascota, edad: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Sexo</Form.Label>
                <Form.Control
                  value={nuevaMascota.sexo}
                  onChange={e => setNuevaMascota({ ...nuevaMascota, sexo: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Peso</Form.Label>
                <Form.Control
                  value={nuevaMascota.peso}
                  onChange={e => setNuevaMascota({ ...nuevaMascota, peso: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Color</Form.Label>
                <Form.Control
                  value={nuevaMascota.color}
                  onChange={e => setNuevaMascota({ ...nuevaMascota, color: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fecha de Nacimiento</Form.Label>
                <Form.Control
                  type="date"
                  value={nuevaMascota.fecha_nacimiento}
                  onChange={e => setNuevaMascota({ ...nuevaMascota, fecha_nacimiento: e.target.value })}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
            </Form>
            <Button
              variant="success"
              size="lg"
              className="w-100"
              onClick={agregarMascota}
              style={buttonStyle}
              {...buttonHover}
            >
              <i className="bi bi-plus-circle-fill me-2"></i> Agregar Mascota
            </Button>
          </Modal.Body>
        </Modal>
      </Container>
    </>
  );
}
