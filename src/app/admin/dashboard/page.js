"use client";
import { useState, useEffect } from "react";
import { Container, Row, Col, Button, Card, Spinner } from "react-bootstrap";
import { PeopleFill, CalendarCheckFill, HeartFill, BriefcaseFill, BoxArrowRight, Speedometer2 } from "react-bootstrap-icons";
import Usuarios from "./usuarios";
import Citas from "./citas";
import Mascotas from "./mascotas";
import Servicios from "./servicios";

export default function AdminDashboard() {
  const [view, setView] = useState("dashboard");
  const [stats, setStats] = useState({ usuarios: 0, citas: 0, mascotas: 0, servicios: 0 });
  const [loading, setLoading] = useState(true);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const mensajes = [
    "🐾 ¡Cada mascota merece amor y cuidado excepcional!",
    "💖 Nuestros amigos peludos hacen el mundo más feliz.",
    "🩺 Prioriza la salud y bienestar de las mascotas hoy.",
    "🐶 Las mascotas son familia, cuidémoslas con pasión.",
    "📅 Organiza las citas para mantener a las mascotas radiantes.",
  ];

  // 🔄 Cargar datos reales
  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      const [usuariosRes, citasRes, serviciosRes, mascotasRes] = await Promise.all([
        fetch("https://usuarios-service-emf5.onrender.com/api/usuarios/obtenerusuarios").then((res) => res.json()),
        fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas").then((res) => res.json()),
        fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios").then((res) => res.json()),
        fetch("https://mascota-service.onrender.com/api/mascotas/mascotas").then((res) => res.json()),
      ]);

      setStats({
        usuarios: usuariosRes.length || 0,
        citas: citasRes.length || 0,
        servicios: serviciosRes.length || 0,
        mascotas: mascotasRes.length || 0,
      });
    } catch (error) {
      console.error("❌ Error al cargar estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Rotar mensajes cada 5 segundos
  useEffect(() => {
    cargarEstadisticas();
    const statsInterval = setInterval(cargarEstadisticas, 30000); // Actualizar estadísticas cada 30s
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % mensajes.length);
    }, 5000); // Cambiar mensaje cada 5s

    return () => {
      clearInterval(statsInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <Container fluid className="bg-dark text-light min-vh-100">
      <Row>
        {/* Barra lateral */}
        <Col
          md={3}
          className="bg-dark text-white p-4 shadow"
          style={{ minHeight: "100vh", borderRight: "2px solid #343a40" }}
        >
          <h3 className="mb-4 d-flex align-items-center gap-2">
            <Speedometer2 size={28} /> Panel Admin
          </h3>
          <Button
            variant={view === "dashboard" ? "primary" : "outline-light"}
            className="w-100 mb-2 rounded-pill"
            onClick={() => setView("dashboard")}
          >
            📊 Dashboard
          </Button>
          <Button
            variant={view === "usuarios" ? "primary" : "outline-light"}
            className="w-100 mb-2 rounded-pill"
            onClick={() => setView("usuarios")}
          >
            👥 Usuarios
          </Button>
          <Button
            variant={view === "citas" ? "primary" : "outline-light"}
            className="w-100 mb-2 rounded-pill"
            onClick={() => setView("citas")}
          >
            📅 Citas
          </Button>
          <Button
            variant={view === "mascotas" ? "primary" : "outline-light"}
            className="w-100 mb-2 rounded-pill"
            onClick={() => setView("mascotas")}
          >
            🐾 Mascotas
          </Button>
          <Button
            variant={view === "servicios" ? "primary" : "outline-light"}
            className="w-100 mb-2 rounded-pill"
            onClick={() => setView("servicios")}
          >
            💼 Servicios
          </Button>
          <Button
            variant="danger"
            className="w-100 mt-4 rounded-pill"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
          >
            <BoxArrowRight /> Cerrar Sesión
          </Button>
        </Col>

        {/* Contenido */}
        <Col md={9} className="p-4">
          {view === "dashboard" && (
            <>
              {/* Imagen de portada */}
              <div
                className="rounded shadow mb-4"
                style={{
                  backgroundImage: "url('https://radiovidapets.radiostream123.com/banner_images/3362949/297/128/06282007358440filebaner.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  height: "250px",
                  transition: "all 0.3s ease",
                }}
              ></div>

              {/* Mensaje dinámico con transición */}
              <h2 className="mb-3">👋 Bienvenido, Administrador</h2>
              <div
                className="p-3 bg-secondary rounded shadow-sm mb-4"
                style={{
                  transition: "opacity 0.5s ease-in-out",
                  opacity: 1,
                  minHeight: "60px",
                }}
                key={currentMessageIndex}
              >
                <p className="mb-0 text-light">{mensajes[currentMessageIndex]}</p>
              </div>

              {/* Tarjetas estadísticas */}
              {loading ? (
                <div className="text-center mt-5">
                  <Spinner animation="border" variant="light" size="lg" />
                  <p className="mt-3 text-muted">Cargando estadísticas...</p>
                </div>
              ) : (
                <Row className="mt-4 g-4">
                  {[
                    { icon: PeopleFill, title: "Usuarios", value: stats.usuarios, color: "#6f42c1" },
                    { icon: CalendarCheckFill, title: "Citas", value: stats.citas, color: "#007bff" },
                    { icon: HeartFill, title: "Mascotas", value: stats.mascotas, color: "#dc3545" },
                    { icon: BriefcaseFill, title: "Servicios", value: stats.servicios, color: "#28a745" },
                  ].map((stat, index) => (
                    <Col md={3} key={index}>
                      <Card
                        className="shadow-sm border-0 hover-scale"
                        style={{ backgroundColor: stat.color, transition: "transform 0.2s ease" }}
                      >
                        <Card.Body className="text-center text-white">
                          <stat.icon size={40} />
                          <h4 className="mt-2">{stat.value}</h4>
                          <p className="mb-0">{stat.title}</p>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </>
          )}

          {view === "usuarios" && <Usuarios />}
          {view === "citas" && <Citas />}
          {view === "mascotas" && <Mascotas />}
          {view === "servicios" && <Servicios />}
        </Col>
      </Row>

      {/* Estilos adicionales */}
      <style jsx>{`
        .hover-scale:hover {
          transform: scale(1.05);
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </Container>
  );
}