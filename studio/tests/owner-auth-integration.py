import subprocess,os,secrets,time,urllib.request,urllib.error,json,http.cookiejar
secret=secrets.token_hex(24);env={**os.environ,'REQUIRE_OWNER_AUTH':'true','OWNER_PASSWORD':secret,'PORT':'3002'}
p=subprocess.Popen(['node_modules/.bin/tsx','server.ts'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def req(path,body=None,opener=urllib.request,origin=None):
 r=urllib.request.Request('http://127.0.0.1:3002'+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**({'Origin':origin} if origin else {})})
 try:a=opener.open(r) if hasattr(opener,'open') else opener.urlopen(r);return a.status,json.load(a)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
try:
 for _ in range(60):
  try:req('/api/status');break
  except:time.sleep(.1)
 for path in ['/api/generate','/api/judge','/api/conversation']:assert req(path,{'question':'fictional'})[0]==401
 assert req('/api/owner/login',{'password':secret},origin='https://untrusted.invalid')[0]==403
 jar=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
 assert req('/api/owner/login',{'password':secret},op)[0]==200
 assert req('/api/generate',{'question':'fictional'},op)[0]==503
 assert req('/api/conversation',{'turns':[{'role':'user','text':'Hi'}]},op)[0]==503
 assert req('/api/conversation',{'turns':[{'role':'model','text':'Hi'}]},op)[0]==400
 assert req('/api/owner/logout',{},op)[0]==200
 assert req('/api/generate',{'question':'fictional'},op)[0]==401
 print('PASS all inference endpoints401 anonymous; cross-origin403; owner cookie authenticates; no-key503; malformed conversation400; logout invalidates cookie')
finally:p.terminate();p.wait()
