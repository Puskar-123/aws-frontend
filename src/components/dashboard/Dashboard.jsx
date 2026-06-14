import React, { useState, useEffect } from "react";
import "./dashboard.css";
import Navbar from "../Navbar";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate(); // ✅ FIXED (inside component)

  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedRepositories, setSuggestedRepositories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  const userId = localStorage.getItem("userId");

  // 🔥 Fetch user's repositories
  const fetchRepositories = async () => {
    try {
      const response = await fetch(`http://13.51.176.106/repo/user/${userId}`);

      if (!response.ok) throw new Error("Failed to fetch repositories");

      const data = await response.json();

      setRepositories(data.repositories || data || []);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      setRepositories([]);
    }
  };

  // 🔥 Fetch suggested repositories
  const fetchSuggestedRepositories = async () => {
    try {
      const response = await fetch(`http://13.51.176.106/repo/all`);

      if (!response.ok) throw new Error("Failed to fetch suggested repositories");

      const data = await response.json();

      setSuggestedRepositories(data || []);
    } catch (error) {
      console.error("Error fetching suggested repositories:", error);
      setSuggestedRepositories([]);
    }
  };

  // 🔥 On load
  useEffect(() => {
    if (!userId) return;

    fetchRepositories();
    fetchSuggestedRepositories();
  }, []);

  // 🔥 Search filter
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults(repositories);
    } else {
      const filtered = repositories.filter((repo) =>
        repo.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    }
  }, [searchQuery, repositories]);

  return (
    <>
      <Navbar />

      <section id="dashboard">
        
        {/* LEFT SIDE */}
        <aside>
          <h3>Suggested Repositories</h3>

          {suggestedRepositories.length === 0 ? (
            <p>No repositories found</p>
          ) : (
            suggestedRepositories.map((repo) => (
              <div
                key={repo._id}
                className="repo-item"
                onClick={() => navigate(`/repo/${repo._id}`)} // ✅ clickable
              >
                <h4>{repo.name}</h4>
                <p>{repo.description}</p>
              </div>
            ))
          )}
        </aside>

        {/* CENTER */}
        <main>
          <h2>Your Repositories</h2>

          <div id="search">
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchResults.length === 0 ? (
            <p>No repositories found</p>
          ) : (
            searchResults.map((repo) => (
              <div
                key={repo._id}
                className="repo-item"
                onClick={() => navigate(`/repo/${repo._id}`)} // ✅ clickable
              >
                <h4>{repo.name}</h4>
                <p>{repo.description}</p>
              </div>
            ))
          )}
        </main>

        {/* RIGHT SIDE */}
        <aside>
          <h3>Upcoming Events</h3>

          <ul>
            <li><p>XXXXXXX</p></li>
            <li><p>XXXXXXX</p></li>
            <li><p>XXXXXXX</p></li>
          </ul>
        </aside>

      </section>
    </>
  );
};

export default Dashboard;

// import React, { useState, useEffect } from "react";
// import "./dashboard.css";
// import Navbar from "../Navbar";

// const Dashboard = () => {
//   const [repositories, setRepositories] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [suggestedRepositories, setSuggestedRepositories] = useState([]);
//   const [searchResults, setSearchResults] = useState([]);

//   useEffect(() => {
//     const userId = localStorage.getItem("userId");

//     const fetchRepositories = async () => {
//       try {
//         const response = await fetch(
//           `http://localhost:3002/repo/user/${userId}`
//         );
//         const data = await response.json();
//         setRepositories(data.repositories);
//       } catch (err) {
//         console.error("Error while fecthing repositories: ", err);
//       }
//     };

//     const fetchSuggestedRepositories = async () => {
//       try {
//         const response = await fetch(`http://localhost:3002/repo/all`);
//         const data = await response.json();
//         setSuggestedRepositories(data);
//         console.log(suggestedRepositories);
//       } catch (err) {
//         console.error("Error while fecthing repositories: ", err);
//       }
//     };

//     fetchRepositories();
//     fetchSuggestedRepositories();
//   }, []);

//   useEffect(() => {
//     if (searchQuery == "") {
//       setSearchResults(repositories);
//     } else {
//       const filteredRepo = repositories.filter((repo) =>
//         repo.name.toLowerCase().includes(searchQuery.toLowerCase())
//       );
//       setSearchResults(filteredRepo);
//     }
//   }, [searchQuery, repositories]);

//   return (
//     <>
//       <Navbar />
//       <section id="dashboard">
//         <aside>
//           <h3>Suggested Repositories</h3>
//           {suggestedRepositories.map((repo) => {
//             return (
//               <div key={repo._id}>
//                 <h4>{repo.name}</h4>
//                 <h4>{repo.description}</h4>
//               </div>
//             );
//           })}
//         </aside>
//         <main>
//           <h2>Your Repositories</h2>
//           <div id="search">
//             <input
//               type="text"
//               value={searchQuery}
//               placeholder="Search..."
//               onChange={(e) => setSearchQuery(e.target.value)}
//             />
//           </div>
//           {searchResults.map((repo) => {
//             return (
//               <div key={repo._id}>
//                 <h4>{repo.name}</h4>
//                 <h4>{repo.description}</h4>
//               </div>
//             );
//           })}
//         </main>
//         <aside>
//           <h3>Upcoming Events</h3>
//           <ul>
//             <li>
//               <p>Tech Conference - Dec 15</p>
//             </li>
//             <li>
//               <p>Developer Meetup - Dec 25</p>
//             </li>
//             <li>
//               <p>React Summit - Jan 5</p>
//             </li>
//           </ul>
//         </aside>
//       </section>
//     </>
//   );
// };

// export default Dashboard;
