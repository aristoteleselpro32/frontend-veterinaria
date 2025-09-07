import axios from 'axios';
import { API } from '../api';

const httpClient = axios.create({
  baseURL: API.auth,
  headers: {
    "Content-Type": "application/json",
  },
});

export default httpClient;