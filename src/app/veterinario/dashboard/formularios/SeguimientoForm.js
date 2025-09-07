
"use client";
import { useState, useEffect } from "react";
import { Form, Button, Row, Col, Modal, Alert } from "react-bootstrap";
import { parse, isValid, differenceInMinutes, format } from "date-fns";

export default function SeguimientoForm({ mascota, propietario, data = {}, editar = false, onSave, onComplete, onClose }) {
  const [formData, setFormData] = useState({
    mascota_id: mascota._id || mascota.id,
    veterinario_id: "",
    fecha: data.fecha ? format(new Date(data.fecha), "yyyy-MM-dd") : new Date().toISOString().slice(0, 10),
    tipo: data.tipo || "",
    motivo: data.motivo || "",
    detalles: data.detalles || "",
    proximo_control_fecha: data.proximo_control ? format(new Date(data.proximo_control), "yyyy-MM-dd") : "",
    proximo_control_hora: data.proximo_control ? format(new Date(data.proximo_control), "HH:mm") : "",
    examen_fisico: {
      temperatura: data.examen_fisico?.temperatura || "",
      unidad_temperatura: data.examen_fisico?.unidad_temperatura || "°C",
      peso: data.examen_fisico?.peso || "",
      unidad_peso: data.examen_fisico?.unidad_peso || "kg",
      frecuencia_cardiaca: data.examen_fisico?.frecuencia_cardiaca || "",
      frecuencia_respiratoria: data.examen_fisico?.frecuencia_respiratoria || "",
      presion_arterial: data.examen_fisico?.presion_arterial || "",
      reflejos: data.examen_fisico?.reflejos || "",
      pulso: data.examen_fisico?.pulso || "",
      mucosas: data.examen_fisico?.mucosas || "",
      palpitacion: data.examen_fisico?.palpitacion || "",
      dentadura: data.examen_fisico?.dentadura || "",
      encias: data.examen_fisico?.encias || "",
      sarro: data.examen_fisico?.sarro || "",
      ojos: data.examen_fisico?.ojos || "",
      orejas: data.examen_fisico?.orejas || "",
      piel_y_pelo: data.examen_fisico?.piel_y_pelo || "",
      observaciones: data.examen_fisico?.observaciones || "",
    },
  });

  const [mostrarExamenFisico, setMostrarExamenFisico] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [errors, setErrors] = useState({});
  const [reservas, setReservas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seguimientoGuardado, setSeguimientoGuardado] = useState(false);
  const [intentoCerrar, setIntentoCerrar] = useState(false);

  const veterinario = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const cargarReservas = async () => {
      try {
        if (!veterinario?.id) {
          throw new Error("ID del veterinario no definido.");
        }
        const res = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/veterinario/${veterinario.id}`);
        const data = await res.json();
        const transformadas = data.map((r) => ({ ...r, fecha: new Date(r.fecha) }));
        setReservas(transformadas);
      } catch (err) {
        console.error("Error cargando reservas:", err);
        setErrors({ general: "❌ Error cargando reservas: " + err.message });
      }
    };
    if (veterinario?.id) {
      cargarReservas();
    }
  }, [veterinario?.id]);

  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios");
        const data = await res.json();
        setServicios(data);
      } catch (err) {
        console.error("Error cargando servicios:", err);
        setErrors({ general: "❌ Error cargando servicios: " + err.message });
      }
    };
    cargarServicios();
  }, []);

  const validateNumber = (value) => {
    if (value === "") return true; // Allow empty fields (optional)
    const regex = /^\d*\.?\d*$/;
    return regex.test(value) && !isNaN(parseFloat(value)) ? true : "Debe ser un número válido.";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };

    if (["tipo", "fecha"].includes(name)) {
      delete newErrors[name];
    } else if (["temperatura", "peso", "frecuencia_cardiaca", "frecuencia_respiratoria", "presion_arterial"].includes(name)) {
      const validationResult = validateNumber(value);
      if (validationResult !== true) {
        newErrors[name] = `${name.charAt(0).toUpperCase() + name.slice(1).replace("_", " ")}: Debe ser un número válido.`;
      } else {
        delete newErrors[name];
      }
    }

    if (name in formData.examen_fisico) {
      setFormData((prev) => ({
        ...prev,
        examen_fisico: { ...prev.examen_fisico, [name]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors(newErrors);
  };

  const validarCita = () => {
    const { proximo_control_fecha, proximo_control_hora } = formData;

    if (!proximo_control_fecha || !proximo_control_hora) {
      return { isValid: false, error: "⚠️ Debes ingresar la fecha y hora del próximo control." };
    }

    const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(proximo_control_hora)) {
      return { isValid: false, error: "⚠️ La hora ingresada no es válida (formato HH:mm)." };
    }

    const fechaHora = parse(`${proximo_control_fecha} ${proximo_control_hora}`, "yyyy-MM-dd HH:mm", new Date());
    if (!isValid(fechaHora)) {
      return { isValid: false, error: "⚠️ Fecha u hora inválida." };
    }

    const hora = fechaHora.getHours();
    if (hora < 7 || hora >= 21) {
      return {
        isValid: false,
        error: "⚠️ Solo se pueden agendar citas entre las 07:00 y las 21:00.",
      };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaHora < hoy) {
      return { isValid: false, error: "⚠️ No puedes agendar citas en fechas pasadas." };
    }

    const conflicto = reservas.some((r) => {
      const diff = Math.abs(differenceInMinutes(fechaHora, new Date(r.fecha)));
      return diff < 60;
    });

    if (conflicto) {
      return { isValid: false, error: "⚠️ Ya hay una cita dentro del rango de 1 hora." };
    }

    const servicioSeguimiento = servicios.find((s) => s.nombre.trim().toLowerCase().includes("seguimiento"));
    if (!servicioSeguimiento) {
      return { isValid: false, error: "❌ No se encontró el servicio de Seguimiento." };
    }

    return { isValid: true, fechaHora, servicioSeguimiento };
  };

  const agendarCita = async () => {
    console.log("agendarCita ejecutado", {
      fecha: formData.proximo_control_fecha,
      hora: formData.proximo_control_hora,
    });
    setErrors({});

    const validacion = validarCita();
    if (!validacion.isValid) {
      setErrors({ general: validacion.error });
      return;
    }

    const { fechaHora, servicioSeguimiento } = validacion;

    if (!veterinario) {
      setErrors({ general: "❌ No se encontró información del veterinario. Por favor, inicia sesión nuevamente." });
      return;
    }

    const cita = {
      cliente_id: propietario.id,
      mascota_id: mascota._id || mascota.id,
      veterinario_id: veterinario.id,
      servicio_id: servicioSeguimiento.id,
      fecha: format(fechaHora, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    };

    try {
      setIsSubmitting(true);
      const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cita),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al agendar cita");

      console.log("Cita agendada con éxito");
      setErrors({ success: "✅ Cita agendada con éxito." });
      setMostrarModalConfirmacion(false);
      setIntentoCerrar(false);
      setSeguimientoGuardado(false);
      if (editar) {
        onClose();
      } else {
        onComplete();
      }
    } catch (err) {
      console.error("Error en agendarCita:", err);
      setErrors({ general: "❌ Error al agendar cita: " + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("handleSubmit ejecutado - Inicio guardado de seguimiento");
    setIsSubmitting(true);
    setErrors({});

    const newErrors = {};
    if (!formData.fecha) {
      newErrors.fecha = "Fecha es obligatoria.";
    }
    if (!formData.tipo) {
      newErrors.tipo = "Tipo es obligatorio.";
    }

    ["temperatura", "peso", "frecuencia_cardiaca", "frecuencia_respiratoria", "presion_arterial"].forEach((field) => {
      const validationResult = validateNumber(formData.examen_fisico[field]);
      if (validationResult !== true) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ")}: Debe ser un número válido.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    if (!veterinario) {
      setErrors({ general: "❌ No se encontró información del veterinario. Por favor, inicia sesión nuevamente." });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      veterinario_id: veterinario.id,
      examen_fisico: {
        ...formData.examen_fisico,
        temperatura: formData.examen_fisico.temperatura ? parseFloat(formData.examen_fisico.temperatura) : undefined,
        peso: formData.examen_fisico.peso ? parseFloat(formData.examen_fisico.peso) : undefined,
        frecuencia_cardiaca: formData.examen_fisico.frecuencia_cardiaca ? parseFloat(formData.examen_fisico.frecuencia_cardiaca) : undefined,
        frecuencia_respiratoria: formData.examen_fisico.frecuencia_respiratoria ? parseFloat(formData.examen_fisico.frecuencia_respiratoria) : undefined,
        presion_arterial: formData.examen_fisico.presion_arterial ? parseFloat(formData.examen_fisico.presion_arterial) : undefined,
      },
      proximo_control: formData.proximo_control_fecha && formData.proximo_control_hora
        ? parse(`${formData.proximo_control_fecha} ${formData.proximo_control_hora}`, "yyyy-MM-dd HH:mm", new Date())
        : undefined,
      proximo_control_fecha: undefined,
      proximo_control_hora: undefined,
    };

    try {
      if (editar) {
        if (!data._id) {
          throw new Error("ID del seguimiento no definido.");
        }
        const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/seguimientos/${data._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al actualizar el seguimiento");
        setErrors({ success: "✅ Seguimiento actualizado con éxito." });
        setSeguimientoGuardado(true);
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          console.log("Mostrando modal de confirmación para cita (editar)");
          setMostrarModalConfirmacion(true);
        } else {
          console.log("No se ingresó próximo control, cerrando formulario (editar)");
          setSeguimientoGuardado(false);
          onClose();
        }
      } else {
        await onSave(payload);
        setErrors({ success: "✅ Seguimiento creado con éxito." });
        setSeguimientoGuardado(true);
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          console.log("Mostrando modal de confirmación para cita (crear)");
          setMostrarModalConfirmacion(true);
        } else {
          console.log("No se ingresó próximo control, completando flujo (crear)");
          setSeguimientoGuardado(false);
          onComplete();
        }
      }
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setErrors({ general: `❌ Error al guardar el seguimiento: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrar = () => {
    console.log("handleCerrar ejecutado", {
      proximo_control_fecha: formData.proximo_control_fecha,
      proximo_control_hora: formData.proximo_control_hora,
    });
    setIntentoCerrar(true);

    if (formData.proximo_control_fecha && formData.proximo_control_hora) {
      console.log("Mostrando modal de confirmación antes de cerrar");
      setMostrarModalConfirmacion(true);
    } else {
      console.log("No se ingresó próximo control, cerrando formulario");
      setIntentoCerrar(false);
      setSeguimientoGuardado(false);
      if (editar) {
        onClose();
      } else {
        onComplete();
      }
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

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
      <Form onSubmit={handleSubmit}>
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
        {Object.keys(errors).length > 0 && !errors.success && !errors.general && (
          <Alert variant="danger" onClose={() => setErrors({})} dismissible className="shadow-sm">
            <ul className="mb-0">
              {Object.values(errors).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </Alert>
        )}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-file-medical me-2"></i>Tipo</Form.Label>
              <Form.Control
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
                className="bg-dark text-light border-secondary"
                placeholder="Tipo de seguimiento"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-calendar-event me-2"></i>Fecha</Form.Label>
              <Form.Control
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                required
                className="bg-dark text-light border-secondary"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-chat-square-text me-2"></i>Motivo</Form.Label>
              <Form.Control
                name="motivo"
                as="textarea"
                value={formData.motivo}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Motivo del seguimiento"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-file-text me-2"></i>Detalles</Form.Label>
              <Form.Control
                name="detalles"
                as="textarea"
                value={formData.detalles}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Detalles del seguimiento"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <h6 className="fw-bold"><i className="bi bi-calendar-fill me-2"></i>Próximo Control</h6>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold">Fecha</Form.Label>
                  <Form.Control
                    type="date"
                    name="proximo_control_fecha"
                    value={formData.proximo_control_fecha}
                    onChange={handleChange}
                    className="bg-dark text-light border-secondary"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold">Hora</Form.Label>
                  <Form.Control
                    type="time"
                    name="proximo_control_hora"
                    value={formData.proximo_control_hora}
                    onChange={handleChange}
                    className="bg-dark text-light border-secondary"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMostrarExamenFisico(true)}
              className="mb-3"
              style={buttonStyle}
              {...buttonHover}
            >
              <i className="bi bi-heart-pulse-fill me-2"></i>Editar Examen Físico
            </Button>
          </Col>
        </Row>

        <div className="d-flex justify-content-end mt-3">
          <Button
            variant="secondary"
            onClick={handleCerrar}
            className="me-2"
            disabled={isSubmitting}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-x-circle-fill me-2"></i>Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-save-fill me-2"></i>{editar ? "Guardar Cambios" : "Guardar Seguimiento"}
          </Button>
        </div>
      </Form>

      <Modal
        show={mostrarExamenFisico}
        onHide={() => setMostrarExamenFisico(false)}
        backdrop="static"
        keyboard={false}
        centered
        className="fade"
      >
        <Modal.Header closeButton className="bg-dark text-white border-secondary">
          <Modal.Title><i className="bi bi-heart-pulse-fill me-2"></i>Examen Físico</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Temperatura</Form.Label>
                <Form.Control
                  name="temperatura"
                  type="number"
                  step="0.1"
                  value={formData.examen_fisico.temperatura}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Ej. 38.5"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Unidad de Temperatura</Form.Label>
                <Form.Select
                  name="unidad_temperatura"
                  value={formData.examen_fisico.unidad_temperatura}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                >
                  <option value="°C">°C</option>
                  <option value="°F">°F</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Peso</Form.Label>
                <Form.Control
                  name="peso"
                  type="number"
                  step="0.1"
                  value={formData.examen_fisico.peso}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Ej. 10.5"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Unidad de Peso</Form.Label>
                <Form.Select
                  name="unidad_peso"
                  value={formData.examen_fisico.unidad_peso}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Frecuencia Cardíaca</Form.Label>
                <Form.Control
                  name="frecuencia_cardiaca"
                  type="number"
                  value={formData.examen_fisico.frecuencia_cardiaca}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Ej. 80"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Frecuencia Respiratoria</Form.Label>
                <Form.Control
                  name="frecuencia_respiratoria"
                  type="number"
                  value={formData.examen_fisico.frecuencia_respiratoria}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Ej. 20"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Presión Arterial</Form.Label>
                <Form.Control
                  name="presion_arterial"
                  type="number"
                  value={formData.examen_fisico.presion_arterial}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Ej. 120"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Reflejos</Form.Label>
                <Form.Control
                  name="reflejos"
                  value={formData.examen_fisico.reflejos}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Estado de los reflejos"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Pulso</Form.Label>
                <Form.Control
                  name="pulso"
                  value={formData.examen_fisico.pulso}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Calidad del pulso"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Mucosas</Form.Label>
                <Form.Control
                  name="mucosas"
                  value={formData.examen_fisico.mucosas}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Estado de las mucosas"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Palpitación</Form.Label>
                <Form.Control
                  name="palpitacion"
                  value={formData.examen_fisico.palpitacion}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Observaciones de palpitación"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Dentadura</Form.Label>
                <Form.Control
                  name="dentadura"
                  value={formData.examen_fisico.dentadura}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Estado de la dentadura"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Encías</Form.Label>
                <Form.Control
                  name="encias"
                  value={formData.examen_fisico.encias}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Estado de las encías"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Sarro</Form.Label>
                <Form.Control
                  name="sarro"
                  value={formData.examen_fisico.sarro}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Presencia de sarro"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Ojos</Form.Label>
                <Form.Control
                  name="ojos"
                  value={formData.examen_fisico.ojos}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Estado de los ojos"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Orejas</Form.Label>
                <Form.Control
                  name="orejas"
                  value={formData.examen_fisico.orejas}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Estado de las orejas"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Piel y Pelo</Form.Label>
                <Form.Control
                  name="piel_y_pelo"
                  value={formData.examen_fisico.piel_y_pelo}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Estado de piel y pelo"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Observaciones</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="observaciones"
                  value={formData.examen_fisico.observaciones}
                  onChange={handleChange}
                  className="bg-dark text-light border-secondary"
                  placeholder="Observaciones adicionales"
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button
            variant="secondary"
            onClick={() => setMostrarExamenFisico(false)}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-x-circle-fill me-2"></i>Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => setMostrarExamenFisico(false)}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-save-fill me-2"></i>Guardar Examen
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={mostrarModalConfirmacion}
        onHide={() => {
          console.log("onHide modal confirmación ejecutado");
          setMostrarModalConfirmacion(false);
          setIntentoCerrar(false);
          if (seguimientoGuardado || intentoCerrar) {
            if (editar) {
              onClose();
            } else {
              onComplete();
            }
          }
        }}
        backdrop="static"
        keyboard={false}
        centered
        className="fade"
      >
        <Modal.Header closeButton className="bg-dark text-white border-secondary">
          <Modal.Title><i className="bi bi-calendar-check-fill me-2"></i>Confirmar cita</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          ¿Deseas agendar una cita para el próximo control en {formData.proximo_control_fecha} a las{" "}
          {formData.proximo_control_hora}?
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button
            variant="secondary"
            onClick={() => {
              console.log("Botón 'No' clicado");
              setMostrarModalConfirmacion(false);
              setIntentoCerrar(false);
              if (editar) {
                onClose();
              } else {
                onComplete();
              }
            }}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-x-circle-fill me-2"></i>No, solo guardar seguimiento
          </Button>
          <Button
            variant="success"
            onClick={() => {
              console.log("Botón 'Sí' clicado");
              agendarCita();
            }}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-check-circle-fill me-2"></i>Sí, agendar cita
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
