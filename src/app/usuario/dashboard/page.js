"use client";
import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Dropdown,
  Table,
  Modal,
  Form,
  Alert,
  Accordion,
  Collapse,
} from "react-bootstrap";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function UsuarioDashboard() {
  const [mascotas, setMascotas] = useState([]);
  const [mascotaActual, setMascotaActual] = useState(null);
  const [servicios, setServicios] = useState({});
  const [vista, setVista] = useState("perfil"); // "perfil" | "cartilla"
  const [cartilla, setCartilla] = useState(null);
  const [mensajeCartilla, setMensajeCartilla] = useState("");
  const [showModalAgregar, setShowModalAgregar] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalSolicitar, setShowModalSolicitar] = useState(false);
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
  const [editMascota, setEditMascota] = useState(null);
  const [veterinarios, setVeterinarios] = useState([]);
  const [solicitud, setSolicitud] = useState({ veterinario_id: "", motivo: "" });
  const [alertMsg, setAlertMsg] = useState(null);
  const [openExamenFisico, setOpenExamenFisico] = useState({});
  const [theme, setTheme] = useState("dark"); // Estado para el tema

  // Detectar tema del sistema o localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-bs-theme", initialTheme);
    localStorage.setItem("theme", initialTheme);
  }, []);

  // Cambiar tema
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-bs-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Cargar mascotas
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;
    fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setMascotas(data || []);
        if ((data || []).length > 0) setMascotaActual(data[0]);
      })
      .catch((e) => console.error("Error cargando mascotas:", e));
  }, []);

  // Cargar servicios y cartilla
  useEffect(() => {
    if (!mascotaActual) return;

    const endpoints = [
      { key: "consultas", label: "🩺 Consultas" },
      { key: "labo", label: "🧪 Laboratorio" },
      { key: "cirugias", label: "🔪 Cirugías" },
      { key: "medicamentos", label: "💊 Medicamentos" },
      { key: "seguimientos", label: "📋 Seguimientos" },
      { key: "peluqueria", label: "✂️ Peluquería" },
    ];

    endpoints.forEach((ep) => {
      fetch(`https://mascota-service.onrender.com/api/mascotas/${ep.key}/${mascotaActual.id || mascotaActual._id}`)
        .then((r) => r.json())
        .then((data) => setServicios((prev) => ({ ...prev, [ep.key]: data || [] })))
        .catch(() => setServicios((prev) => ({ ...prev, [ep.key]: [] })));
    });

    fetch(`https://cartillas-service.onrender.com/api/cartillas/cartilla/${mascotaActual.id || mascotaActual._id}`)
      .then((res) => {
        if (res.status === 404) {
          setCartilla(null);
          setMensajeCartilla("❌ Esta mascota no tiene una cartilla aún.");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setCartilla(data);
          setMensajeCartilla("");
        }
      })
      .catch(() => setMensajeCartilla("⚠️ Error al obtener la cartilla."));
  }, [mascotaActual]);

  // Cargar veterinarios
  useEffect(() => {
    fetch("https://usuarios-service-emf5.onrender.com/api/usuarios/obtenerusuarios")
      .then((r) => r.json())
      .then((users) => {
        const vets = (users || []).filter((u) => u.rol === "veterinario" || u.rol === "veterinario_admin");
        setVeterinarios(vets);
      })
      .catch(() => setVeterinarios([]));
  }, []);

  // Funciones para manejar mascotas y solicitudes
  const agregarMascota = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await fetch("https://mascota-service.onrender.com/api/mascotas/mascotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nuevaMascota, cliente_id: user.id }),
      });
      if (!res.ok) throw new Error("Error creando mascota");
      setShowModalAgregar(false);
      const r = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${user.id}`);
      const data = await r.json();
      setMascotas(data || []);
      if ((data || []).length > 0) setMascotaActual(data[0]);
      setNuevaMascota({
        nombre: "",
        especie: "",
        raza: "",
        edad: "",
        sexo: "",
        peso: "",
        color: "",
        fecha_nacimiento: "",
      });
      setAlertMsg({ type: "success", text: "✅ Mascota creada." });
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: "danger", text: "❌ Error creando mascota." });
    }
  };

  const abrirEditarMascota = (m) => {
    setEditMascota({ ...(m || mascotaActual) });
    setShowModalEditar(true);
  };

  const guardarEdicion = async () => {
    try {
      const id = editMascota.id || editMascota._id;
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editMascota),
      });
      if (!res.ok) throw new Error("Error actualizando mascota");
      const user = JSON.parse(localStorage.getItem("user"));
      const r = await fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${user.id}`);
      const data = await r.json();
      setMascotas(data || []);
      const actualizado = (data || []).find((x) => (x.id || x._id) === id) || editMascota;
      setMascotaActual(actualizado);
      setShowModalEditar(false);
      setAlertMsg({ type: "success", text: "✅ Datos de mascota actualizados." });
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: "danger", text: "❌ Error al guardar cambios." });
    }
  };

  const abrirSolicitarCartilla = () => {
    setSolicitud({ veterinario_id: veterinarios[0]?.id || veterinarios[0]?._id || "", motivo: "" });
    setShowModalSolicitar(true);
  };

  const enviarSolicitudCartilla = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) {
        setAlertMsg({ type: "warning", text: "Por favor inicia sesión antes de solicitar una cartilla." });
        setShowModalSolicitar(false);
        return;
      }
      if (!mascotaActual) {
        setAlertMsg({ type: "warning", text: "Selecciona una mascota antes." });
        return;
      }
      const payload = {
        usuario_id: user.id,
        mascota_id: mascotaActual.id || mascotaActual._id,
        veterinario_id: solicitud.veterinario_id,
        motivo: solicitud.motivo,
        estado: "pendiente",
        created_at: new Date().toISOString(),
      };
      const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error creando solicitud");
      }
      setShowModalSolicitar(false);
      setAlertMsg({ type: "success", text: "✅ Solicitud enviada." });
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: "danger", text: "❌ Error al enviar solicitud (backend no implementado?)." });
    }
  };

  const mascotaNombre = (m) => (m ? `${m.nombre} (${m.especie})` : "Sin mascota");

  // Estilos dinámicos para botones
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

  // Estilos dinámicos según el tema
  const themeStyles = {
    light: {
      containerBg: "#ffffff",
      textColor: "var(--bs-dark)",
      cardBg: "#f8f9fa",
      borderColor: "#dee2e6",
      accordionBg: "#ffffff",
      tableVariant: "light",
      modalBg: "#ffffff",
      modalText: "var(--bs-dark)",
      modalBorder: "#dee2e6",
    },
    dark: {
      containerBg: "#111827",
      textColor: "var(--bs-light)",
      cardBg: "#1f2937",
      borderColor: "#4b5563",
      accordionBg: "#1f2937",
      tableVariant: "dark",
      modalBg: "#1f2937",
      modalText: "var(--bs-light)",
      modalBorder: "#4b5563",
    },
  };

  const currentTheme = themeStyles[theme];

  const renderServiceTable = (titulo, datos, fields, icon, hasExamenFisico = false) => (
    <Accordion defaultActiveKey="0" className="mb-3">
      <Accordion.Item
        eventKey="0"
        style={{
          backgroundColor: currentTheme.accordionBg,
          color: currentTheme.textColor,
          borderColor: currentTheme.borderColor,
        }}
        className="rounded shadow-sm"
      >
        <Accordion.Header>
          <i className={`bi ${icon} me-2`}></i> {titulo}
        </Accordion.Header>
        <Accordion.Body className="p-4">
          {datos.length === 0 ? (
            <p style={{ color: currentTheme.textColor }} className="mb-0">Sin registros.</p>
          ) : (
            <Table
              striped
              bordered
              hover
              variant={currentTheme.tableVariant}
              responsive
              className="mb-0"
            >
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
                            ? item[field.key]?.map((m) => m.nombre).join(", ") || "-"
                            : item[field.key] || "-"}
                        </td>
                      ))}
                      {hasExamenFisico && (
                        <td className="text-center">
                          {item.examen_fisico && Object.values(item.examen_fisico).some((val) => val) && (
                            <Button
                              variant={theme === "dark" ? "info" : "primary"}
                              size="sm"
                              onClick={() =>
                                setOpenExamenFisico((prev) => ({
                                  ...prev,
                                  [item._id || item.id]: !prev[item._id || item.id],
                                }))
                              }
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
                              <Table
                                striped
                                bordered
                                hover
                                variant={currentTheme.tableVariant}
                                className="mt-2 mb-0"
                              >
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
                                        {item.examen_fisico[key]
                                          ? `${item.examen_fisico[key]} ${
                                              key === "temperatura"
                                                ? item.examen_fisico.unidad_temperatura
                                                : key === "peso"
                                                ? item.examen_fisico.unidad_peso
                                                : ""
                                            }`
                                          : "-"}
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
      <Container
        className="mt-5 p-4 rounded shadow-lg"
        style={{
          backgroundColor: currentTheme.containerBg,
          color: currentTheme.textColor,
          transition: "all 0.3s ease",
        }}
      >
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

        <div className="mb-4 d-flex flex-wrap gap-2 align-items-center">
          <Button
            variant={theme === "dark" ? "secondary" : "outline-secondary"}
            onClick={() => (window.location.href = "/")}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-arrow-left me-1"></i> Volver
          </Button>
          <Button
            variant={vista === "perfil" ? "info" : theme === "dark" ? "secondary" : "outline-secondary"}
            onClick={() => setVista("perfil")}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-folder-fill me-1"></i> Información
          </Button>
          <Button
            variant={vista === "cartilla" ? "info" : theme === "dark" ? "secondary" : "outline-secondary"}
            onClick={() => setVista("cartilla")}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-clipboard-check-fill me-1"></i> Cartilla
          </Button>
          <Button
            variant="warning"
            onClick={() => abrirEditarMascota(mascotaActual)}
            disabled={!mascotaActual}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-pencil-fill me-1"></i> Editar
          </Button>
          <Button
            variant="primary"
            onClick={abrirSolicitarCartilla}
            disabled={!mascotaActual}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-envelope-fill me-1"></i> Solicitudes
          </Button>
          <Button
            variant="success"
            onClick={() => setShowModalAgregar(true)}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-plus-circle-fill me-1"></i> Agregar Mascota
          </Button>
          <Button
            variant={theme === "dark" ? "outline-light" : "outline-dark"}
            onClick={toggleTheme}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className={`bi bi-${theme === "dark" ? "sun-fill" : "moon-fill"} me-1`}></i>
            {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          </Button>
          {mascotas.length > 1 && (
            <Dropdown className="ms-auto">
              <Dropdown.Toggle
                variant="info"
                size="sm"
                style={buttonStyle}
                {...buttonHover}
              >
                <i className="bi bi-arrow-repeat me-1"></i>{" "}
                {mascotaActual ? mascotaNombre(mascotaActual) : "Seleccionar mascota"}
              </Dropdown.Toggle>
              <Dropdown.Menu
                style={{
                  backgroundColor: currentTheme.cardBg,
                  color: currentTheme.textColor,
                  borderColor: currentTheme.borderColor,
                }}
              >
                {mascotas.map((m) => (
                  <Dropdown.Item
                    key={m.id || m._id}
                    onClick={() => setMascotaActual(m)}
                    style={{ color: currentTheme.textColor }}
                  >
                    {mascotaNombre(m)}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>

        {vista === "perfil" && mascotaActual && (
          <>
            <h3 className="mb-4 fw-bold" style={{ color: currentTheme.textColor }}>
              <i className="bi bi-paw me-2"></i> Perfil de {mascotaActual.nombre}
            </h3>
            <Card
              style={{
                backgroundColor: currentTheme.cardBg,
                color: currentTheme.textColor,
                borderColor: currentTheme.borderColor,
              }}
              className="mb-4 shadow-sm rounded p-3"
            >
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <p className="mb-2">
                      <strong>Especie:</strong> {mascotaActual.especie || "N/D"}
                    </p>
                    <p className="mb-2">
                      <strong>Raza:</strong> {mascotaActual.raza || "N/D"}
                    </p>
                    <p className="mb-2">
                      <strong>Edad:</strong> {mascotaActual.edad ?? "N/D"}
                    </p>
                  </Col>
                  <Col md={6}>
                    <p className="mb-2">
                      <strong>Sexo:</strong> {mascotaActual.sexo || "N/D"}
                    </p>
                    <p className="mb-2">
                      <strong>Peso:</strong>{" "}
                      {mascotaActual.peso ? `${mascotaActual.peso} kg` : "N/D"}
                    </p>
                    <p className="mb-2">
                      <strong>Color:</strong> {mascotaActual.color || "N/D"}
                    </p>
                    <p className="mb-0">
                      <strong>Fecha nacimiento:</strong>{" "}
                      {mascotaActual.fecha_nacimiento
                        ? format(new Date(mascotaActual.fecha_nacimiento), "dd/MM/yyyy", { locale: es })
                        : "N/D"}
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {renderServiceTable(
              "Consultas",
              servicios.consultas || [],
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
              servicios.labo || [],
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
              servicios.cirugias || [],
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
              servicios.medicamentos || [],
              [
                { key: "fecha", label: "Fecha" },
                { key: "diagnostico", label: "Diagnóstico" },
                { key: "medicamentos", label: "Medicamentos" },
              ],
              "bi-capsule"
            )}
            {renderServiceTable(
              "Seguimientos",
              servicios.seguimientos || [],
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
              servicios.peluqueria || [],
              [
                { key: "fecha", label: "Fecha" },
                { key: "servicio", label: "Servicio" },
                { key: "motivo", label: "Motivo" },
                { key: "encargado", label: "Encargado" },
              ],
              "bi-scissors"
            )}
          </>
        )}

        {vista === "cartilla" && (
          <div>
            <h3 className="mb-4 fw-bold" style={{ color: currentTheme.textColor }}>
              <i className="bi bi-clipboard-check-fill me-2"></i> Cartilla Sanitaria de{" "}
              {mascotaActual?.nombre}
            </h3>
            {mensajeCartilla && (
              <Alert variant="warning" className="shadow-sm">
                {mensajeCartilla}
              </Alert>
            )}
            {cartilla ? (
              <div
                className="p-4 rounded shadow-sm"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  color: currentTheme.textColor,
                  borderColor: currentTheme.borderColor,
                }}
              >
                <Row>
                  <Col md={6}>
                    <h5 className="text-warning fw-bold">
                      <i className="bi bi-syringe me-2"></i> Vacunas
                    </h5>
                    <Table
                      striped
                      bordered
                      hover
                      variant={currentTheme.tableVariant}
                      responsive
                      className="mb-0"
                    >
                      <thead>
                        <tr>
                          <th className="text-center">Nombre</th>
                          <th className="text-center">Aplicación</th>
                          <th className="text-center">Refuerzo</th>
                          <th className="text-center">Firma</th>
                          <th className="text-center">Etiqueta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartilla.vacunas.map((v, i) => (
                          <tr key={v._id || i}>
                            <td className="text-center">{v.nombre}</td>
                            <td className="text-center">
                              {format(new Date(v.fecha_aplicacion), "dd/MM/yyyy", { locale: es })}
                            </td>
                            <td className="text-center">
                              {v.fecha_refuerzo
                                ? format(new Date(v.fecha_refuerzo), "dd/MM/yyyy", { locale: es })
                                : "-"}
                            </td>
                            <td className="text-center">{v.firma_veterinario}</td>
                            <td className="text-center">
                              {v.etiqueta_vacuna ? (
                                <img src={v.etiqueta_vacuna} width="70" alt="Etiqueta" className="rounded" />
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <h5 className="text-warning fw-bold">
                      <i className="bi bi-capsule me-2"></i> Antiparasitarios
                    </h5>
                    <Table
                      striped
                      bordered
                      hover
                      variant={currentTheme.tableVariant}
                      responsive
                      className="mb-0"
                    >
                      <thead>
                        <tr>
                          <th className="text-center">Aplicación</th>
                          <th className="text-center">Peso</th>
                          <th className="text-center">Producto</th>
                          <th className="text-center">Próxima</th>
                          <th className="text-center">Firma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartilla.desparasitaciones.map((d, i) => (
                          <tr key={d._id || i}>
                            <td className="text-center">
                              {format(new Date(d.fecha_aplicacion), "dd/MM/yyyy", { locale: es })}
                            </td>
                            <td className="text-center">{d.peso_mascota} kg</td>
                            <td className="text-center">{d.nombre_producto}</td>
                            <td className="text-center">
                              {d.proxima_aplicacion
                                ? format(new Date(d.proxima_aplicacion), "dd/MM/yyyy", { locale: es })
                                : "-"}
                            </td>
                            <td className="text-center">{d.firma_veterinario}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Col>
                </Row>
              </div>
            ) : (
              <p style={{ color: currentTheme.textColor }}>No hay cartilla disponible.</p>
            )}
          </div>
        )}

        <Modal
          show={showModalAgregar}
          onHide={() => setShowModalAgregar(false)}
          centered
          className="fade"
        >
          <Modal.Header
            closeButton
            style={{
              backgroundColor: currentTheme.modalBg,
              color: currentTheme.modalText,
              borderColor: currentTheme.modalBorder,
            }}
          >
            <Modal.Title>
              <i className="bi bi-plus-circle-fill me-2"></i> Nueva Mascota
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{
              backgroundColor: currentTheme.modalBg,
              color: currentTheme.modalText,
            }}
          >
            <Form>
              {Object.keys(nuevaMascota).map((campo, i) => (
                <Form.Group key={i} className="mb-3">
                  <Form.Label className="fw-bold" style={{ textTransform: "capitalize" }}>
                    {campo.replace("_", " ")}
                  </Form.Label>
                  <Form.Control
                    type={campo.includes("fecha") ? "date" : "text"}
                    value={nuevaMascota[campo]}
                    onChange={(e) =>
                      setNuevaMascota({ ...nuevaMascota, [campo]: e.target.value })
                    }
                    style={{
                      backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                      color: currentTheme.modalText,
                      borderColor: currentTheme.modalBorder,
                    }}
                  />
                </Form.Group>
              ))}
            </Form>
            <Button
              variant="success"
              className="w-100"
              onClick={agregarMascota}
              style={buttonStyle}
              {...buttonHover}
            >
              <i className="bi bi-plus-circle-fill me-2"></i> Agregar
            </Button>
          </Modal.Body>
        </Modal>

        <Modal
          show={showModalEditar}
          onHide={() => setShowModalEditar(false)}
          centered
          className="fade"
        >
          <Modal.Header
            closeButton
            style={{
              backgroundColor: currentTheme.modalBg,
              color: currentTheme.modalText,
              borderColor: currentTheme.modalBorder,
            }}
          >
            <Modal.Title>
              <i className="bi bi-pencil-fill me-2"></i> Editar Mascota
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{
              backgroundColor: currentTheme.modalBg,
              color: currentTheme.modalText,
            }}
          >
            {editMascota ? (
              <>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Nombre</Form.Label>
                    <Form.Control
                      value={editMascota.nombre || ""}
                      onChange={(e) =>
                        setEditMascota({ ...editMascota, nombre: e.target.value })
                      }
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                        color: currentTheme.modalText,
                        borderColor: currentTheme.modalBorder,
                      }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Especie</Form.Label>
                    <Form.Control
                      value={editMascota.especie || ""}
                      onChange={(e) =>
                        setEditMascota({ ...editMascota, especie: e.target.value })
                      }
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                        color: currentTheme.modalText,
                        borderColor: currentTheme.modalBorder,
                      }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Raza</Form.Label>
                    <Form.Control
                      value={editMascota.raza || ""}
                      onChange={(e) =>
                        setEditMascota({ ...editMascota, raza: e.target.value })
                      }
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                        color: currentTheme.modalText,
                        borderColor: currentTheme.modalBorder,
                      }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Edad</Form.Label>
                    <Form.Control
                      value={editMascota.edad || ""}
                      onChange={(e) =>
                        setEditMascota({ ...editMascota, edad: e.target.value })
                      }
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                        color: currentTheme.modalText,
                        borderColor: currentTheme.modalBorder,
                      }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Sexo</Form.Label>
                    <Form.Control
                      value={editMascota.sexo || ""}
                      onChange={(e) =>
                        setEditMascota({ ...editMascota, sexo: e.target.value })
                      }
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                        color: currentTheme.modalText,
                        borderColor: currentTheme.modalBorder,
                      }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Peso</Form.Label>
                    <Form.Control
                      value={editMascota.peso || ""}
                      onChange={(e) =>
                        setEditMascota({ ...editMascota, peso: e.target.value })
                      }
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                        color: currentTheme.modalText,
                        borderColor: currentTheme.modalBorder,
                      }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Color</Form.Label>
                    <Form.Control
                      value={editMascota.color || ""}
                      onChange={(e) =>
                        setEditMascota({ ...editMascota, color: e.target.value })
                      }
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                        color: currentTheme.modalText,
                        borderColor: currentTheme.modalBorder,
                      }}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Fecha de nacimiento</Form.Label>
                    <Form.Control
                      type="date"
                      value={(editMascota.fecha_nacimiento || "").slice(0, 10)}
                      onChange={(e) =>
                        setEditMascota({ ...editMascota, fecha_nacimiento: e.target.value })
                      }
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                        color: currentTheme.modalText,
                        borderColor: currentTheme.modalBorder,
                      }}
                    />
                  </Form.Group>
                </Form>
                <Button
                  variant="success"
                  className="w-100"
                  onClick={guardarEdicion}
                  style={buttonStyle}
                  {...buttonHover}
                >
                  <i className="bi bi-save-fill me-2"></i> Guardar
                </Button>
              </>
            ) : (
              <p style={{ color: currentTheme.textColor }}>Cargando...</p>
            )}
          </Modal.Body>
        </Modal>

        <Modal
          show={showModalSolicitar}
          onHide={() => setShowModalSolicitar(false)}
          centered
          className="fade"
        >
          <Modal.Header
            closeButton
            style={{
              backgroundColor: currentTheme.modalBg,
              color: currentTheme.modalText,
              borderColor: currentTheme.modalBorder,
            }}
          >
            <Modal.Title>
              <i className="bi bi-envelope-fill me-2"></i> Solicitar Cartilla
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{
              backgroundColor: currentTheme.modalBg,
              color: currentTheme.modalText,
            }}
          >
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Cliente (auto)</Form.Label>
                <Form.Control
                  value={JSON.parse(localStorage.getItem("user"))?.nombre || ""}
                  disabled
                  style={{
                    backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                    color: currentTheme.modalText,
                    borderColor: currentTheme.modalBorder,
                  }}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Mascota (auto)</Form.Label>
                <Form.Control
                  value={mascotaActual?.nombre || ""}
                  disabled
                  style={{
                    backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                    color: currentTheme.modalText,
                    borderColor: currentTheme.modalBorder,
                  }}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Veterinario</Form.Label>
                <Form.Select
                  value={solicitud.veterinario_id}
                  onChange={(e) =>
                    setSolicitud({ ...solicitud, veterinario_id: e.target.value })
                  }
                  style={{
                    backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                    color: currentTheme.modalText,
                    borderColor: currentTheme.modalBorder,
                  }}
                >
                  <option value="">Selecciona un veterinario</option>
                  {veterinarios.map((v) => (
                    <option key={v.id || v._id} value={v.id || v._id}>
                      {v.nombre} {v.apellido ? `(${v.apellido})` : ""}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Motivo / Observación</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={solicitud.motivo}
                  onChange={(e) =>
                    setSolicitud({ ...solicitud, motivo: e.target.value })
                  }
                  style={{
                    backgroundColor: theme === "dark" ? "#2d3748" : "#ffffff",
                    color: currentTheme.modalText,
                    borderColor: currentTheme.modalBorder,
                  }}
                />
              </Form.Group>
            </Form>
            <Button
              variant="primary"
              className="w-100"
              onClick={enviarSolicitudCartilla}
              style={buttonStyle}
              {...buttonHover}
            >
              <i className="bi bi-envelope-fill me-2"></i> Enviar Solicitud
            </Button>
          </Modal.Body>
        </Modal>
      </Container>
    </>
  );
}