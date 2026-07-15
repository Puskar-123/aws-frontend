import React from "react";
import BrandLogo from "../common/BrandLogo";

const AuthLayout = ({ title, subtitle, children, footer }) => (
  <main className="auth-page">
    <div className="auth-page__glow" aria-hidden="true" />
    <div className="auth-container">
      <div className="auth-brand"><BrandLogo /></div>
      <header className="auth-header">
        <h1 className="auth-heading">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
      </header>
      <section className="auth-card" aria-label={title}>
        {children}
      </section>
      <div className="auth-footer">{footer}</div>
    </div>
  </main>
);

export default AuthLayout;
