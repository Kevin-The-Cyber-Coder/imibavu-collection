/* Imibavu Collection — API configuration
   Override when deploying (e.g. https://api.imibavucollection.rw/api/v1). */
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api/v1";

export default API_BASE;