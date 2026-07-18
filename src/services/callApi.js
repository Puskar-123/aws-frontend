import{chatRequest}from"./chatApi";
export const getIceServers=()=>chatRequest("/calls/ice-servers");
export const getCallHistory=()=>chatRequest("/calls/history");
export const getActiveCall=()=>chatRequest("/calls/active");
export const getRepositoryCallMembers=repositoryId=>chatRequest(`/repo/${repositoryId}/members`);
