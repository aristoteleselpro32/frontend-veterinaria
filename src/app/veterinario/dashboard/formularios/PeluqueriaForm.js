"use client";
import { useState, useEffect } from "react";
import { Form, Button, Row, Col, Modal, Alert } from "react-bootstrap";
import { parse, isValid, differenceInMinutes, format } from "date-fns";

export default function PeluqueriaForm({ mascota, propietario, data = {}, editar = false, onSave, onComplete, onClose }) {
  const [formData, setFormData] = useState({
    mascota_id: mascota._id || mascota.id,
    veterinario_id: "",
    fecha: data.fecha ? format(new Date(data.fecha), "yyyy-MM-dd") : new Date().toISOString().slice(0, 10),
    servicio: data.servicio || "",
    motivo: data.motivo || "",
    encargado: data.encargado || "",
    detalles: data.detalles || "",
    observaciones: data.observaciones || "",
    proximo_control_fecha: data.proximo_control ? format(new Date(data.proximo_control), "yyyy-MM-dd") : "",
    proximo_control_hora: data.proximo_control ? format(new Date(data.proximo_control), "HH:mm") : "",
  });

  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [errors, setErrors] = useState({});
  const [reservas, setReservas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [peluqueriaGuardada, setPeluqueriaGuardada] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };

    if (["fecha", "servicio"].includes(name)) {
      delete newErrors[name];
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
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

    const servicioPeluqueria = servicios.find((s) => s.nombre.trim().toLowerCase().includes("peluqueria"));
    if (!servicioPeluqueria) {
      return { isValid: false, error: "❌ No se encontró el servicio de Peluquería." };
    }

    return { isValid: true, fechaHora, servicioPeluqueria };
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

    const { fechaHora, servicioPeluqueria } = validacion;

    if (!veterinario) {
      setErrors({ general: "❌ No se encontró información del veterinario. Por favor, inicia sesión nuevamente." });
      return;
    }

    const cita = {
      cliente_id: propietario.id,
      mascota_id: mascota._id || mascota.id,
      veterinario_id: veterinario.id,
      servicio_id: servicioPeluqueria.id,
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
      setPeluqueriaGuardada(false);
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
    console.log("handleSubmit ejecutado - Inicio guardado de peluquería");
    setIsSubmitting(true);
    setErrors({});

    const newErrors = {};
    if (!formData.fecha) {
      newErrors.fecha = "Fecha es obligatoria.";
    }
    if (!formData.servicio) {
      newErrors.servicio = "Servicio es obligatorio.";
    }

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
      proximo_control: formData.proximo_control_fecha && formData.proximo_control_hora
        ? parse(`${formData.proximo_control_fecha} ${formData.proximo_control_hora}`, "yyyy-MM-dd HH:mm", new Date())
        : undefined,
      proximo_control_fecha: undefined,
      proximo_control_hora: undefined,
    };

    try {
      if (editar) {
        if (!data._id) {
          throw new Error("ID del servicio de peluquería no definido.");
        }
        const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/peluqueria/${data._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al actualizar el servicio de peluquería");
        setErrors({ success: "✅ Servicio de peluquería actualizado con éxito." });
        setPeluqueriaGuardada(true);
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          console.log("Mostrando modal de confirmación para cita (editar)");
          setMostrarModalConfirmacion(true);
        } else {
          console.log("No se ingresó próximo control, cerrando formulario (editar)");
          setPeluqueriaGuardada(false);
          onClose();
        }
      } else {
        await onSave(payload);
        setErrors({ success: "✅ Servicio de peluquería creado con éxito." });
        setPeluqueriaGuardada(true);
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          console.log("Mostrando modal de confirmación para cita (crear)");
          setMostrarModalConfirmacion(true);
        } else {
          console.log("No se ingresó próximo control, completando flujo (crear)");
          setPeluqueriaGuardada(false);
          onComplete();
        }
      }
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setErrors({ general: `❌ Error al guardar el servicio de peluquería: ${err.message}` });
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
      setPeluqueriaGuardada(false);
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
              <Form.Label className="fw-bold"><i className="bi bi-scissors me-2"></i>Servicio</Form.Label>
              <Form.Control
                name="servicio"
                value={formData.servicio}
                onChange={handleChange}
                required
                className="bg-dark text-light border-secondary"
                placeholder="Ej. Corte de pelo, baño"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-person me-2"></i>Encargado</Form.Label>
              <Form.Control
                name="encargado"
                value={formData.encargado}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Nombre del encargado"
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
                placeholder="Motivo del servicio"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-file-text me-2"></i>Detalles</Form.Label>
              <Form.Control
                name="detalles"
                as="textarea"
                value={formData.detalles}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Detalles del servicio"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold"><i className="bi bi-eye me-2"></i>Observaciones</Form.Label>
              <Form.Control
                name="observaciones"
                as="textarea"
                value={formData.observaciones}
                onChange={handleChange}
                className="bg-dark text-light border-secondary"
                placeholder="Observaciones adicionales"
              />
            </Form.Group>
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
            <i className="bi bi-save-fill me-2"></i>{editar ? "Guardar Cambios" : "Guardar Servicio"}
          </Button>
        </div>
      </Form>

      <Modal
        show={mostrarModalConfirmacion}
        onHide={() => {
          console.log("onHide modal confirmación ejecutado");
          setMostrarModalConfirmacion(false);
          setIntentoCerrar(false);
          if (peluqueriaGuardada || intentoCerrar) {
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
            <i className="bi bi-x-circle-fill me-2"></i>No, solo guardar servicio
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
