export interface ConversationTurn {role:'user'|'model';text:string}
export function validateConversation(turns:unknown):turns is ConversationTurn[]{return Array.isArray(turns)&&turns.length>0&&turns.length<=15&&turns.length%2===1&&turns.every((t,i)=>t&&t.role===(i%2===0?'user':'model')&&typeof t.text==='string'&&!!t.text.trim()&&t.text.length<=20000);}
export function providerContents(turns:ConversationTurn[]){return turns.map(t=>({role:t.role,parts:[{text:t.text}]}));}
