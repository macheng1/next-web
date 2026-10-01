export interface RateLimiter {check(key:string):Promise<{allowed:boolean;retryAfterSeconds:number}>}
export class MemoryRateLimiter implements RateLimiter {
 private entries=new Map<string,{start:number;count:number}>();
 constructor(private limit=20,private windowMs=60_000){}
 async check(key:string,now=Date.now()) {
  for(const [k,v] of this.entries)if(now-v.start>=this.windowMs)this.entries.delete(k);
  if(this.entries.size>=10_000 && !this.entries.has(key)) return {allowed:false,retryAfterSeconds:Math.ceil(this.windowMs/1000)};
  const entry=this.entries.get(key) || {start:now,count:0};entry.count++;this.entries.set(key,entry);
  return {allowed:entry.count<=this.limit,retryAfterSeconds:Math.max(1,Math.ceil((entry.start+this.windowMs-now)/1000))};
 }
}
export class SuccessfulSubmissions {
 private entries=new Map<string,number>();
 constructor(private windowMs=600_000){}
 has(key:string,now=Date.now()) {for(const [k,t] of this.entries)if(now-t>=this.windowMs)this.entries.delete(k);return this.entries.has(key);}
 mark(key:string,now=Date.now()) {this.has(key,now);if(this.entries.size>=10_000)this.entries.delete(this.entries.keys().next().value!);this.entries.set(key,now);}
}
