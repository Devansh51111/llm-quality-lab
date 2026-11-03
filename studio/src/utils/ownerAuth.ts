import {createHmac,timingSafeEqual,randomBytes} from 'node:crypto';
export function constantEqual(a:string,b:string){const x=Buffer.from(a);const y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function signSession(password:string,expires:number){const payload=expires+'.'+randomBytes(18).toString('hex');return payload+'.'+createHmac('sha256',password).update(payload).digest('hex');}
export function validSession(token:string,password:string,now=Date.now()){const parts=token.split('.');if(parts.length!==3||!password||!Number.isFinite(Number(parts[0]))||Number(parts[0])<now)return false;return constantEqual(parts[2],createHmac('sha256',password).update(parts.slice(0,2).join('.')).digest('hex'));}
