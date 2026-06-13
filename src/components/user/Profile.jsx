import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./profile.css";
import Navbar from "../Navbar";
//import { UnderlineNav } from "@primer/react";
//import { BookIcon, RepoIcon } from "@primer/octicons-react";
import HeatMapProfile from "./HeatMap";
import { useAuth } from "../../authContext";

const Profile = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const [userDetails, setUserDetails] = useState({
    username: "Loading...",
  });

  const [isFollowing, setIsFollowing] = useState(false);

  const userId = localStorage.getItem("userId");

  // 🔥 For now → self profile
  const profileUserId = userId;

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    fetchUserDetails();

    // ❌ Don't check follow for self
    if (userId !== profileUserId) {
      checkFollowStatus();
    }
  }, [userId]);

  // ✅ FIXED URL
  const fetchUserDetails = async () => {
    try {
      const res = await axios.get(
        `http://localhost:3002/user/profile/${userId}`
      );
      setUserDetails(res.data);
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  // ✅ SAFE follow check
  const checkFollowStatus = async () => {
    try {
      const res = await axios.get(
        `http://localhost:3002/user/is-following/${userId}/${profileUserId}`
      );

      setIsFollowing(res.data.isFollowing);
    } catch (err) {
      console.warn("Follow check skipped (route may not exist yet)");
    }
  };

  // ✅ SAFE follow handler
  const handleFollow = async () => {
    // ❌ prevent self-follow
    if (userId === profileUserId) return;

    try {
      await axios.post(`http://localhost:3002/user/follow`, {
        followerId: userId,
        followingId: profileUserId,
      });

      setIsFollowing((prev) => !prev);
    } catch (err) {
      console.warn("Follow API not ready yet");
    }
  };

  // 🔥 Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setCurrentUser(null);
    navigate("/login");
  };

  return (
    <>
      <Navbar />

      {/* NAV */}
      <div className="profile-nav">
        <UnderlineNav aria-label="Profile Navigation">
          <UnderlineNav.Item icon={BookIcon} aria-current="page">
            Overview
          </UnderlineNav.Item>

          <UnderlineNav.Item
            icon={RepoIcon}
            onClick={() => navigate("/dashboard")}
          >
            Repositories
          </UnderlineNav.Item>
        </UnderlineNav>
      </div>

      {/* MAIN */}
      <div className="profile-container">
        
        {/* LEFT */}
        <div className="profile-left">
          <div className="profile-image"></div>

          <h2 className="profile-name">{userDetails.username}</h2>

          {/* ✅ Hide button for self */}
          {userId !== profileUserId && (
            <button
              className={`follow-btn ${isFollowing ? "active" : ""}`}
              onClick={handleFollow}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}

          <div className="profile-follow">
            <span>
              {userDetails.followers?.length || 0} followers
            </span>
            <span>
              {userDetails.following?.length || 0} following
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="profile-right">
          <div className="heatmap-wrapper">
            <HeatMapProfile />
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Profile;

// import React, { useEffect, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import axios from "axios";
// import "./profile.css";
// import Navbar from "../Navbar";
// import { UnderlineNav } from "@primer/react";
// import { BookIcon, RepoIcon } from "@primer/octicons-react";
// import HeatMapProfile from "./HeatMap";
// import { useAuth } from "../../authContext";

// const Profile = () => {
//   const navigate = useNavigate();
//   const [userDetails, setUserDetails] = useState({ username: "username" });
//   const { setCurrentUser } = useAuth();

//   useEffect(() => {
//     const fetchUserDetails = async () => {
//       const userId = localStorage.getItem("userId");

//       if (userId) {
//         try {
//           const response = await axios.get(
//             `http://localhost:3002/userProfile/${userId}`
//           );
//           setUserDetails(response.data);
//         } catch (err) {
//           console.error("Cannot fetch user details: ", err);
//         }
//       }
//     };
//     fetchUserDetails();
//   }, []);

//   return (
//     <>
//       <Navbar />
//       <UnderlineNav aria-label="Repository">
//         <UnderlineNav.Item
//           aria-current="page"
//           icon={BookIcon}
//           sx={{
//             backgroundColor: "transparent",
//             color: "white",
//             "&:hover": {
//               textDecoration: "underline",
//               color: "white",
//             },
//           }}
//         >
//           Overview
//         </UnderlineNav.Item>

//         <UnderlineNav.Item
//           onClick={() => navigate("/repo")}
//           icon={RepoIcon}
//           sx={{
//             backgroundColor: "transparent",
//             color: "whitesmoke",
//             "&:hover": {
//               textDecoration: "underline",
//               color: "white",
//             },
//           }}
//         >
//           Starred Repositories
//         </UnderlineNav.Item>
//       </UnderlineNav>

//       <button
//         onClick={() => {
//           localStorage.removeItem("token");
//           localStorage.removeItem("userId");
//           setCurrentUser(null);

//           window.location.href = "/auth";
//         }}
//         style={{ position: "fixed", bottom: "50px", right: "50px" }}
//         id="logout"
//       >
//         Logout
//       </button>

//       <div className="profile-page-wrapper">
//         <div className="user-profile-section">
//           <div className="profile-image"></div>

//           <div className="name">
//             <h3>{userDetails.username}</h3>
//           </div>

//           <button className="follow-btn">Follow</button>

//           <div className="follower">
//             <p>10 Follower</p>
//             <p>3 Following</p>
//           </div>
//         </div>

//         <div className="heat-map-section">
//           <HeatMapProfile />
//         </div>
//       </div>
//     </>
//   );
// };

// export default Profile;
