import axios from "axios"

const API = axios.create({
  baseURL: "http://localhost:8080/api/auth",
})

// interceptor để tự động gắn token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const login = async (email, password) => {
  const res = await API.post("/login", { email, password })
  if (res.data?.token) {
    localStorage.setItem("token", res.data.token)
  }
  return res.data
}

export const register = async (data) => {
  return await API.post("/register", data)
}

export const getCurrentUser = async () => {
  return await API.get("/users/me")
}

export const logout = async () => {
  localStorage.removeItem("token")
  return await API.post("/logout")
}
