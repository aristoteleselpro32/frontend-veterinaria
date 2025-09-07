
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Container,
  Navbar,
  Nav,
  NavDropdown,
  Carousel,
  Button,
  Card,
  Form,
  Alert,
  Modal,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";
import { parse, isValid as isValidDate, differenceInMinutes, format } from "date-fns";
import { es } from "date-fns/locale";
import { io } from "socket.io-client";
import AOS from "aos";
import "aos/dist/aos.css";

// ID para usuarios invitados en llamadas de emergencia
const EMERGENCY_USER_ID = "750b4f1d-3912-4802-8df2-e6544ba860fd";

// Configuración ICE para WebRTC con Xirsys
const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:sp-turn1.xirsys.com" },
    {
      username: "_ee0X7Re6b3R-6JqKAJWd320SZoudP--4k4h7Bh-WBhXofeHVV1DxnAYmOc2wCyiAAAAAGi96FJtYXRlbw==",
      credential: "a9a92c76-8c27-11f0-8830-0242ac120004",
      urls: [
        "turn:sp-turn1.xirsys.com:80?transport=udp",
        "turn:sp-turn1.xirsys.com:3478?transport=udp",
        "turn:sp-turn1.xirsys.com:80?transport=tcp",
        "turn:sp-turn1.xirsys.com:3478?transport=tcp",
        "turns:sp-turn1.xirsys.com:443?transport=tcp",
        "turns:sp-turn1.xirsys.com:5349?transport=tcp"
      ]
    }
  ]
};

// Estilos CSS para animaciones y diseño responsivo
const styles = `
  @keyframes slide-up {
    from {
      transform: translateY(50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.8;
    }
  }

  .service-card {
    animation: slide-up 0.5s ease-out forwards;
    animation-delay: calc(var(--order) * 0.2s);
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    width: 100% !important;
    max-width: 18rem;
    margin: 10px auto;
  }

  .carousel-container {
    animation: fade-in 1s ease-out forwards;
    border-radius: 12px;
    overflow: hidden;
  }

  .btn-animated {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    font-size: clamp(0.9rem, 4vw, 1rem);
    padding: 0.5rem 1rem;
  }

  .btn-animated:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  .modal-emergency {
    font-family: 'Inter', sans-serif;
  }

  .video-call-container {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .emergency-section {
    transition: all 0.3s ease;
  }

  .dropdown-menu {
    min-width: 200px !important;
    padding: 0.75rem;
  }

  .dropdown-item-text {
    padding: 0.5rem 0;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: clamp(1.5rem, 6vw, 1.8rem) !important;
    }
    h2 {
      font-size: clamp(1.25rem, 5vw, 1.5rem) !important;
    }
    .navbar-brand {
      font-size: clamp(1rem, 4vw, 1.2rem);
    }
    .nav-link {
      font-size: clamp(0.9rem, 3.5vw, 1rem);
    }
    .btn-animated {
      font-size: clamp(0.8rem, 3.5vw, 0.9rem);
      padding: 0.4rem 0.8rem;
    }
    .carousel-container img {
      height: 50vh;
      object-fit: cover;
    }
    .service-card {
      max-width: 100%;
    }
    .dropdown-menu {
      min-width: 100% !important;
    }
  }

  @media (max-width: 576px) {
    .navbar .container {
      flex-direction: column;
      align-items: center;
    }
    .navbar-brand {
      margin-bottom: 0.5rem;
    }
    .nav {
      flex-direction: column;
      align-items: center;
    }
    .nav-link {
      margin: 0.2rem 0;
    }
    .btn-animated {
      width: 100%;
      margin: 0.2rem 0;
    }
  }
`;

export default function Home() {
  const [user, setUser] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showReservaModal, setShowReservaModal] = useState(false);
  const [loadingReservaSubmit, setLoadingReservaSubmit] = useState(false);
  const [reservaError, setReservaError] = useState("");
  const [reservaSuccess, setReservaSuccess] = useState("");
  const [veterinarios, setVeterinarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [misMascotas, setMisMascotas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [form, setForm] = useState({
    cliente_id: "",
    mascota_id: "",
    veterinario_id: "",
    servicio_id: "",
    fecha: "",
    hora: "07:00",
    estado: "pendiente",
  });
  const [socket, setSocket] = useState(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [queuePosition, setQueuePosition] = useState(null);
  const [selectedVetForCall, setSelectedVetForCall] = useState("");
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestError, setGuestError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [loadingDevices, setLoadingDevices] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [theme, setTheme] = useState("dark");

  // Inicializar AOS y detectar tema
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-out",
      once: true,
    });

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

  // Estilos dinámicos según el tema
  const themeStyles = {
    light: {
      containerBg: "#ffffff",
      textColor: "var(--bs-dark)",
      navbarBg: "#f8f9fa",
      navbarText: "#212529",
      cardBg: "#f8f9fa",
      cardText: "#333",
      borderColor: "#dee2e6",
      modalBg: "#ffffff",
      modalText: "#212529",
      modalBorder: "#dee2e6",
      formBg: "#ffffff",
      formText: "#212529",
      formBorder: "#dee2e6",
      emergencyBg: "#dc3545",
      emergencyText: "#ffffff",
    },
    dark: {
      containerBg: "#111827",
      textColor: "var(--bs-light)",
      navbarBg: "#1f2937",
      navbarText: "#e5e7eb",
      cardBg: "#1f2937",
      cardText: "#e5e7eb",
      borderColor: "#4b5563",
      modalBg: "#1f2937",
      modalText: "#e5e7eb",
      modalBorder: "#4b5563",
      formBg: "#2d3748",
      formText: "#e5e7eb",
      formBorder: "#4b5563",
      emergencyBg: "#dc3545",
      emergencyText: "#ffffff",
    },
  };

  const currentTheme = themeStyles[theme];

  // Cargar datos iniciales (usuario, servicios, veterinarios)
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setForm((f) => ({ ...f, cliente_id: parsed.id || parsed._id || parsed.id_cliente }));
      } catch (e) {
        console.warn("No se pudo parsear user en localStorage", e);
      }
    }

    fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios", {
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Error al obtener servicios");
        return r.json();
      })
      .then((d) => setServicios(Array.isArray(d) ? d : []))
      .catch((e) => console.error("Error cargando servicios", e));

    fetch("https://usuarios-service-emf5.onrender.com/api/usuarios/obtenerusuarios", {
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Error al obtener veterinarios");
        return r.json();
      })
      .then((d) => {
        if (Array.isArray(d)) {
          const vets = d.filter((u) => u.rol === "veterinario" || u.role === "veterinario");
          setVeterinarios(vets);
          setSelectedVetForCall(vets[0]?.id || vets[0]?._id || "");
        } else setVeterinarios([]);
      })
      .catch((e) => console.error("Error cargando veterinarios", e));
  }, []);

  // Cargar mascotas del cliente
  useEffect(() => {
    if (!form.cliente_id) return setMisMascotas([]);
    fetch(`https://mascota-service.onrender.com/api/mascotas/mascotascliente/${form.cliente_id}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Error al obtener mascotas");
        return r.json();
      })
      .then((d) => setMisMascotas(Array.isArray(d) ? d : []))
      .catch((e) => {
        console.error("Error cargando mascotas del cliente", e);
        setMisMascotas([]);
      });
  }, [form.cliente_id]);

  // Cargar reservas del veterinario
  useEffect(() => {
    if (!form.veterinario_id) return setReservas([]);
    fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas?veterinario_id=${form.veterinario_id}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Error al obtener reservas");
        return r.json();
      })
      .then((d) => setReservas(Array.isArray(d) ? d : []))
      .catch((e) => {
        console.error("Error cargando reservas del veterinario:", e);
        setReservas([]);
      });
  }, [form.veterinario_id]);

  // Conexión Socket.IO y manejo de eventos WebRTC
  useEffect(() => {
    const s = io("https://rtc-service.onrender.com", {
      transports: ["websocket"],
      autoConnect: true,
    });
    setSocket(s);

    s.on("connect", () => {
      console.log("🔌 Socket conectado:", s.id);
      const idForRegister = user?.id || user?._id || user?.id_cliente || EMERGENCY_USER_ID;
      s.emit("register", {
        userId: idForRegister,
        role: user ? "usuario" : "guest",
      });
    });

    s.on("webrtc_answer", async (payload) => {
      console.log("📩 Respuesta recibida:", payload);
      if (!pcRef.current) return;
      try {
        const desc = new RTCSessionDescription(payload.sdp);
        await pcRef.current.setRemoteDescription(desc);
        setCallStatus("en_llamada");
        setQueuePosition(null);
      } catch (err) {
        console.error("❌ Error setRemoteDescription (answer):", err);
        setCallStatus("error");
        finalizarLlamada(false);
      }
    });

    s.on("webrtc_ice_candidate", async (payload) => {
      if (!pcRef.current || !payload.candidate) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        console.log("✅ ICE candidate añadido:", payload.candidate);
      } catch (err) {
        console.error("❌ Error addIceCandidate:", err);
      }
    });

    s.on("llamada_ocupado", (payload) => {
      console.log("🚫 Veterinario ocupado:", payload);
      setCallStatus("ocupado");
      setQueuePosition(payload?.posicion ?? null);
    });

    s.on("llamada_rechazada", (payload) => {
      console.log("❌ Llamada rechazada:", payload);
      setCallStatus("rechazada");
      setQueuePosition(null);
      setShowEmergencyModal(false);
      finalizarLlamada(false);
    });

    s.on("call_accepted", (payload) => {
      console.log("✅ Llamada aceptada:", payload);
      setCallStatus("en_llamada");
      setQueuePosition(null);
    });

    s.on("call_ended", (payload) => {
      console.log("📞 Llamada finalizada:", payload);
      finalizarLlamada(false);
    });

    s.on("en_cola", (payload) => {
      console.log("⏳ En cola:", payload);
      setCallStatus("en_cola");
      setQueuePosition(payload?.posicion ?? null);
    });

    s.on("llamada_adelantada", (payload) => {
      console.log("⏩ Llamada adelantada:", payload);
      setCallStatus("en_cola");
      setQueuePosition(payload?.posicion ?? null);
      if (payload?.posicion === 1) {
        iniciarLlamada();
      }
    });

    s.on("disconnect", () => {
      console.log("🔌 Socket desconectado");
      finalizarLlamada(false);
    });

    return () => {
      s.disconnect();
      finalizarLlamada(false);
    };
  }, [user]);

  // Reproducción de video
  useEffect(() => {
    const playVideo = async (videoRef, stream) => {
      if (videoRef.current && stream && stream.getTracks().length > 0) {
        if (!videoRef.current.srcObject) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            console.log("Reproducción iniciada correctamente:", stream.getTracks().map((t) => t.kind));
          } catch (error) {
            console.error("Error al reproducir video:", error);
            if (error.name === "AbortError") {
              setTimeout(() => {
                if (videoRef.current && stream && !videoRef.current.srcObject) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play().catch((e) => console.error("Reintento fallido:", e));
                }
              }, 500);
            }
          }
        }
      }
    };

    if (callInProgress && localVideoRef.current && localStreamRef.current) {
      playVideo(localVideoRef, localStreamRef.current);
    }
    if (callInProgress && remoteVideoRef.current && remoteStreamRef.current) {
      playVideo(remoteVideoRef, remoteStreamRef.current);
    }
  }, [callInProgress]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, []);

  // Cargar cámaras disponibles
  const askAndLoadCameras = async () => {
    try {
      setLoadingDevices(true);
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoInputs);
      if (!selectedCameraId && videoInputs[0]) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
      if (tmp) tmp.getTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error("No se pudo obtener dispositivos de video:", err);
      setCameras([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  // Abrir modal de reserva
  const openReservaModal = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setForm((f) => ({
      ...f,
      cliente_id: user.id || user._id || user.id_cliente,
      mascota_id: "",
      veterinario_id: "",
      servicio_id: "",
      fecha: "",
      hora: "07:00",
      estado: "pendiente",
    }));
    setReservaError("");
    setReservaSuccess("");
    setShowReservaModal(true);
  };

  // Cerrar sesión
  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  // Validar y crear reserva
  const validarYCrearReserva = async (e) => {
    e?.preventDefault?.();
    setReservaError("");
    setReservaSuccess("");
    setLoadingReservaSubmit(true);

    const { cliente_id, mascota_id, veterinario_id, servicio_id, fecha, hora } = form;

    if (!cliente_id) {
      setReservaError("⚠️ Debes iniciar sesión para crear una reserva.");
      setLoadingReservaSubmit(false);
      return;
    }
    if (!mascota_id) {
      setReservaError("⚠️ Debes seleccionar una mascota.");
      setLoadingReservaSubmit(false);
      return;
    }
    if (!veterinario_id) {
      setReservaError("⚠️ Debes seleccionar un veterinario.");
      setLoadingReservaSubmit(false);
      return;
    }
    if (!servicio_id) {
      setReservaError("⚠️ Debes seleccionar un servicio.");
      setLoadingReservaSubmit(false);
      return;
    }
    if (!fecha || !hora) {
      setReservaError("⚠️ Debes ingresar la fecha y hora de la reserva.");
      setLoadingReservaSubmit(false);
      return;
    }

    const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(hora)) {
      setReservaError("⚠️ La hora ingresada no es válida (formato HH:mm, ej. 08:00).");
      setLoadingReservaSubmit(false);
      return;
    }

    let fechaHora;
    try {
      fechaHora = parse(`${fecha} ${hora}`, "yyyy-MM-dd HH:mm", new Date());
      if (!isValidDate(fechaHora)) {
        setReservaError("⚠️ La fecha u hora ingresada no es válida.");
        setLoadingReservaSubmit(false);
        return;
      }
    } catch (err) {
      setReservaError("⚠️ Error al procesar la fecha y hora.");
      setLoadingReservaSubmit(false);
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaHora < hoy) {
      setReservaError("⚠️ No puedes agendar citas en fechas pasadas.");
      setLoadingReservaSubmit(false);
      return;
    }

    const horaNum = fechaHora.getHours();
    const minutos = fechaHora.getMinutes();
    if (horaNum < 7 || horaNum >= 21) {
      setReservaError("⚠️ Solo se pueden agendar citas entre las 07:00 y las 21:00.");
      setLoadingReservaSubmit(false);
      return;
    }

    if (minutos !== 0 && minutos !== 30) {
      setReservaError("⚠️ La hora debe ser en intervalos de 30 minutos (ej. 08:00, 08:30).");
      setLoadingReservaSubmit(false);
      return;
    }

    const conflicto = reservas.some((reserva) => {
      const diff = Math.abs(differenceInMinutes(fechaHora, reserva.fecha));
      return diff < 60;
    });

    if (conflicto) {
      setReservaError("⚠️ Ya existe una reserva dentro del rango de 1 hora.");
      setLoadingReservaSubmit(false);
      return;
    }

    const servicioSeleccionado = servicios.find((s) => s.id === servicio_id || s._id === servicio_id);
    if (!servicioSeleccionado) {
      setReservaError("❌ No se encontró el servicio seleccionado.");
      setLoadingReservaSubmit(false);
      return;
    }

    const fechaHoraISO = format(fechaHora, "yyyy-MM-dd'T'HH:mm:ss'Z'", { locale: es });

    try {
      const response = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          cliente_id,
          mascota_id,
          veterinario_id,
          servicio_id,
          fecha: fechaHoraISO,
          estado: "pendiente",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Error al crear reserva: ${response.status} ${response.statusText}`, text);
        setReservaError(`❌ No se pudo crear la cita: ${text || "Error desconocido"}`);
        setLoadingReservaSubmit(false);
        return;
      }

      setReservaSuccess("✅ Cita creada correctamente.");
      setShowReservaModal(false);
    } catch (err) {
      console.error("Error creando reserva:", err);
      setReservaError("❌ No se pudo crear la cita: " + err.message);
    } finally {
      setLoadingReservaSubmit(false);
    }
  };

  // Abrir modal de emergencia
  const abrirModalEmergencia = async () => {
    setSelectedVetForCall(veterinarios[0]?.id || veterinarios[0]?._id || "");
    setShowEmergencyModal(true);
    setCallStatus("");
    setQueuePosition(null);
    await askAndLoadCameras();
  };

  // Iniciar videollamada
  const iniciarLlamada = async () => {
    if (!socket) {
      alert("Error: Socket no conectado");
      setCallStatus("error");
      return;
    }
    if (!selectedVetForCall) {
      alert("Selecciona un veterinario para la llamada.");
      setCallStatus("error");
      return;
    }

    if (!user) {
      setGuestError("");
      if (!guestName || !guestPhone) {
        setShowGuestModal(true);
        return;
      }
    }

    let retryCount = 0;
    const maxRetries = 3;

    const attemptConnection = async () => {
      try {
        setCallStatus("conectando");
        setQueuePosition(null);

        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "user" }),
          },
          audio: true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints).catch((err) => {
          console.error("Error al acceder a medios:", err);
          if (err.name === "NotAllowedError") {
            throw new Error("Permisos de cámara o micrófono denegados. Por favor, concede los permisos.");
          } else if (err.name === "NotFoundError") {
            throw new Error("No se encontraron dispositivos de cámara o micrófono.");
          } else {
            throw new Error("No se pudo acceder a la cámara o micrófono: " + err.message);
          }
        });

        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          console.log("Añadiendo track local:", track.kind);
          pc.addTrack(track, stream);
        });

        const remoteStream = new MediaStream();
        remoteStreamRef.current = remoteStream;

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            event.streams[0].getTracks().forEach((track) => {
              if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
                remoteStream.addTrack(track);
                console.log("Añadiendo track remoto:", track.kind);
              }
            });
            if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.srcObject = remoteStream;
              const playPromise = remoteVideoRef.current.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log("Reproducción remota iniciada correctamente");
                  })
                  .catch((error) => {
                    console.error("Error al reproducir video remoto:", error);
                    if (error.name === "AbortError") {
                      setTimeout(() => {
                        if (remoteVideoRef.current && remoteStream) {
                          remoteVideoRef.current.srcObject = remoteStream;
                          remoteVideoRef.current.play().catch((e) => console.error("Reintento fallido:", e));
                        }
                      }, 500);
                    }
                  });
              }
            }
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Enviando ICE candidate:", event.candidate);
            socket.emit("webrtc_ice_candidate", {
              to: selectedVetForCall,
              from: user?.id || user?._id || user?.id_cliente || EMERGENCY_USER_ID,
              candidate: event.candidate,
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", pc.iceConnectionState);
          if (pc.iceConnectionState === "disconnected" && retryCount < maxRetries) {
            console.log(`Reintentando conexión (${retryCount + 1}/${maxRetries})...`);
            retryCount++;
            setCallStatus("reconectando");
            setTimeout(() => {
              if (pcRef.current) {
                pcRef.current.restartIce();
              }
            }, 1000);
          } else if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.log("❌ Conexión ICE fallida después de reintentos");
            setCallStatus("error");
            socket.emit("finalizar_llamada", {
              usuarioId: user?.id || user?._id || user?.id_cliente || EMERGENCY_USER_ID,
              veterinarioId: selectedVetForCall,
            });
            finalizarLlamada(false);
          } else if (pc.iceConnectionState === "connected") {
            setCallStatus("en_llamada");
          }
        };

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        socket.emit("iniciar_llamada", {
          usuarioId: user?.id || user?._id || user?.id_cliente || EMERGENCY_USER_ID,
          veterinarioId: selectedVetForCall,
          motivo: "Emergencia",
          extra: {
            cliente_nombre: user ? user.nombre : guestName,
            cliente_telefono: user ? user.telefono : guestPhone,
          },
        });

        socket.emit("webrtc_offer", {
          to: selectedVetForCall,
          from: user?.id || user?._id || user?.id_cliente || EMERGENCY_USER_ID,
          sdp: pc.localDescription,
        });

        setCallInProgress(true);
        setCallStatus("esperando");
      } catch (err) {
        console.error("❌ Error al iniciar llamada:", err);
        setCallStatus("error");
        alert(`Error: ${err.message}`);
        finalizarLlamada(false);
      }
    };

    await attemptConnection();
  };

  // Finalizar llamada
  const finalizarLlamada = async (emitFinalize = true) => {
    try {
      if (emitFinalize && socket && selectedVetForCall) {
        socket.emit("finalizar_llamada", {
          usuarioId: user?.id || user?._id || user?.id_cliente || EMERGENCY_USER_ID,
          veterinarioId: selectedVetForCall,
        });
      }
    } catch (e) {
      console.warn("Error al emitir finalización:", e);
    }

    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((sender) => {
          if (sender.track) sender.track.stop();
        });
        pcRef.current.close();
      } catch (e) {
        console.error("Error al cerrar peer connection:", e);
      }
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

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCallInProgress(false);
    setCallStatus("");
    setQueuePosition(null);
    setShowEmergencyModal(false);
    setShowGuestModal(false);
    setGuestName("");
    setGuestPhone("");
  };

  // Render
  return (
    <>
      <style>{styles}</style>
      <Navbar
        bg="dark"
        variant="dark"
        className="justify-content-between p-3"
        style={{ fontFamily: "'Inter', sans-serif", transition: "all 0.3s ease" }}
      >
        <Navbar.Brand style={{ color: "#e5e7eb" }}>
          Veterinaria Vidapets
        </Navbar.Brand>
        <div style={{ color: "#e5e7eb", fontSize: "clamp(0.8rem, 3vw, 0.9rem)" }}>
          Horario: Lun-Vie 7:00 AM - 21:00 PM
        </div>
        <div>
          {!user ? (
            <>
              <Link href="/login" passHref legacyBehavior>
                <Button variant="outline-light" className="mx-2 btn-animated">
                  Login
                </Button>
              </Link>
              <Link href="/registro" passHref legacyBehavior>
                <Button variant="outline-light" className="btn-animated">
                  Registro
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/usuario/dashboard" passHref legacyBehavior>
                <Button variant="outline-light" className="mx-2 btn-animated">
                  Mascotas
                </Button>
              </Link>
              <NavDropdown
                title={user.nombre || user.name || "Perfil"}
                id="perfil-dropdown"
                align="end"
                style={{ color: "#e5e7eb" }}
                data-bs-theme={theme}
              >
                <NavDropdown.ItemText style={{ color: currentTheme.navbarText }}>
                  <strong>{user.nombre || user.name || ""}</strong>
                  <div style={{ fontSize: "0.9rem", color: currentTheme.navbarText }}>
                    {user.correo || user.email}
                  </div>
                </NavDropdown.ItemText>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={logout} style={{ color: currentTheme.navbarText }}>
                  Salir
                </NavDropdown.Item>
              </NavDropdown>
            </>
          )}
          <Button
            variant="outline-light"
            className="mx-2 btn-animated"
            onClick={toggleTheme}
          >
            <i className={`bi bi-${theme === "dark" ? "sun-fill" : "moon-fill"} me-1`}></i>
            {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          </Button>
        </div>
      </Navbar>

      <Navbar
        bg={theme}
        variant={theme}
        className="p-3"
        style={{ fontFamily: "'Inter', sans-serif", transition: "all 0.3s ease" }}
        data-aos="fade-down"
      >
        <Navbar.Brand>
          <img
            src="https://vidapetsoficial.com/site/wp-content/uploads/elementor/thumbs/club2-q6h1hktkxecyxunbgfhre8z13abtbboq6f1tjzbho4.png"
            alt="Logo"
            style={{ height: 40, filter: theme === "light" ? "brightness(0) invert(1)" : "none" }}
          />
        </Navbar.Brand>
        <Nav className="me-auto">
          <Nav.Link as={Link} href="/" style={{ color: currentTheme.navbarText }}>
            Inicio
          </Nav.Link>
          <NavDropdown
            title="Servicios"
            id="servicios-dropdown"
            style={{ color: currentTheme.navbarText }}
          >
            <NavDropdown.Item as={Link} href="#" style={{ color: currentTheme.navbarText }}>
              Medicina
            </NavDropdown.Item>
            <NavDropdown.Item as={Link} href="#" style={{ color: currentTheme.navbarText }}>
              Cirugía
            </NavDropdown.Item>
            <NavDropdown.Item as={Link} href="#" style={{ color: currentTheme.navbarText }}>
              Vacunaciones
            </NavDropdown.Item>
            <NavDropdown.Item as={Link} href="#" style={{ color: currentTheme.navbarText }}>
              Desparasitaciones
            </NavDropdown.Item>
          </NavDropdown>
          <Nav.Link as={Link} href="#" style={{ color: currentTheme.navbarText }}>
            Contacto
          </Nav.Link>
        </Nav>
      </Navbar>

      <Container
        className="mt-4"
        style={{
          fontFamily: "'Inter', sans-serif",
          backgroundColor: currentTheme.containerBg,
          color: currentTheme.textColor,
          transition: "all 0.3s ease",
        }}
        data-aos="fade-up"
      >
        <div style={{ position: "relative" }} data-aos="zoom-in">
          <div className="carousel-container">
            <Carousel style={{ opacity: 0.8 }}>
              <Carousel.Item>
                <img
                  className="d-block w-100"
                  src="https://www.kivet.com/wp-content/uploads/2020/09/veterinario-gatito-min.jpg"
                  alt="Imagen 1"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  className="d-block w-100"
                  src="https://i.postimg.cc/L5sLRtRV/gato1.jpg"
                  alt="Imagen 2"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  className="d-block w-100"
                  src="https://i.postimg.cc/YSwFjKM0/gato2.jpg"
                  alt="Imagen 3"
                />
              </Carousel.Item>
            </Carousel>
          </div>

          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: currentTheme.textColor,
              textShadow: `2px 2px 4px rgba(0,0,0,${theme === "dark" ? 0.7 : 0.3})`,
              zIndex: 10,
            }}
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <h1 style={{ fontWeight: 700, fontSize: "clamp(1.5rem, 6vw, 2.5rem)" }}>
              Cuida a los animales como quieres que te cuiden a ti
            </h1>
          </div>

          <div
            style={{
              position: "absolute",
              top: "60%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              zIndex: 10,
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              justifyContent: "center",
            }}
            data-aos="fade-up"
            data-aos-delay="400"
          >
            <Button
              variant="primary"
              className="m-2 btn-animated"
              onClick={openReservaModal}
            >
              Reservar Cita
            </Button>
            <Button
              variant="success"
              className="m-2 btn-animated"
              onClick={abrirModalEmergencia}
            >
              Veterinaria Online
            </Button>
            {user ? (
              <Link href="/usuario/dashboard" passHref legacyBehavior>
                <Button variant="warning" className="m-2 btn-animated">
                  Ver Mascotas
                </Button>
              </Link>
            ) : (
              <Button
                variant="warning"
                className="m-2 btn-animated"
                onClick={() => setShowLoginPrompt(true)}
              >
                Iniciar Sesión
              </Button>
            )}
          </div>
        </div>

        <h2
          className="mt-5"
          style={{ fontWeight: 600, color: currentTheme.cardText }}
          data-aos="fade-up"
        >
          Servicios Veterinarios
        </h2>
        <div className="d-flex flex-wrap justify-content-center">
          {[
            {
              title: "Consultas",
              description: "Evaluaciones completas para diagnosticar y tratar cualquier problema de salud de tu mascota.",
              image: "https://www.shutterstock.com/image-photo/veterinarian-examining-dog-clinic-600w-1726128958.jpg",
            },
            {
              title: "Tratamientos",
              description: "Soluciones personalizadas para enfermedades, lesiones y cuidados preventivos de tu mascota.",
              image: "https://www.shutterstock.com/image-photo/veterinarian-giving-injection-dog-600w-1726128961.jpg",
            },
            {
              title: "Vacunaciones",
              description: "Protege a tu mascota con vacunas esenciales para prevenir enfermedades comunes.",
              image: "https://cdn-icons-png.flaticon.com/512/2650/2650601.png",
            },
            {
              title: "Desparasitaciones",
              description: "Tratamientos efectivos para eliminar parásitos internos y externos, garantizando su bienestar.",
              image: "https://cdn-icons-png.flaticon.com/512/4907/4907925.png",
            },
          ].map((servicio, index) => (
            <Card
              key={servicio.title}
              className="service-card"
              style={{
                backgroundColor: currentTheme.cardBg,
                color: currentTheme.cardText,
                borderColor: currentTheme.borderColor,
                "--order": index,
              }}
              data-aos="fade-up"
              data-aos-delay={index * 200}
            >
              <Card.Img
                variant="top"
                src={servicio.image}
                style={{ height: "150px", objectFit: "cover" }}
              />
              <Card.Body>
                <Card.Title style={{ fontWeight: 600, color: currentTheme.cardText }}>
                  {servicio.title}
                </Card.Title>
                <Card.Text style={{ color: currentTheme.cardText }}>
                  {servicio.description}
                </Card.Text>
              </Card.Body>
            </Card>
          ))}
        </div>

        <h2
          className="mt-5"
          style={{ fontWeight: 600, color: currentTheme.cardText }}
          data-aos="fade-up"
        >
          Promociones
        </h2>
        <div className="carousel-container" data-aos="fade-up" data-aos-delay="200">
          <Carousel>
            <Carousel.Item>
              <img
                className="d-block w-100"
                src="https://i.ytimg.com/vi/h8q3cLtrtjc/maxresdefault.jpg"
                alt="Promo 1"
              />
            </Carousel.Item>
            <Carousel.Item>
              <img
                className="d-block w-100"
                src="https://petkorp.com/wp-content/uploads/2024/04/Boton-Ofertas-1.png"
                alt="Promo 2"
              />
            </Carousel.Item>
          </Carousel>
        </div>

        <div
          className="text-center mt-5 p-4 emergency-section"
          style={{
            backgroundColor: currentTheme.emergencyBg,
            color: currentTheme.emergencyText,
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            borderRadius: "8px",
          }}
          data-aos="fade-up"
          data-aos-delay="400"
        >
          <h2 style={{ fontWeight: 600 }}>Emergencia Veterinaria</h2>
          <Button
            variant={theme === "dark" ? "light" : "dark"}
            size="lg"
            className="btn-animated"
            onClick={abrirModalEmergencia}
          >
            ¡Solicitar Ayuda!
          </Button>
        </div>
      </Container>

      {/* Modal de login */}
      <Modal
        show={showLoginPrompt}
        onHide={() => setShowLoginPrompt(false)}
        centered
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: currentTheme.modalBg,
            color: currentTheme.modalText,
            borderColor: currentTheme.modalBorder,
          }}
        >
          <Modal.Title>Inicia sesión</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            backgroundColor: currentTheme.modalBg,
            color: currentTheme.modalText,
          }}
        >
          <p>Necesitas iniciar sesión o registrarte para reservar una cita.</p>
        </Modal.Body>
        <Modal.Footer
          style={{
            backgroundColor: currentTheme.modalBg,
            borderColor: currentTheme.modalBorder,
          }}
        >
          <Link href="/login" passHref legacyBehavior>
            <Button
              variant="primary"
              className="btn-animated"
              onClick={() => setShowLoginPrompt(false)}
            >
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/registro" passHref legacyBehavior>
            <Button
              variant={theme === "dark" ? "secondary" : "outline-secondary"}
              className="btn-animated"
              onClick={() => setShowLoginPrompt(false)}
            >
              Registrarse
            </Button>
          </Link>
        </Modal.Footer>
      </Modal>

      {/* Modal de reserva */}
      <Modal
        show={showReservaModal}
        onHide={() => setShowReservaModal(false)}
        centered
        size="lg"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: currentTheme.modalBg,
            color: currentTheme.modalText,
            borderColor: currentTheme.modalBorder,
          }}
        >
          <Modal.Title>Reservar Cita</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            backgroundColor: currentTheme.modalBg,
            color: currentTheme.modalText,
          }}
        >
          {reservaError && <Alert variant="danger">{reservaError}</Alert>}
          {reservaSuccess && <Alert variant="success">{reservaSuccess}</Alert>}
          <Form onSubmit={validarYCrearReserva}>
            <Row>
              <Col md={6} xs={12}>
                <Form.Group className="mb-2">
                  <Form.Label>Cliente</Form.Label>
                  <Form.Control
                    value={user ? user.nombre || user.name || "" : ""}
                    readOnly
                    style={{
                      backgroundColor: currentTheme.formBg,
                      color: currentTheme.formText,
                      borderColor: currentTheme.formBorder,
                    }}
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Mascota</Form.Label>
                  <Form.Select
                    value={form.mascota_id}
                    onChange={(e) => setForm((f) => ({ ...f, mascota_id: e.target.value }))}
                    required
                    style={{
                      backgroundColor: currentTheme.formBg,
                      color: currentTheme.formText,
                      borderColor: currentTheme.formBorder,
                    }}
                  >
                    <option value="">Selecciona una mascota</option>
                    {misMascotas.length === 0 ? (
                      <option disabled>-- No tienes mascotas registradas --</option>
                    ) : (
                      misMascotas.map((m) => (
                        <option key={m.id || m._id} value={m.id || m._id}>
                          {m.nombre} ({m.especie || m.raza || ""})
                        </option>
                      ))
                    )}
                  </Form.Select>
                  {misMascotas.length === 0 && (
                    <div className="mt-2">
                      <Alert variant="warning">
                        No tienes mascotas registradas.{" "}
                        <Link href="/usuario/dashboard">Registra una mascota</Link>
                      </Alert>
                    </div>
                  )}
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Veterinario</Form.Label>
                  <Form.Select
                    value={form.veterinario_id}
                    onChange={(e) => setForm((f) => ({ ...f, veterinario_id: e.target.value }))}
                    required
                    style={{
                      backgroundColor: currentTheme.formBg,
                      color: currentTheme.formText,
                      borderColor: currentTheme.formBorder,
                    }}
                  >
                    <option value="">Selecciona un veterinario</option>
                    {veterinarios.map((v) => (
                      <option key={v.id || v._id} value={v.id || v._id}>
                        {v.nombre || v.name} {v.apellido ? ` ${v.apellido}` : ""}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Servicio</Form.Label>
                  <Form.Select
                    value={form.servicio_id}
                    onChange={(e) => setForm((f) => ({ ...f, servicio_id: e.target.value }))}
                    required
                    style={{
                      backgroundColor: currentTheme.formBg,
                      color: currentTheme.formText,
                      borderColor: currentTheme.formBorder,
                    }}
                  >
                    <option value="">Selecciona un servicio</option>
                    {servicios.map((s) => (
                      <option key={s.id || s._id} value={s.id || s._id}>
                        {s.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} xs={12}>
                <Form.Group className="mb-2">
                  <Form.Label>Fecha</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                    required
                    style={{
                      backgroundColor: currentTheme.formBg,
                      color: currentTheme.formText,
                      borderColor: currentTheme.formBorder,
                    }}
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Hora</Form.Label>
                  <Form.Control
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                    step="1800"
                    required
                    style={{
                      backgroundColor: currentTheme.formBg,
                      color: currentTheme.formText,
                      borderColor: currentTheme.formBorder,
                    }}
                  />
                  <Form.Text style={{ color: currentTheme.formText }}>
                    Horario disponible: 07:00 - 21:00, intervalos de 30 minutos
                  </Form.Text>
                </Form.Group>
                <div className="mt-4 d-flex gap-2 flex-wrap">
                  <Button
                    variant={theme === "dark" ? "secondary" : "outline-secondary"}
                    className="btn-animated"
                    onClick={() => setShowReservaModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="success"
                    className="btn-animated"
                    type="submit"
                    disabled={loadingReservaSubmit}
                  >
                    {loadingReservaSubmit ? (
                      <>
                        <Spinner animation="border" size="sm" /> Guardando...
                      </>
                    ) : (
                      "Confirmar reserva"
                    )}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal de emergencia */}
      <Modal
        show={showEmergencyModal}
        onHide={() => finalizarLlamada(true)}
        size="lg"
        centered
        backdrop="static"
        className="modal-emergency"
        style={{ fontFamily: "'Inter', sans-serif" }}
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
            {callInProgress ? (
              <>
                <i className="bi bi-camera-video me-2"></i>Videollamada en curso
              </>
            ) : (
              <>
                <i className="bi bi-telephone-fill me-2"></i>Llamada de Emergencia
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            backgroundColor: currentTheme.modalBg,
            color: currentTheme.modalText,
          }}
        >
          {!callInProgress ? (
            <>
              <Row className="g-3">
                <Col md={6} xs={12}>
                  <Form.Group>
                    <Form.Label>Veterinario</Form.Label>
                    <Form.Select
                      value={selectedVetForCall}
                      onChange={(e) => setSelectedVetForCall(e.target.value)}
                      style={{
                        backgroundColor: currentTheme.formBg,
                        color: currentTheme.formText,
                        borderColor: currentTheme.formBorder,
                      }}
                    >
                      {veterinarios.length === 0 ? (
                        <option disabled>No hay veterinarios disponibles</option>
                      ) : (
                        veterinarios.map((v) => (
                          <option key={v.id || v._id} value={v.id || v._id}>
                            {v.nombre} {v.apellido || ""}
                          </option>
                        ))
                      )}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6} xs={12}>
                  <Form.Group>
                    <Form.Label>Cámara</Form.Label>
                    {loadingDevices ? (
                      <div className="d-flex align-items-center gap-2">
                        <Spinner animation="border" size="sm" /> Cargando cámaras...
                      </div>
                    ) : cameras.length > 0 ? (
                      <Form.Select
                        value={selectedCameraId}
                        onChange={(e) => setSelectedCameraId(e.target.value)}
                        style={{
                          backgroundColor: currentTheme.formBg,
                          color: currentTheme.formText,
                          borderColor: currentTheme.formBorder,
                        }}
                      >
                        {cameras.map((c) => (
                          <option key={c.deviceId} value={c.deviceId}>
                            {c.label || `Cámara ${c.deviceId.slice(0, 6)}`}
                          </option>
                        ))}
                      </Form.Select>
                    ) : (
                      <div className="d-flex gap-2 align-items-center">
                        <Alert variant="warning" className="mb-0">
                          No se detectaron cámaras. Concede permisos y vuelve a intentar.
                        </Alert>
                        <Button
                          size="sm"
                          variant={theme === "dark" ? "outline-secondary" : "outline-dark"}
                          className="btn-animated"
                          onClick={askAndLoadCameras}
                        >
                          Reintentar
                        </Button>
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {!user && (
                <Alert variant="info" className="mt-3">
                  Puedes llamar sin iniciar sesión. Te pediremos nombre y teléfono para contactarte si se corta.
                </Alert>
              )}

              {callStatus === "rechazada" && (
                <Alert variant="danger" className="mt-3">
                  El veterinario ha rechazado la llamada.
                </Alert>
              )}
              {callStatus === "ocupado" && (
                <Alert variant="warning" className="mt-3">
                  El veterinario está ocupado. Serás añadido a la cola automáticamente.
                </Alert>
              )}
              {callStatus === "en_cola" && (
                <Alert variant="primary" className="mt-3">
                  Estás en la cola {queuePosition ? `(posición ${queuePosition})` : ""}. Te conectaremos automáticamente cuando el veterinario esté disponible.
                </Alert>
              )}
              {callStatus === "error" && (
                <Alert variant="danger" className="mt-3">
                  Error al iniciar la llamada. Por favor, intenta de nuevo.
                </Alert>
              )}
              {callStatus === "reconectando" && (
                <Alert variant="warning" className="mt-3">
                  Intentando reconectar...
                </Alert>
              )}

              <div className="d-flex justify-content-center gap-3 mt-4 flex-wrap">
                <Button
                  variant={theme === "dark" ? "secondary" : "outline-secondary"}
                  className="btn-animated"
                  onClick={() => finalizarLlamada(true)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="btn-animated"
                  onClick={iniciarLlamada}
                  disabled={callStatus === "en_cola" || callStatus === "conectando" || callStatus === "reconectando"}
                >
                  {callStatus === "conectando" || callStatus === "reconectando" ? (
                    <>
                      <Spinner animation="border" size="sm" /> Conectando...
                    </>
                  ) : (
                    "Iniciar Videollamada"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div
                className="position-relative video-call-container"
                style={{ height: "clamp(200px, 50vh, 400px)" }}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-100 h-100"
                  style={{
                    backgroundColor: "#000",
                    borderRadius: "12px",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "20px",
                    right: "20px",
                    width: "clamp(80px, 25vw, 120px)",
                    height: "clamp(100px, 30vw, 160px)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: `2px solid ${currentTheme.borderColor}`,
                    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                    zIndex: 10,
                  }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-100 h-100"
                    style={{
                      transform: "scaleX(-1)",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div className="position-absolute top-0 start-0 p-2">
                  <span
                    className={`badge ${callStatus === "en_llamada" ? "bg-success" : callStatus === "reconectando" ? "bg-warning" : "bg-primary"}`}
                  >
                    {callStatus === "esperando"
                      ? "Esperando respuesta..."
                      : callStatus === "en_llamada"
                        ? "En llamada"
                        : callStatus === "reconectando"
                          ? "Reconectando..."
                          : callStatus === "en_cola"
                            ? `En cola${queuePosition ? ` (posición ${queuePosition})` : ""}`
                            : "Error"}
                  </span>
                </div>
              </div>
              <div className="d-flex justify-content-center mt-3">
                <Button
                  variant="danger"
                  className="btn-animated"
                  onClick={() => finalizarLlamada(true)}
                  style={{ width: "clamp(100px, 30vw, 120px)" }}
                >
                  Colgar
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal para datos de invitado */}
      <Modal
        show={showGuestModal}
        onHide={() => setShowGuestModal(false)}
        centered
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: currentTheme.modalBg,
            color: currentTheme.modalText,
            borderColor: currentTheme.modalBorder,
          }}
        >
          <Modal.Title>Datos para Emergencia</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            backgroundColor: currentTheme.modalBg,
            color: currentTheme.modalText,
          }}
        >
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ingresa tu nombre"
                style={{
                  backgroundColor: currentTheme.formBg,
                  color: currentTheme.formText,
                  borderColor: currentTheme.formBorder,
                }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="Ingresa tu teléfono"
                style={{
                  backgroundColor: currentTheme.formBg,
                  color: currentTheme.formText,
                  borderColor: currentTheme.formBorder,
                }}
              />
            </Form.Group>
            {guestError && <Alert variant="danger">{guestError}</Alert>}
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Button
                variant={theme === "dark" ? "secondary" : "outline-secondary"}
                className="btn-animated"
                onClick={() => setShowGuestModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="btn-animated"
                onClick={() => {
                  if (!guestName || !guestPhone) {
                    setGuestError("Por favor, completa todos los campos.");
                    return;
                  }
                  setShowGuestModal(false);
                  iniciarLlamada();
                }}
              >
                Continuar
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}