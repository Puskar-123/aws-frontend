import React from "react";
import { useParams } from "react-router-dom";

const Repo = () => {
  const { name } = useParams();

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1>Repository: {name}</h1>
      <p>This is your repo dashboard</p>
    </div>
  );
};

export default Repo;