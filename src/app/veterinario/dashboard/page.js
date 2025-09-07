
"use client";
import { useState, useEffect, useRef } from "react";
import Agenda from "./agenda";
import Consultorio from "./consultorio";
import Cartilla from "./cartilla";
import Solicitudes from "./solicitudes";
import PerfilMascota from "./perfilmascota";
import ServiciosMascota from "./ServiciosMascota";
import LlamadasEmergencia from "./LlamadasEmergencia"; // Nuevo componente
import { Container, Nav, Dropdown, Image, Button, Modal, Alert, Spinner, Form } from "react-bootstrap";
import { FaBell, FaUserCircle, FaPhone, FaPhoneSlash } from "react-icons/fa";
import Cookies from "js-cookie";
import { io } from "socket.io-client";

export default function VeterinarioDashboard() {
  const [view, setView] = useState("agenda");
  const [user, setUser] = useState(null);
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState(null);
  const [propietarioSeleccionado, setPropietarioSeleccionado] = useState(null);

  // Estado para la llamada WebRTC
  const [incomingCall, setIncomingCall] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [callerInfo, setCallerInfo] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [waitingForOffer, setWaitingForOffer] = useState(false);
  const [showEndCallModal, setShowEndCallModal] = useState(false); // Modal para finalizar llamada
  const [endCallForm, setEndCallForm] = useState({ precio: "", motivo: "emergencia" }); // Formulario para precio y motivo

  // Refs para WebRTC
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Configuración ICE mejorada
  const RTC_CONFIG = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun.relay.metered.ca:80" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
  };

  // Cargar usuario al montar
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error al cargar usuario:", error);
      }
    }
  }, []);

  // Conexión Socket.IO y manejo de llamadas
  useEffect(() => {
    if (!user) return;

    const socket = io("https://rtc-service.onrender.com", {
      transports: ["websocket"],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Conectado al servidor de señalización");
      socket.emit("register", {
        userId: user.id || user._id,
        role: "veterinario",
      });
    });

    socket.on("incoming_call", ({ call, from }) => {
      console.log("📞 Llamada entrante de:", from);
      setIncomingCall({ from, callId: call.id });
      setCallerInfo({
        id: call.callerId,
        socketId: call.callerSocketId,
        motivo: call.motivo || "emergencia",
        cliente_nombre: call.cliente_nombre,
        cliente_telefono: call.cliente_telefono,
      });
      setCallStatus("ringing");
      setShowCallModal(true);
    });

    socket.on("webrtc_offer", ({ from, sdp }) => {
      console.log("📩 Oferta WebRTC recibida de:", from);
      setPendingOffer({ from, sdp });
      if (waitingForOffer && incomingCall?.from === from) {
        handleIncomingWebRTCCall(from, sdp);
        setWaitingForOffer(false);
        setPendingOffer(null);
      }
    });

    socket.on("webrtc_ice_candidate", ({ from, candidate }) => {
      if (pcRef.current && candidate && incomingCall?.from === from) {
        pcRef.current
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((err) => console.error("Error al agregar ICE candidate:", err));
      }
    });

    socket.on("call_ended", () => {
      console.log("📞 Llamada finalizada por el cliente");
      setShowEndCallModal(false);
      finalizarLlamada();
    });

    return () => {
      socket.disconnect();
      finalizarLlamada();
    };
  }, [user]);

  // Asigna streams a videos después de renderizar la vista de llamada
  useEffect(() => {
    if (callAccepted && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      if (localStreamRef.current.getTracks().length > 0) {
        localVideoRef.current.play().catch((e) => console.error("Error reproduciendo video local:", e));
      } else {
        console.warn("No hay tracks locales aún, esperando...");
      }
    }
    if (callAccepted && remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      if (remoteStreamRef.current.getTracks().length > 0) {
        remoteVideoRef.current.play().catch((e) => console.error("Error reproduciendo video remoto:", e));
      } else {
        console.warn("No hay tracks remotos aún, esperando...");
      }
    }
  }, [callAccepted]);

  // Limpieza adicional al desmontar
  useEffect(() => {
    return () => {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, []);

  // Manejar llamada WebRTC entrante
  const handleIncomingWebRTCCall = async (from, offerSdp) => {
    try {
      setCallStatus("connecting");

      const constraints = {
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      };

      const localStream = await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch((err) => {
          console.error("Error al acceder a medios:", err);
          throw new Error("No se pudo acceder a la cámara/micrófono");
        });

      localStreamRef.current = localStream;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("webrtc_ice_candidate", {
            to: from,
            from: user.id || user._id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        event.streams[0].getTracks().forEach((track) => {
          remoteStreamRef.current.addTrack(track);
        });

        console.log("Track remoto añadido:", track.kind);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.play().catch((e) => console.error("Retry play:", e));
        }
      };

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(answer);

      socketRef.current.emit("webrtc_answer", {
        to: from,
        from: user.id || user._id,
        sdp: pc.localDescription,
      });

      setCallAccepted(true);
      setCallStatus("connected");
      setShowCallModal(false);
    } catch (err) {
      console.error("❌ Error al aceptar llamada:", err);
      setCallStatus("error");

      if (socketRef.current && incomingCall?.from) {
        socketRef.current.emit("rechazar_llamada", {
          veterinarioId: user.id || user._id,
          usuarioId: incomingCall.from,
          motivo: "Error técnico al conectar",
        });
      }

      finalizarLlamada();
    }
  };

  // Aceptar llamada manualmente
  const aceptarLlamada = () => {
    if (!incomingCall) return;
    setCallStatus("connecting");

    socketRef.current.emit("aceptar_llamada", {
      veterinarioId: user.id || user._id,
      usuarioId: incomingCall.from,
    });

    if (pendingOffer && pendingOffer.from === incomingCall.from) {
      handleIncomingWebRTCCall(pendingOffer.from, pendingOffer.sdp);
      setPendingOffer(null);
    } else {
      setWaitingForOffer(true);
      console.log("Esperando oferta WebRTC...");
    }
  };

  // Rechazar llamada
  const rechazarLlamada = () => {
    if (!incomingCall) return;

    socketRef.current.emit("rechazar_llamada", {
      veterinarioId: user.id || user._id,
      usuarioId: incomingCall.from,
      motivo: "El veterinario no está disponible",
    });

    setWaitingForOffer(false);
    finalizarLlamada();
    setShowCallModal(false);
  };

  // Mostrar modal para finalizar llamada
  const handleEndCall = () => {
    setShowEndCallModal(true);
  };

  // Confirmar finalización de llamada con precio y motivo
  const confirmarFinalizarLlamada = () => {
    if (!incomingCall) return;

    socketRef.current.emit("finalizar_llamada", {
      veterinarioId: user.id || user._id,
      usuarioId: incomingCall.from,
      extra: {
        precio: parseFloat(endCallForm.precio) || 50,
        motivo: endCallForm.motivo || "emergencia",
        cliente_nombre: callerInfo?.cliente_nombre,
        cliente_telefono: callerInfo?.cliente_telefono,
      },
    });

    setShowEndCallModal(false);
    finalizarLlamada();
  };

  // Finalizar llamada
  const finalizarLlamada = () => {
    if (callAccepted && socketRef.current && incomingCall?.from) {
      socketRef.current.emit("finalizar_llamada", {
        veterinarioId: user.id || user._id,
        usuarioId: incomingCall.from,
      });
    }

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        sender.track?.stop();
      });
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setCallAccepted(false);
    setIncomingCall(null);
    setPendingOffer(null);
    setCallStatus("");
    setCallerInfo(null);
    setShowCallModal(false);
    setWaitingForOffer(false);
    setEndCallForm({ precio: "50", motivo: "emergencia" });
  };

  // Cerrar sesión
  const logout = () => {
    finalizarLlamada();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    Cookies.remove("token");
    window.location.href = "/login";
  };

  return (
    <Container fluid className="p-0">
      {/* Encabezado superior */}
      <div
        className="d-flex justify-content-between align-items-center text-light px-4 py-3"
        style={{ backgroundColor: "#11151c" }}
      >
        <div className="d-flex align-items-center">
          <img
            src="https://vidapetsoficial.com/site/wp-content/uploads/elementor/thumbs/club2-q6h1hktkxecyxunbgfhre8z13abtbboq6f1tjzbho4.png"
            alt="Veterinaria Vidapets"
            style={{ height: "40px" }}
          />
        </div>

        <div className="d-flex align-items-center gap-4">
          <Dropdown align="end">
            <Dropdown.Toggle variant="dark" id="dropdown-notificaciones" className="border-0 p-0">
              <FaBell size={24} className="text-light" />
            </Dropdown.Toggle>
            <Dropdown.Menu className="p-3" style={{ minWidth: "300px", fontSize: "1rem" }}>
              <Dropdown.Header>Notificaciones</Dropdown.Header>
              <div className="text-muted text-center py-2">No hay notificaciones</div>
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown align="end">
            <Dropdown.Toggle variant="dark" id="dropdown-perfil" className="border-0 p-0">
              {user?.imagen ? (
                <Image
                  src={user.imagen}
                  roundedCircle
                  width={32}
                  height={32}
                  alt="Avatar"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <FaUserCircle size={26} className="text-light" />
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu className="p-3" style={{ minWidth: "300px", fontSize: "1rem" }}>
              <Dropdown.Header className="pb-2">
                <div>
                  <strong>{user?.nombre || "Usuario"}</strong>
                </div>
                <small className="text-muted">{user?.rol || "Rol"}</small>
              </Dropdown.Header>
              <Dropdown.Divider />
              <Dropdown.Item>Perfil</Dropdown.Item>
              <Button variant="danger" className="d-block w-100 mt-2" onClick={logout}>
                Salir
              </Button>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* Barra de navegación */}
      <Nav
        className="px-4 py-0 d-flex align-items-center gap-3"
        style={{ backgroundColor: "#1f2937" }}
      >
        <Nav.Item>
          <Nav.Link
            onClick={() => setView("agenda")}
            className="fw-semibold text-light px-5 py-3 rounded-1"
            style={{ backgroundColor: "#2d3748", marginTop: "20px" }}
          >
            Agenda
          </Nav.Link>
        </Nav.Item>
        <Dropdown as={Nav.Item}>
          <Dropdown.Toggle
            as={Nav.Link}
            className="fw-semibold text-light px-5 py-3 rounded-1"
            style={{ backgroundColor: "#2d3748", cursor: "pointer", marginTop: "20px" }}
          >
            Consultorio
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setView("consultorio")}>Consultorio</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        <Nav.Item>
          <Nav.Link
            onClick={() => setView("cartilla")}
            className="fw-semibold text-light px-5 py-3 rounded-1"
            style={{ backgroundColor: "#2d3748", marginTop: "20px" }}
          >
            Cartilla
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            onClick={() => setView("solicitudes")}
            className="fw-semibold text-light px-5 py-3 rounded-1"
            style={{ backgroundColor: "#2d3748", marginTop: "20px" }}
          >
            Solicitudes
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            onClick={() => setView("llamadasEmergencia")}
            className="fw-semibold text-light px-5 py-3 rounded-1"
            style={{ backgroundColor: "#2d3748", marginTop: "20px" }}
          >
            Llamadas de Emergencia
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Contenido principal */}
      <div className="p-4" style={{ backgroundColor: "#111827", minHeight: "100vh" }}>
        {view === "agenda" && <Agenda />}
        {view === "consultorio" && (
          <Consultorio
            setView={setView}
            setMascotaSeleccionada={setMascotaSeleccionada}
            setPropietarioSeleccionado={setPropietarioSeleccionado}
          />
        )}
        {view === "cartilla" && <Cartilla />}
        {view === "solicitudes" && <Solicitudes />}
        {view === "perfilMascota" && mascotaSeleccionada && propietarioSeleccionado && (
          <PerfilMascota
            mascota={mascotaSeleccionada}
            propietario={propietarioSeleccionado}
            setView={setView}
          />
        )}
        {view === "servicios" && (
          <ServiciosMascota
            setView={(v) => {
              const mascota = JSON.parse(localStorage.getItem("mascota_servicio"));
              const propietario = JSON.parse(localStorage.getItem("propietario_servicio"));
              setMascotaSeleccionada(mascota);
              setPropietarioSeleccionado(propietario);
              setView(v);
            }}
          />
        )}
        {view === "llamadasEmergencia" && <LlamadasEmergencia veterinarioId={user?.id || user?._id} />}
      </div>

      {/* Modal de llamada entrante */}
      <Modal show={showCallModal && !callAccepted} onHide={rechazarLlamada} centered>
        <Modal.Header closeButton>
          <Modal.Title>📞 Llamada entrante</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <p>Cliente está llamando...</p>
            {callerInfo?.cliente_nombre && <p>Cliente: {callerInfo.cliente_nombre}</p>}
            {callerInfo?.cliente_telefono && <p>Teléfono: {callerInfo.cliente_telefono}</p>}
            {callerInfo?.motivo && <p>Motivo: {callerInfo.motivo}</p>}
          </Alert>

          {callStatus === "connecting" && (
            <div className="text-center my-3">
              <Spinner animation="border" variant="primary" />
              <p>Conectando...</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={rechazarLlamada}>
            <FaPhoneSlash className="me-2" /> Rechazar
          </Button>
          <Button variant="success" onClick={aceptarLlamada} disabled={callStatus === "connecting"}>
            {callStatus === "connecting" ? (
              <>
                <Spinner animation="border" size="sm" /> Conectando...
              </>
            ) : (
              <>
                <FaPhone className="me-2" /> Aceptar
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para finalizar llamada con precio y motivo */}
      <Modal show={showEndCallModal} onHide={() => setShowEndCallModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Finalizar Llamada de Emergencia</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Precio ($)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={endCallForm.precio}
                onChange={(e) => setEndCallForm({ ...endCallForm, precio: e.target.value })}
                placeholder="Ingrese el precio de la consulta"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Motivo</Form.Label>
              <Form.Control
                type="text"
                value={endCallForm.motivo}
                onChange={(e) => setEndCallForm({ ...endCallForm, motivo: e.target.value })}
                placeholder="Motivo de la llamada"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEndCallModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={confirmarFinalizarLlamada}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Vista durante la llamada */}
      {callAccepted && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)",
            zIndex: 1050,
            display: "flex",
            flexDirection: "column",
            padding: "20px",
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: "#000",
              borderRadius: "8px",
              overflow: "hidden",
              position: "relative",
              marginBottom: "20px",
            }}
          >
            <h6
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                color: "white",
                zIndex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                padding: "5px 10px",
                borderRadius: "4px",
              }}
            >
              Cliente
            </h6>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "80px",
              right: "20px",
              width: "150px",
              height: "200px",
              backgroundColor: "#000",
              borderRadius: "8px",
              overflow: "hidden",
              border: "2px solid white",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            }}
          >
            <h6
              style={{
                position: "absolute",
                top: "5px",
                left: "5px",
                color: "white",
                zIndex: 1,
                fontSize: "12px",
                backgroundColor: "rgba(0,0,0,0.5)",
                padding: "2px 5px",
                borderRadius: "4px",
              }}
            >
              Tú
            </h6>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            <Button
              variant="danger"
              size="lg"
              onClick={handleEndCall}
              style={{
                borderRadius: "50%",
                width: "60px",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaPhoneSlash size={20} />
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}
