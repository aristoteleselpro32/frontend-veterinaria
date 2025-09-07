"use client";
import { useState, useEffect } from "react";
import { Container, Row, Col, ListGroup, Table, Button, Modal, Collapse, Alert, Spinner } from "react-bootstrap";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // <-- IMPORT CORRECTO

import CirugiaForm from "./formularios/CirugiaForm";
import ConsultaForm from "./formularios/ConsultaForm";
import LaboratorioForm from "./formularios/LaboratorioForm";
import MedicamentoForm from "./formularios/MedicamentoForm";
import SeguimientoForm from "./formularios/SeguimientoForm";
import PeluqueriaForm from "./formularios/PeluqueriaForm";

export default function ServiciosMascota({ setView }) {
  const mascota = JSON.parse(localStorage.getItem("mascota_servicio"));
  const propietario = JSON.parse(localStorage.getItem("propietario_servicio"));
  const [servicioSeleccionado, setServicioSeleccionado] = useState("consultas");
  const [data, setData] = useState([]);
  const [modalVer, setModalVer] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [servicioActual, setServicioActual] = useState(null);
  const [openExamenFisico, setOpenExamenFisico] = useState({});
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/${servicioSeleccionado}/${mascota._id || mascota.id}`);
      if (!res.ok) throw new Error("Error al cargar datos");
      const newData = await res.json();
      setData(newData || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setData([]);
      setAlertMsg({ type: "danger", text: "❌ Error al cargar datos: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [servicioSeleccionado]);

  const handleGuardar = async (nuevo) => {
    console.log("handleGuardar ejecutado en ServiciosMascota", nuevo);
    setLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/${servicioSeleccionado}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nuevo, mascota_id: mascota._id || mascota.id }),
      });
      if (!res.ok) throw new Error("Error al guardar el servicio");
      await fetchData();
      setAlertMsg({ type: "success", text: "✅ Servicio creado correctamente." });
    } catch (err) {
      console.error("Error en handleGuardar:", err);
      setAlertMsg({ type: "danger", text: "❌ Error al guardar el servicio: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCompletar = () => {
    console.log("handleCompletar ejecutado, cerrando modalCrear");
    setModalCrear(false);
    fetchData();
  };

  const handleEditar = async (editado) => {
    console.log("handleEditar ejecutado en ServiciosMascota", editado);
    setLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/${servicioSeleccionado}/${servicioActual._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editado),
      });
      if (!res.ok) throw new Error("Error al editar el servicio");
      await fetchData();
      setModalEditar(false);
      setAlertMsg({ type: "success", text: "✅ Servicio actualizado correctamente." });
    } catch (err) {
      console.error("Error en handleEditar:", err);
      setAlertMsg({ type: "danger", text: "❌ Error al editar el servicio: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return;
    setLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/${servicioSeleccionado}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar el servicio");
      await fetchData();
      setAlertMsg({ type: "success", text: "🗑 Servicio eliminado correctamente." });
    } catch (err) {
      console.error("Error en handleEliminar:", err);
      setAlertMsg({ type: "danger", text: "❌ Error al eliminar el servicio: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleExamenFisico = (id) => {
    setOpenExamenFisico((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 📄 FUNCIÓN PARA GENERAR PDF (usa autoTable(doc, ...))
  const handleImprimir = async (item) => {
    try {
      const doc = new jsPDF();

      // Cargar logo desde URL y convertir a base64
      const logoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNBUhLy6fYf34vlOEpIaGj2h76BzQhhjg89w&s";
      const logoImg = await fetch(logoUrl)
        .then(res => res.blob())
        .then(blob => new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        }));

      doc.addImage(logoImg, "PNG", 10, 10, 20, 20); // logo pequeño esquina

      // Encabezado
      doc.setFontSize(16);
      doc.text("VIDAPETS", 105, 20, { align: "center" });
      doc.setFontSize(10);
      doc.text("JJ3J+27 Chulchucani, Carrasco", 105, 26, { align: "center" });
      doc.text("+59160371104 - lokiangelo21@gmail.com", 105, 31, { align: "center" });
      doc.line(10, 40, 200, 40);

      // Datos propietario
      doc.setFontSize(12);
      doc.text("Datos de Propietario", 10, 50);
      doc.setFontSize(10);
      doc.text(`Nombre: ${propietario.nombre}`, 10, 56);
      doc.text(`Identificación: ${propietario.identificacion || "-"}`, 10, 61);
      doc.text(`Teléfono: ${propietario.telefono}`, 10, 66);
      doc.text(`Email: ${propietario.email || "-"}`, 10, 71);

      // Datos mascota
      doc.setFontSize(12);
      doc.text("Datos de Mascota", 10, 82);
      doc.setFontSize(10);
      doc.text(`Nombre: ${mascota.nombre}`, 10, 88);
      doc.text(`Especie: ${mascota.especie} | Raza: ${mascota.raza}`, 10, 93);
      doc.text(`Género: ${mascota.genero} | Color: ${mascota.color}`, 10, 98);
      doc.text(`Talla: ${mascota.talla} | Estado Reproductivo: ${mascota.estado_reproductivo}`, 10, 103);
      doc.text(`Edad: ${mascota.edad}`, 10, 108);

      // Servicio
      doc.setFontSize(12);
      doc.text(`Servicio: ${servicioSeleccionado}`, 10, 120);

      // Tabla del servicio
      const fields = serviceFields[servicioSeleccionado] || [];
      const head = [fields.map(f => f.label)];
      const body = [fields.map(f => {
        if (f.key.includes("fecha")) {
          return format(new Date(item[f.key] || item.createdAt), "dd/MM/yyyy", { locale: es });
        }
        if (f.key === "medicamentos") {
          return item[f.key]?.map(m => m.nombre).join(", ") || "-";
        }
        return item[f.key] || "-";
      })];

      // <- USAR autoTable(doc, opciones) en lugar de doc.autoTable(...)
      autoTable(doc, {
        startY: 130,
        head,
        body,
      });

      // Footer
      doc.setFontSize(8);
      doc.text("vidapets", 105, 290, { align: "center" });

      doc.save(`${servicioSeleccionado}_${mascota.nombre}.pdf`);
    } catch (err) {
      console.error("Error generando PDF:", err);
      setAlertMsg({ type: "danger", text: "❌ Error al generar PDF: " + (err.message || err) });
    }
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

  const renderFormulario = (modo, data = {}) => {
    const props = {
      mascota,
      propietario,
      data,
      editar: modo === "editar",
      onSave: modo === "editar" ? handleEditar : handleGuardar,
      onComplete: handleCompletar,
      onClose: () => {
        console.log("onClose ejecutado desde ServiciosMascota");
        setModalCrear(false);
        setModalEditar(false);
        fetchData();
      },
    };
    switch (servicioSeleccionado) {
      case "consultas":
        return <ConsultaForm {...props} />;
      case "labo":
        return <LaboratorioForm {...props} />;
      case "cirugias":
        return <CirugiaForm {...props} />;
      case "medicamentos":
        return <MedicamentoForm {...props} />;
      case "seguimientos":
        return <SeguimientoForm {...props} />;
      case "peluqueria":
        return <PeluqueriaForm {...props} />;
      default:
        return <div>Error: Servicio no válido</div>;
    }
  };

  const serviceFields = {
    consultas: [
      { key: "fecha", label: "Fecha" },
      { key: "motivo", label: "Motivo" },
      { key: "objetivo", label: "Objetivo" },
      { key: "plan_terapeutico", label: "Plan Terapéutico" },
    ],
    labo: [
      { key: "fecha", label: "Fecha" },
      { key: "prueba", label: "Prueba" },
      { key: "diagnostico_presuntivo", label: "Diagnóstico Presuntivo" },
      { key: "encargado", label: "Encargado" },
    ],
    cirugias: [
      { key: "fecha", label: "Fecha" },
      { key: "procedimiento", label: "Procedimiento" },
      { key: "descripcion_quirurgica", label: "Descripción Quirúrgica" },
      { key: "anestesico", label: "Anestésico" },
    ],
    medicamentos: [
      { key: "fecha", label: "Fecha" },
      { key: "diagnostico", label: "Diagnóstico" },
      { key: "medicamentos", label: "Medicamentos" },
    ],
    seguimientos: [
      { key: "fecha", label: "Fecha" },
      { key: "tipo", label: "Tipo" },
      { key: "motivo", label: "Motivo" },
      { key: "detalles", label: "Detalles" },
    ],
    peluqueria: [
      { key: "fecha", label: "Fecha" },
      { key: "servicio", label: "Servicio" },
      { key: "motivo", label: "Motivo" },
      { key: "encargado", label: "Encargado" },
    ],
  };

  const renderTable = () => {
    const fields = serviceFields[servicioSeleccionado] || [];
    const hasExamenFisico = ["consultas", "seguimientos"].includes(servicioSeleccionado);

    return (
      <Table striped bordered hover variant="dark" responsive className="mb-0" style={{ borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr>
            {fields.map((field, i) => (
              <th key={i} className="text-center">
                <i className={`bi bi-${field.key === "fecha" ? "calendar-event" : "clipboard-check"} me-2`}></i>
                {field.label}
              </th>
            ))}
            {hasExamenFisico && (
              <th className="text-center">
                <i className="bi bi-heart-pulse-fill me-2"></i>Examen Físico
              </th>
            )}
            <th className="text-center">
              <i className="bi bi-gear-fill me-2"></i>Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={fields.length + (hasExamenFisico ? 2 : 1)} className="text-center">
                <Spinner animation="border" variant="light" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={fields.length + (hasExamenFisico ? 2 : 1)} className="text-center text-muted">
                Sin registros
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <>
                <tr
                  key={idx}
                  style={{ cursor: "pointer", transition: "background 0.2s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3a3a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
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
                  <td className="text-center">
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() => handleImprimir(item)}
                      style={buttonStyle}
                      {...buttonHover}
                    >
                      <i className="bi bi-printer-fill me-1"></i>
                    </Button>{" "}
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => {
                        setServicioActual(item);
                        setModalEditar(true);
                      }}
                      style={buttonStyle}
                      {...buttonHover}
                    >
                      <i className="bi bi-pencil-fill me-1"></i>
                    </Button>{" "}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleEliminar(item._id || item.id)}
                      style={buttonStyle}
                      {...buttonHover}
                    >
                      <i className="bi bi-trash-fill me-1"></i>
                    </Button>
                  </td>
                </tr>
                {hasExamenFisico && item.examen_fisico && (
                  <tr>
                    <td colSpan={fields.length + 2}>
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
            ))
          )}
        </tbody>
      </Table>
    );
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
      <Container className="text-light mt-5 p-4 bg-dark rounded shadow-lg">
        {alertMsg && (
          <Alert
            variant={alertMsg.type}
            onClose={() => setAlertMsg(null)}
            dismissible
            className="shadow-sm"
          >
            {alertMsg.text}
          </Alert>
        )}
        <div className="d-flex align-items-center mb-4">
          <Button
            variant="secondary"
            onClick={() => setView("perfilMascota")}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-arrow-left me-1"></i> Volver
          </Button>
          <h3 className="ms-3 mb-0 fw-bold">
            <i className="bi bi-clipboard-check-fill me-2"></i> Servicios de {mascota?.nombre}
          </h3>
        </div>
        <Row>
          <Col md={3}>
            <ListGroup className="bg-dark border-secondary shadow-sm rounded">
              {[
                { key: "consultas", label: "🩺 Consultas", icon: "bi-heart-pulse-fill" },
                { key: "labo", label: "🧪 Laboratorio", icon: "bi-flask" },
                { key: "cirugias", label: "🔪 Cirugías", icon: "bi-scissors" },
                { key: "medicamentos", label: "💊 Medicamentos", icon: "bi-capsule" },
                { key: "seguimientos", label: "📋 Seguimientos", icon: "bi-clipboard-check" },
                { key: "peluqueria", label: "✂️ Peluquería", icon: "bi-scissors" },
              ].map(serv => (
                <ListGroup.Item
                  key={serv.key}
                  action
                  active={servicioSeleccionado === serv.key}
                  onClick={() => setServicioSeleccionado(serv.key)}
                  className={`text-light ${servicioSeleccionado === serv.key ? "bg-primary" : "bg-dark"} border-secondary`}
                  style={{ cursor: "pointer", transition: "background 0.2s ease" }}
                >
                  <i className={`bi ${serv.icon} me-2`}></i>
                  {serv.label}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>
          <Col md={9}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-capitalize">
                <i className="bi bi-folder-fill me-2"></i>
                {servicioSeleccionado}
              </h5>
              <Button
                variant="success"
                onClick={() => setModalCrear(true)}
                style={buttonStyle}
                {...buttonHover}
              >
                <i className="bi bi-plus-circle-fill me-1"></i> Nuevo
              </Button>
            </div>
            {renderTable()}
          </Col>
        </Row>

        <Modal show={modalCrear} onHide={() => setModalCrear(false)} size="xl" centered className="fade">
          <Modal.Header closeButton className="bg-dark text-white border-secondary">
            <Modal.Title>
              <i className="bi bi-plus-circle-fill me-2"></i> Crear
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {renderFormulario("crear")}
          </Modal.Body>
        </Modal>

        <Modal show={modalEditar} onHide={() => setModalEditar(false)} size="xl" centered className="fade">
          <Modal.Header closeButton className="bg-dark text-white border-secondary">
            <Modal.Title>
              <i className="bi bi-pencil-fill me-2"></i> Editar
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {renderFormulario("editar", servicioActual)}
          </Modal.Body>
        </Modal>
      </Container>
    </>
  );
}
