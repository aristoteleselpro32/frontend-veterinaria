// Puedes controlar si estás en desarrollo o producción con una variable de entorno
const IS_PRODUCTION = true; // Cambia a false para usar localhost

export const API = {
  auth: IS_PRODUCTION
    ? "https://auth-service-2wv3.onrender.com/api/auth"
    : "http://localhost:4000/api/auth",

  usuarios: IS_PRODUCTION
    ? "https://usuarios-service-emf5.onrender.com/api/usuarios"
    : "http://localhost:4001/api/usuarios",

  veterinarios: IS_PRODUCTION
    ? "https://servicios-veterinarios.onrender.com/api/servicios-veterinarios"
    : "http://localhost:4002/api/servicios-veterinarios",

  mascotas: IS_PRODUCTION
    ? "https://mascota-service.onrender.com/api/mascotas"
    : "http://localhost:4004/api/mascotas",

  cartillas: IS_PRODUCTION
    ? "https://cartillas-service.onrender.com/api/cartillas"
    : "http://localhost:4005/api/cartillas",


  rtc: IS_PRODUCTION
    ? "https://rtc-service.onrender.com/api/rtc"
    : "http://localhost:4007/api/rtc"
};
