import React from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/contalsystem-icon.png";
import "./BrandLogo.css";

const BrandLogo = ({ compact = false, size, className = "" }) => {
  const classes = [
    "brand-logo",
    compact ? "brand-logo--compact" : "",
    size === "large" ? "brand-logo--large" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <Link className={classes} to="/" aria-label="ContalSystem home">
      <img className="brand-logo__image" src={logo} alt="" />
      <span className="brand-logo__text">ContalSystem</span>
    </Link>
  );
};

export default BrandLogo;
