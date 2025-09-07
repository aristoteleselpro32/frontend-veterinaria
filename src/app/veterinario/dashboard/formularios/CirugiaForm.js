"use client";
import { useState, useEffect } from "react";
import { Form, Button, Row, Col, Modal, Alert } from "react-bootstrap";
import { parse, isValid, differenceInMinutes, format } from "date-fns";

export default function CirugiaForm({ mascota, propietario, data = {}, editar = false, onSave, onComplete, onClose }) {
  const [formData, setFormData] = useState({
    mascota_id: mascota._id || mascota.id,
    veterinario_id: "",
    fecha: data.fecha ? format(new Date(data.fecha), "yyyy-MM-dd") : new Date().toISOString().slice(0, 10),
    procedimiento: data.procedimiento || "",
    descripcion_quirurgica: data.descripcion_quirurgica || "",
    preanestesico: data.preanestesico || "",
    anestesico: data.anestesico || "",
    otros_medicamentos: data.otros_medicamentos || "",
    tratamiento: data.tratamiento || "",
    observaciones: data.observaciones || "",
    complicaciones: data.complicaciones || "",
    medicamentos: data.medicamentos || [{ nombre: "", presentacion: "", cantidad: "", posologia: "" }],
    proximo_control_fecha: data.proximo_control ? format(new Date(data.proximo_control), "yyyy-MM-dd") : "",
    proximo_control_hora: data.proximo_control ? format(new Date(data.proximo_control), "HH:mm") : "",
  });

  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [errors, setErrors] = useState({});
  const [reservas, setReservas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cirugiaGuardada, setCirugiaGuardada] = useState(false);
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

    if (["procedimiento", "fecha"].includes(name)) {
      delete newErrors[name];
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors(newErrors);
  };

  const handleMedicamentoChange = (index, e) => {
    const { name, value } = e.target;
    const nuevos = [...formData.medicamentos];
    nuevos[index][name] = value;

    let newErrors = { ...errors };
    if (name === "cantidad") {
      const validationResult = validateNumber(value);
      if (validationResult !== true) {
        newErrors[`medicamento_${index}_cantidad`] = `Medicamento ${index + 1}: Cantidad debe ser un número válido.`;
      } else {
        delete newErrors[`medicamento_${index}_cantidad`];
      }
    } else {
      delete newErrors[`medicamento_${index}_${name}`];
    }

    setFormData((prev) => ({ ...prev, medicamentos: nuevos }));
    setErrors(newErrors);
  };

  const agregarMedicamento = () => {
    setFormData((prev) => ({
      ...prev,
      medicamentos: [...prev.medicamentos, { nombre: "", presentacion: "", cantidad: "", posologia: "" }],
    }));
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

    const servicioCirugia = servicios.find((s) => s.nombre.trim().toLowerCase().includes("cirugia"));
    if (!servicioCirugia) {
      return { isValid: false, error: "❌ No se encontró el servicio de Cirugía." };
    }

    return { isValid: true, fechaHora, servicioCirugia };
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

    const { fechaHora, servicioCirugia } = validacion;

    if (!veterinario) {
      setErrors({ general: "❌ No se encontró información del veterinario. Por favor, inicia sesión nuevamente." });
      return;
    }

    const cita = {
      cliente_id: propietario.id,
      mascota_id: mascota._id || mascota.id,
      veterinario_id: veterinario.id,
      servicio_id: servicioCirugia.id,
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
      setCirugiaGuardada(false);
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
    console.log("handleSubmit ejecutado - Inicio guardado de cirugía");
    setIsSubmitting(true);
    setErrors({});

    const newErrors = {};
    if (!formData.fecha) {
      newErrors.fecha = "Fecha es obligatoria.";
    }
    if (!formData.procedimiento) {
      newErrors.procedimiento = "Procedimiento es obligatorio.";
    }

    formData.medicamentos.forEach((med, index) => {
      const validationResult = validateNumber(med.cantidad);
      if (validationResult !== true) {
        newErrors[`medicamento_${index}_cantidad`] = `Medicamento ${index + 1}: Cantidad debe ser un número válido.`;
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
      medicamentos: formData.medicamentos.map((med) => ({
        ...med,
        cantidad: med.cantidad ? parseFloat(med.cantidad) : undefined,
      })),
      proximo_control: formData.proximo_control_fecha && formData.proximo_control_hora
        ? parse(`${formData.proximo_control_fecha} ${formData.proximo_control_hora}`, "yyyy-MM-dd HH:mm", new Date())
        : undefined,
      proximo_control_fecha: undefined,
      proximo_control_hora: undefined,
    };

    try {
      if (editar) {
        if (!data._id) {
          throw new Error("ID de la cirugía no definido.");
        }
        const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/cirugias/${data._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al actualizar la cirugía");
        setErrors({ success: "✅ Cirugía actualizada con éxito." });
        setCirugiaGuardada(true);
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          console.log("Mostrando modal de confirmación para cita (editar)");
          setMostrarModalConfirmacion(true);
        } else {
          console.log("No se ingresó próximo control, cerrando formulario (editar)");
          setCirugiaGuardada(false);
          onClose();
        }
      } else {
        await onSave(payload);
        setErrors({ success: "✅ Cirugía creada con éxito." });
        setCirugiaGuardada(true);
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          console.log("Mostrando modal de confirmación para cita (crear)");
          setMostrarModalConfirmacion(true);
        } else {
          console.log("No se ingresó próximo control, completando flujo (crear)");
          setCirugiaGuardada(false);
          onComplete();
        }
      }
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setErrors({ general: `❌ Error al guardar la cirugía: ${err.message}` });
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
      setCirugiaGuardada(false);
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
        <Row>
          <Col md={6}>
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
              <Form.Label className="fw-bold"><i className="bi bi-scissors me-2"></i>Procedimiento</Form.Label>
              <Form.Control
                name="procedimiento"
                value={formData.procedimiento}
                onChange={handleChange}
                required
                className="bg-dark text-light border-secondary"
                placeholder="Nombre del procedimiento"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-prescription me-2"></i>Pre-anestésico</Form.Label>
              <Form.Control
                name="preanestesico"
                value={formData.preanestesico}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Medicamento pre-anestésico"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-syringe me-2"></i>Anestésico</Form.Label>
              <Form.Control
                name="anestesico"
                value={formData.anestesico}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Anestésico utilizado"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-capsule me-2"></i>Otros medicamentos</Form.Label>
              <Form.Control
                name="otros_medicamentos"
                value={formData.otros_medicamentos}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Otros medicamentos administrados"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-clipboard-pulse me-2"></i>Tratamiento</Form.Label>
              <Form.Control
                as="textarea"
                name="tratamiento"
                value={formData.tratamiento}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Tratamiento post-quirúrgico"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-file-text me-2"></i>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Observaciones de la cirugía"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-exclamation-triangle me-2"></i>Complicaciones</Form.Label>
              <Form.Control
                as="textarea"
                name="complicaciones"
                value={formData.complicaciones}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Complicaciones observadas"
              />
            </Form.Group>
          </Col>
        </Row>

        <hr />
        <h6 className="fw-bold"><i className="bi bi-capsule-pill me-2"></i>Medicamentos</h6>
        {formData.medicamentos.map((med, i) => (
          <Row key={i} className="mb-3">
            <Col md={3}>
              <Form.Control
                placeholder="Nombre"
                name="nombre"
                value={med.nombre}
                onChange={(e) => handleMedicamentoChange(i, e)}
                className="bg-dark text-light border-secondary"
              />
            </Col>
            <Col md={3}>
              <Form.Control
                placeholder="Presentación"
                name="presentacion"
                value={med.presentacion}
                onChange={(e) => handleMedicamentoChange(i, e)}
                className="bg-dark text-light border-secondary"
              />
            </Col>
            <Col md={3}>
              <Form.Control
                placeholder="Cantidad"
                name="cantidad"
                value={med.cantidad}
                onChange={(e) => handleMedicamentoChange(i, e)}
                type="number"
                step="0.1"
                className="bg-dark text-light border-secondary"
              />
            </Col>
            <Col md={3}>
              <Form.Control
                placeholder="Posología"
                name="posologia"
                value={med.posologia}
                onChange={(e) => handleMedicamentoChange(i, e)}
                className="bg-dark text-light border-secondary"
              />
            </Col>
          </Row>
        ))}
        <Button
          variant="secondary"
          size="sm"
          onClick={agregarMedicamento}
          className="mb-3"
          style={buttonStyle}
          {...buttonHover}
        >
          <i className="bi bi-plus-circle-fill me-2"></i>Agregar Medicamento
        </Button>

        <hr />
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
            <i className="bi bi-save-fill me-2"></i>{editar ? "Guardar Cambios" : "Guardar Cirugía"}
          </Button>
        </div>
      </Form>

      <Modal
        show={mostrarModalConfirmacion}
        onHide={() => {
          console.log("onHide modal confirmación ejecutado");
          setMostrarModalConfirmacion(false);
          setIntentoCerrar(false);
          if (cirugiaGuardada || intentoCerrar) {
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
            <i className="bi bi-x-circle-fill me-2"></i>No, solo guardar cirugía
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
