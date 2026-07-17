export const normalizeId=value=>{if(!value)return null;if(typeof value==="string")return value;if(value._id)return String(value._id);if(value.id)return String(value.id);return String(value);};
const plural=(count,word)=>`${count} ${word}${count===1?"":"s"}`;
const participantOtherThan=(conversation,currentUserId)=>(conversation?.participants||[]).find(user=>normalizeId(user)!==normalizeId(currentUserId));
const lastSeen=user=>user?.lastSeenAt?`Last seen ${new Date(user.lastSeenAt).toLocaleString()}`:"Offline";

export function getConversationHeaderMeta(conversation,{conversationPresence={},userPresence={},currentUserId}={}){
  if(!conversation)return{title:"Conversation",subtitle:"",memberCount:0,onlineCount:0,contextType:"unknown"};
  conversationPresence||={};userPresence||={};const counts=conversationPresence[String(conversation._id)]||{},memberCount=Number(counts.memberCount??conversation.memberCount??conversation.participants?.length??0),onlineCount=Number(counts.onlineCount??0),other=participantOtherThan(conversation,currentUserId),otherOnline=Boolean(userPresence[normalizeId(other)]?.online);
  if(conversation.type==="repository")return{title:conversation.title||"General",subtitle:`Repository chat · ${plural(memberCount,"member")} · ${onlineCount} online`,memberCount,onlineCount,contextType:"repository"};
  if(conversation.type==="issue"){const issue=conversation.issue||{};return{title:issue.number?`Issue #${issue.number}${issue.title?` — ${issue.title}`:""}`:conversation.title||"Issue chat",subtitle:`Issue chat · ${plural(memberCount,"member")} · ${onlineCount} online`,memberCount,onlineCount,contextType:"issue"};}
  if(conversation.type==="pull_request"){const pull=conversation.pullRequest||{};return{title:pull.number?`PR #${pull.number}${pull.title?` — ${pull.title}`:""}`:conversation.title||"Pull-request chat",subtitle:`Pull-request chat · ${plural(memberCount,"member")} · ${onlineCount} online`,memberCount,onlineCount,contextType:"pull_request"};}
  if(conversation.type==="mentor")return{title:other?`Mentor Chat with ${other.name||other.username}`:conversation.title||"Mentor Chat",subtitle:`Mentor session · ${onlineCount>1||otherOnline?"Online":"Offline"}`,memberCount,onlineCount,contextType:"mentor"};
  return{title:other?.name||other?.username||conversation.title||"Direct message",subtitle:otherOnline?"Online":lastSeen(other),memberCount,onlineCount,contextType:"direct"};
}

export const connectionLabel=state=>({connecting:"Connecting…",connected:"Connected",reconnecting:"Reconnecting…",offline:"Offline",authentication_error:"Session expired"}[state]||"Offline");
