import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// `import.meta.env.BASE_URL` é injetado pelo Vite e bate com o `base`
// definido em vite.config.ts:
//   - dev (`npm run dev`)          → "/"
//   - prod GitHub Pages (build)    → "/tirzenix-vendas/"
// O React Router precisa saber disso para gerar URLs e navegar corretamente
// dentro do subpath do GH Pages, sem cair em 404 do root do usuário.
const basename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
