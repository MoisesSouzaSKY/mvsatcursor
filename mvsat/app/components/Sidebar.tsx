import React from 'react';
import { NavLink } from 'react-router-dom';

const linkBaseStyle: React.CSSProperties = {
  display: 'block',
  padding: '10px 12px',
  textDecoration: 'none',
  color: '#d1d5db',
  borderRadius: 6,
  marginBottom: 6,
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease'
};

const activeStyle: React.CSSProperties = {
  backgroundColor: '#374151',
  color: 'white',
  fontWeight: 600
};

export default function Sidebar() {
  return (
    <aside style={{ 
      width: 240, 
      backgroundColor: '#1f2937',
      padding: 12, 
      height: '100vh', 
      position: 'sticky', 
      top: 0
    }}>
      <div style={{ 
        fontSize: 18, 
        fontWeight: 700, 
        marginBottom: 12,
        color: 'white',
        padding: '8px 0'
      }}>
        MV SAT
      </div>
      <nav>
        <NavLink to="/dashboard" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Dashboard</NavLink>
        <NavLink to="/clientes" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Clientes</NavLink>
        <NavLink to="/assinaturas" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Assinaturas</NavLink>
        <NavLink to="/equipamentos" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Equipamentos</NavLink>
        <NavLink to="/cobrancas" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Cobranças</NavLink>
        <NavLink to="/tvbox" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>TVBox</NavLink>
        <NavLink to="/funcionarios" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Funcionários</NavLink>
        <NavLink to="/configuracoes" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Configurações</NavLink>
      </nav>
    </aside>
  );
}



