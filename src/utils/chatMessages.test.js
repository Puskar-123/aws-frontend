import { describe, expect, test } from "vitest";
import { mergeMessages } from "./chatMessages";

const row=(id,content,extra={})=>({_id:id,conversation:"c1",content,createdAt:"2026-01-01T00:00:00Z",...extra});
describe("chat message merging",()=>{
  test("deduplicates saved echoes and replaces optimistic messages",()=>{
    const optimistic=row("pending:client-1","hello",{clientMessageId:"client-1",pending:true});
    const saved=row("saved-1","hello",{clientMessageId:"client-1"});
    expect(mergeMessages([optimistic],[saved])).toEqual([saved]);
    expect(mergeMessages([saved],[saved])).toHaveLength(1);
  });
  test("keeps intentional identical text messages with different identities",()=>{
    expect(mergeMessages([row("m1","same")],[row("m2","same")])).toHaveLength(2);
  });
});
