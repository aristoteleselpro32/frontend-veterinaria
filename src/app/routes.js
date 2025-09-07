import { API } from './api';

export const Routes = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  usuarios: API.usuarios,
  veterinarios: API.veterinarios,
  mascotas: API.mascotas,
  cartillas: API.cartillas,
  whatsapp: API.whatsapp,
  rtc: API.rtc
};