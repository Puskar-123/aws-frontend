import React from "react";
import { Link } from "react-router-dom";
import "./navbar.css";

const Navbar = () => {
  return (
    <nav>
      <Link to="/">
        <div>
          <img
            src="https://www.github.com/images/modules/logos_page/GitHub-Mark.png"
            alt="CodeHub Logo"
          />
          <h3>CodeHub</h3>
        </div>
      </Link>
      <div>
        <Link to="/create">
          <p>Create a Repository</p>
        </Link>
        <Link to="/profile">
          <p>Profile</p>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;


// import React from "react";
// import { Link } from "react-router-dom";
// import "./navbar.css";  

// const Navbar = () => {
//   return (
//     <nav className="navbar">
//       <Link to="/" className="nav-left">
//         <img
//           src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
//           alt="GitHub Logo"
//         />
//         <h3>GitHub</h3>
//       </Link>

//       <div className="nav-right">
//         <Link to="/create">Create a Repository</Link>
//         <Link to="/profile">Profile</Link>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;