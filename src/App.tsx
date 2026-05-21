import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Vendas from "@/pages/Vendas";
import Reservas from "@/pages/Reservas";
import Clientes from "@/pages/Clientes";
import Estoque from "@/pages/Estoque";
import Relatorios from "@/pages/Relatorios";
import Configuracoes from "@/pages/Configuracoes";
import Guia from "@/pages/Guia";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/guia" element={<Guia />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
