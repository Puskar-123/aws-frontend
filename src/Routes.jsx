import React, { useEffect } from "react";
import { useNavigate, useRoutes, useLocation } from "react-router-dom";

// Pages
import Dashboard from "./components/dashboard/Dashboard";
import Profile from "./components/user/Profile";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import Create from "./components/create/Create";
import { useAuth } from "./authContext";
import RepoPage from "./components/repo/RepoPage";

const ProjectRoutes = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userIdFromStorage = localStorage.getItem("userId");

    if (userIdFromStorage && !currentUser) {
      setCurrentUser(userIdFromStorage);
    }

    // If NOT logged in → redirect to login
    if (!userIdFromStorage && !["/login", "/signup"].includes(location.pathname)) {
      navigate("/login");
    }

    // If already logged in → prevent going to login again
    if (userIdFromStorage && location.pathname === "/login") {
      navigate("/");
    }

  }, [currentUser, navigate, setCurrentUser, location.pathname]);

  const element = useRoutes([
    {
      path: "/",
      element: <Dashboard />
    },
    {
      path: "/dashboard",
      element: <Dashboard />
    },
    {
      path: "/login",
      element: <Login />
    },
    {
      path: "/signup",
      element: <Signup />
    },
    {
      path: "/profile",
      element: <Profile />
    },
    {
      path: "/profile/:id",
      element: <Profile />
    },
    { 
      path: "/create", 
      element: <Create /> 
    },
    {
    path: "/repo/:id",
    element: <RepoPage />
    }
    ]);

  return element;
};

export default ProjectRoutes;

// import React, { useEffect } from "react";
// import {useNavigate, useRoutes} from 'react-router-dom'

// // Pages List
// import Dashboard from "./components/dashboard/Dashboard";
// import Profile from "./components/user/Profile";
// import Login from "./components/auth/Login";
// import Signup from "./components/auth/Signup";

// // Auth Context
// import { useAuth } from "./authContext";

// const ProjectRoutes = ()=>{
//     const {currentUser, setCurrentUser} = useAuth();
//     const navigate = useNavigate();

//     useEffect(()=>{
//         const userIdFromStorage = localStorage.getItem("userId");

//         if(userIdFromStorage && !currentUser){
//             setCurrentUser(userIdFromStorage);
//         }

//         if(!userIdFromStorage && !["/auth", "/signup"].includes(window.location.pathname))
//         {
//             navigate("/auth");
//         }

//         if(userIdFromStorage && window.location.pathname=='/auth'){
//             navigate("/");
//         }
//     }, [currentUser, navigate, setCurrentUser]);

//     let element = useRoutes([
//         {
//             path:"/",
//             element:<Dashboard/>
//         },
//         {
//             path:"/auth",
//             element:<Login/>
//         },
//         {
//             path:"/signup",
//             element:<Signup/>
//         },
//         {
//             path:"/profile",
//             element:<Profile/>
//         }
//     ]);

//     return element;
// }

// export default ProjectRoutes;
