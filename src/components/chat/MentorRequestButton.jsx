import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatRequest } from "../../services/chatApi";

const MentorRequestButton = ({ repositoryId, issueId }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [mentorId, setMentorId] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => Promise.all([
    chatRequest(`/repo/${repositoryId}/members`),
    chatRequest(`/repo/${repositoryId}/mentor-requests`),
  ]).then(([members, data]) => {
    const values = (members.members || []).filter((member) => ["owner", "maintainer"].includes(member.role));
    setMentors(values);
    setMentorId((value) => value || values[0]?.user?._id || "");
    setRequests(data.requests || []);
  }).catch((error) => setNotice(error.message));

  useEffect(() => {
    if (open) load();
    // Loading is intentionally tied to opening the existing request panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repositoryId]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await chatRequest(`/repo/${repositoryId}/mentor-requests`, {
        method: "POST",
        body: JSON.stringify({ mentorId, issueId, message }),
      });
      setNotice("Mentor request sent.");
      await load();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const respond = async (request, status) => {
    const data = await chatRequest(`/repo/${repositoryId}/mentor-requests/${request._id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (data.conversation) navigate(`/chat?conversation=${data.conversation._id}`);
    else load();
  };

  return <div className="mentor-entry">
    <button className="mentor-request-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Ask a Mentor</button>
    {open && <div className="mentor-popover">
      <form className="mentor-request-form" onSubmit={submit}>
        <label>Mentor
          <select aria-label="Mentor" value={mentorId} onChange={(event) => setMentorId(event.target.value)}>
            {mentors.map((mentor) => <option key={mentor.user._id} value={mentor.user._id}>{mentor.user.username} · {mentor.role}</option>)}
          </select>
        </label>
        <label>Request message
          <textarea value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <button type="submit" disabled={!mentorId}>Send Request</button>
      </form>
      <div className="mentor-pending-requests">
        {requests.filter((request) => request.status === "pending").map((request) => <article key={request._id}>
          <p>{request.requester?.username} requested help.</p>
          <button type="button" onClick={() => respond(request, "accepted")}>Accept</button>
          <button type="button" onClick={() => respond(request, "declined")}>Decline</button>
        </article>)}
      </div>
    </div>}
    {notice && <p className="mentor-request-notice" role="status">{notice}</p>}
  </div>;
};

export default MentorRequestButton;
