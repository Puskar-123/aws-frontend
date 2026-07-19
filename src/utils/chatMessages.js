export const normalizeMessageId=value=>String(value?.conversation?._id||value?.conversation?.id||value?.conversation||value||"");
export const messageId=message=>String(message?._id||message?.id||message?.clientMessageId||message?.temporaryId||"");
export function mergeMessages(currentMessages=[],incomingMessages=[]){
  const merged=new Map();
  for(const message of[...currentMessages,...(Array.isArray(incomingMessages)?incomingMessages:[incomingMessages])]){
    const key=messageId(message);if(!key)continue;
    const clientKey=message.clientMessageId&&String(message.clientMessageId);
    if(clientKey){for(const[existingKey,existing]of merged)if(String(existing.clientMessageId||"")===clientKey&&existingKey!==key)merged.delete(existingKey);}
    merged.set(key,{...merged.get(key),...message});
  }
  return[...merged.values()].sort((a,b)=>{const sequenceA=Number(a.sequence),sequenceB=Number(b.sequence);if(Number.isFinite(sequenceA)&&Number.isFinite(sequenceB)&&sequenceA!==sequenceB)return sequenceA-sequenceB;return new Date(a.createdAt||0).getTime()-new Date(b.createdAt||0).getTime();});
}
