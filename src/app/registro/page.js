"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import httpClient from "../utils/httpClient";
import { Container, Card, Form, Button, Alert, Link } from "react-bootstrap";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [error, setError] = useState(null); // Estado para manejar errores
  const router = useRouter();

  const handleRegistro = async () => {
    try {
      const response = await httpClient.post("/register", { nombre, correo, password, telefono, direccion });

      console.log("✅ Registro exitoso:", response.data.message);

      // 🔄 Redirigir al login automáticamente
      if (response.data.redirect) {
        router.push(response.data.redirect);
      }
    } catch (error) {
      console.error("❌ Error en registro:", error.response?.data || error.message);
      setError(error.response?.data?.message || "Error al registrar. Verifica los datos.");
    }
  };
   const  home = async () => {

      // Redireccionar según el rol
      router.push("/");
   
  };


  return (
    <div
      className="login-background"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Card
          style={{
            width: "100%",
            maxWidth: "400px",
            backgroundColor: "rgba(0, 0, 0, 0.7)", // Fondo negro con 70% de opacidad
            border: "2px solid rgba(255, 255, 255, 0.3)", // Borde claro
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          }}
          className="p-4"
        >
          <Card.Body>
            <h2 className="text-center mb-4 text-light">Registro en Veterinaria Vidapets</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form>
              <Form.Group className="mb-3" controlId="nombre">
                <Form.Label className="text-light">Nombre</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese su nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", color: "white", borderColor: "rgba(255, 255, 255, 0.3)" }}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="correo">
                <Form.Label className="text-light">Correo Electrónico</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Ingrese su correo"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", color: "white", borderColor: "rgba(255, 255, 255, 0.3)" }}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="password">
                <Form.Label className="text-light">Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", color: "white", borderColor: "rgba(255, 255, 255, 0.3)" }}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="telefono">
                <Form.Label className="text-light">Teléfono</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese su teléfono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  required
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", color: "white", borderColor: "rgba(255, 255, 255, 0.3)" }}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="direccion">
                <Form.Label className="text-light">Dirección</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese su dirección"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  required
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", color: "white", borderColor: "rgba(255, 255, 255, 0.3)" }}
                />
              </Form.Group>
              <Button variant="primary" className="w-100" onClick={handleRegistro}>
                Registrar
              </Button>
              
              <div className="text-center mt-3">
                  <a href="#" className="text-primary" onClick={home}>
                    volver
                  </a>
                </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}