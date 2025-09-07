"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import httpClient from "../utils/httpClient";
import Cookies from "js-cookie";
import { Container, Card, Form, Button, Tabs, Tab, Alert } from "react-bootstrap";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

const handleLogin = async () => {
  try {
    setError(null);
    const response = await httpClient.post("/login", { correo, password });

    // Guardar el token
    Cookies.set("token", response.data.token, { expires: 2 });

    // Guardar los datos del usuario
    localStorage.setItem("user", JSON.stringify(response.data.user));

    // Redirigir según el rol
    router.push(response.data.redirect);
  } catch (error) {
    console.error("❌ Error en login:", error.response?.data || error.message);
    setError(error.response?.data?.message || "Error al iniciar sesión. Verifica tus credenciales.");
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
            backgroundColor: "rgba(71, 85, 75, 0.7)", // Fondo negro con 70% de opacidad
            border: "2px solid rgba(255, 255, 255, 0.3)", // Borde claro
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          }}
          className="p-4"
        >
          <Card.Body>
            <Tabs defaultActiveKey="login" id="login-tabs" className="mb-4">
              <Tab eventKey="login" title="Iniciar Sesión">
                <h2 className="text-center mb-4 text-light">Bienvenido a Veterinaria Vidapets</h2>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form>
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
                  <Button variant="primary" className="w-100" onClick={handleLogin}>
                    Ingresar
                  </Button>
                </Form>
                <div className="text-center mt-3">
                  <a href="#" className="text-primary" onClick={() => alert("Funcionalidad de recuperación en desarrollo")}>
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="text-center mt-3">
                  <a href="#" className="text-primary" onClick={home}>
                    volver
                  </a>
                </div>
              </Tab>
              <Tab eventKey="recover" title="Recuperar Contraseña">
                <h2 className="text-center mb-4 text-light">Recuperar Contraseña</h2>
                <Form>
                  <Form.Group className="mb-3" controlId="recover-email">
                    <Form.Label className="text-light">Correo Electrónico</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Ingrese su correo para recuperación"
                      disabled
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", color: "white", borderColor: "rgba(255, 255, 255, 0.3)" }}
                    />
                  </Form.Group>
                  <Button
                    variant="secondary"
                    className="w-100"
                    onClick={() => alert("Funcionalidad de recuperación en desarrollo")}
                  >
                    Enviar enlace de recuperación
                  </Button>
                  
                </Form>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}