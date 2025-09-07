"use client";
import { useState, useEffect, useRef } from "react";
import Agenda from "./agenda";
import Consultorio from "./consultorio";
import Cartilla from "./cartilla";
import Solicitudes from "./solicitudes";
import PerfilMascota from "./perfilmascota";
import ServiciosMascota from "./ServiciosMascota";
import LlamadasEmergencia from "./LlamadasEmergencia";
import {
  Container,
  Nav,
  Dropdown,
  Image,
  Button,
  Modal,
  Alert,
  Spinner,
  Form,
} from "react-bootstrap";
import { FaBell, FaUserCircle, FaPhone, FaPhoneSlash } from "react-icons/fa";
import Cookies from "js-cookie";
import { io } from "socket.io-client";

// Función auxiliar para reproducción segura de video
const safePlay = async (videoElement) => {
  if (!videoElement) return;
  
  try {
    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      await playPromise;
    }
  } catch (error) {
    // Ignorar AbortError ya que es común en WebRTC
    if (error.name !== 'AbortError') {
      console.warn("Error en safePlay:", error);
    }
  }
};

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
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [endCallForm, setEndCallForm] = useState({ precio: "", motivo: "emergencia" });
  const [localVideoReady, setLocalVideoReady] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);

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
      // Servidores STUN públicos de Google
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      
      // Servidores TURN alternativos (gratuitos)
      { 
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      { 
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject", 
        credential: "openrelayproject"
      },
      { 
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ],
    iceTransportPolicy: "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require"
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

  // Conexión Socket.IO y manejo de llamadas - MEJORADA
  useEffect(() => {
    if (!user) return;

    const socket = io("https://rtc-service.onrender.com", {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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

    // FILTRO PARA ICE CANDIDATES VACÍOS
    socket.on("webrtc_ice_candidate", ({ from, candidate }) => {
      if (pcRef.current && candidate && candidate.candidate !== "" && incomingCall?.from === from) {
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

    socket.on("disconnect", () => {
      console.log("🔌 Socket desconectado");
    });

    socket.on("error", (error) => {
      console.error("❌ Error de socket:", error);
    });

    return () => {
      socket.disconnect();
      finalizarLlamada();
    };
  }, [user]);

  // Reproducción de video mejorada
  useEffect(() => {
    const handleVideoPlayback = async () => {
      if (callAccepted) {
        // Pequeño delay para asegurar que los elementos estén listos
        setTimeout(() => {
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            safePlay(localVideoRef.current);
          }
          
          if (remoteVideoRef.current && remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            safePlay(remoteVideoRef.current);
          }
        }, 500);
      }
    };

    handleVideoPlayback();
  }, [callAccepted, localVideoReady, remoteVideoReady]);

  // Limpieza adicional al desmontar
  useEffect(() => {
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.pause();
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.pause();
      }
    };
  }, []);

  // Manejar llamada WebRTC entrante - CORREGIDA
  const handleIncomingWebRTCCall = async (from, offerSdp) => {
    let retryCount = 0;
    const maxRetries = 3;
    let iceTimeout;

    try {
      setCallStatus("connecting");

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        },
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
          facingMode: "user",
        },
      };

      const localStream = await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch((err) => {
          console.error("Error al acceder a medios:", err);
          if (err.name === "NotAllowedError") {
            throw new Error("Permisos de micrófono o cámara denegados. Concede los permisos.");
          } else if (err.name === "NotFoundError") {
            throw new Error("No se encontraron dispositivos de audio o video.");
          } else {
            throw new Error("No se pudo acceder a los medios: " + err.message);
          }
        });

      localStreamRef.current = localStream;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // FILTRO PARA ICE CANDIDATES VACÍOS
      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.candidate !== "") {
          socketRef.current.emit("webrtc_ice_candidate", {
            to: from,
            from: user.id || user._id,
            candidate: event.candidate,
          });
        }
      };

      // MANEJO MEJORADO DE TRACKS REMOTOS (SIN .CATCH PROBLEMÁTICO)
      pc.ontrack = (event) => {
        console.log("📹 Track remoto recibido:", event.track.kind);
        
        if (event.streams && event.streams[0]) {
          const incomingStream = event.streams[0];
          
          // Limpiar tracks antiguos primero
          if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach(track => track.stop());
          }
          
          remoteStreamRef.current = incomingStream;
          
          // Reproducir después de un pequeño delay para evitar conflictos
          setTimeout(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
              remoteVideoRef.current.srcObject = incomingStream;
              
              // USAR safePlay EN LUGAR DE .catch MANUAL
              safePlay(remoteVideoRef.current).then(() => {
                console.log("✅ Video remoto reproduciéndose");
              });
            }
          }, 100);
        }
      };

      // TIMEOUT PARA CONEXIÓN ICE (25 segundos)
      iceTimeout = setTimeout(() => {
        if (pc.iceConnectionState !== "connected" && pc.iceConnectionState !== "completed") {
          console.log("❌ Timeout de conexión ICE");
          setCallStatus("error");
          finalizarLlamada();
        }
      }, 25000);

      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
        
        if (pc.iceConnectionState === "connected") {
          setCallStatus("connected");
          if (iceTimeout) clearTimeout(iceTimeout);
        }
        else if (pc.iceConnectionState === "disconnected" && retryCount < maxRetries) {
          console.log(`Reintentando conexión (${retryCount + 1}/${maxRetries})...`);
          retryCount++;
          setCallStatus("reconectando");
          
          setTimeout(() => {
            if (pcRef.current) {
              try {
                pcRef.current.restartIce();
              } catch (e) {
                console.error("Error al reiniciar ICE:", e);
              }
            }
          }, 2000);
        }
        else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          console.log("❌ Conexión ICE fallida");
          setCallStatus("error");
          if (iceTimeout) clearTimeout(iceTimeout);
          
          socketRef.current.emit("finalizar_llamada", {
            veterinarioId: user.id || user._id,
            usuarioId: from,
          });
          finalizarLlamada();
        }
      };

      localStream.getTracks().forEach((track) => {
        console.log("Añadiendo track local:", track.kind);
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

    // Detener todos los tracks de medios
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      remoteStreamRef.current = null;
    }

    // Limpiar referencias de video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.pause();
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.pause();
    }

    // Cerrar conexión PeerConnection
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach(sender => {
          if (sender.track) sender.track.stop();
        });
        pcRef.current.close();
      } catch (e) {
        console.error("Error al cerrar peer connection:", e);
      }
      pcRef.current = null;
    }

    setCallAccepted(false);
    setIncomingCall(null);
    setPendingOffer(null);
    setCallStatus("");
    setCallerInfo(null);
    setShowCallModal(false);
    setWaitingForOffer(false);
    setEndCallForm({ precio: "50", motivo: "emergencia" });
    setLocalVideoReady(false);
    setRemoteVideoReady(false);
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
              onLoadedMetadata={() => setRemoteVideoReady(true)}
              onCanPlay={() => safePlay(remoteVideoRef.current)}
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
              onLoadedMetadata={() => setLocalVideoReady(true)}
              onCanPlay={() => safePlay(localVideoRef.current)}
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