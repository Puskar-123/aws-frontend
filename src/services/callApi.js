import{chatRequest}from"./chatApi";
export const getIceServers=()=>chatRequest("/calls/ice-servers");
export const getCallHistory=()=>chatRequest("/calls/history");
export const getActiveCall=()=>chatRequest("/calls/active");
export const getCallInvitees=callId=>chatRequest(`/calls/${callId}/invitees`);
// Keep the repository-member helper's historical first argument while routing
// actual requests through the call-scoped eligibility endpoint.
export const getRepositoryCallMembers=(repositoryId,callId=repositoryId)=>getCallInvitees(callId);
