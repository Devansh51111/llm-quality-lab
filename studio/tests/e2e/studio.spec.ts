import {test,expect} from '@playwright/test';
async function nav(page:any,name:string){if((await page.viewportSize())!.width<1024)await page.getByRole('button',{name:'Toggle navigation menu'}).click();await page.getByRole('navigation').getByRole('button',{name,exact:false}).click();}
for(const width of [320,390,1280])test(`current Studio replay, persistence, nav and reviewer checks at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByRole('heading',{name:'Quality overview'})).toBeVisible();
 await expect(page.getByText('No run yet.')).toBeVisible();await page.getByRole('button',{name:'Replay sample (not live AI)'}).click();await expect(page.getByText('75%',{exact:true}).first()).toBeVisible();await expect(page.getByText('Keyword match only:',{exact:false}).first()).toBeVisible();
 await page.reload();await expect(page.getByText('75%',{exact:true}).first()).toBeVisible();
 await nav(page,'Reviewer checks');await expect(page.getByRole('heading',{name:'Reviewer checks',exact:true})).toBeVisible();await expect(page.getByText('AI-authored fictional cases',{exact:false})).toBeVisible();await expect(page.getByText('Not measured',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Run 4 live checks',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Owner sign-in required');await expect(page.getByRole('status').last()).toContainText('1 errors');
 await nav(page,'AI evidence review');await page.getByRole('button',{name:'Review with AI',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Owner sign-in required');
 await nav(page,'Safety & Guardrails');await page.getByRole('button',{name:'Clean answer',exact:true}).click();
 await nav(page,'Dashboard');await expect(page.getByText('75%',{exact:true}).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();expect(errors).toEqual([]);await page.screenshot({path:`test-results/studio-${width}.png`,fullPage:true});
});
test('all model endpoints deny anonymous and cross-origin access',async({request})=>{
 for(const path of ['generate','judge','conversation','claim-review']){const r=await request.post(`/api/${path}`,{data:{question:'Fictional'}});expect(r.status()).toBe(401);}
 const r=await request.post('/api/owner/login',{headers:{Origin:'https://untrusted.invalid'},data:{password:'irrelevant'}});expect(r.status()).toBe(403);
});
test('reviewer metrics use actual responses and preserve errors (mocked transport, not live AI)',async({page})=>{
 await page.setViewportSize({width:1280,height:900});let calls=0;await page.route('**/api/claim-review',async route=>{calls++;const body=route.request().postDataJSON();if(calls===3)return route.fulfill({status:429,json:{error:'Controlled quota test'}});const evidence=calls===1?body.referenceContext:'';return route.fulfill({json:{claims:[{claim:body.actualOutput,label:calls===1?'supported':'not_in_reference',evidence,reason:'Controlled test response'}],actualModelVersion:'mock-only',latencyMs:1}});});
 await page.goto('/');await nav(page,'Reviewer checks');await page.getByRole('button',{name:'Run 4 live checks',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Controlled quota test');await expect(page.getByRole('status').last()).toContainText('3 attempted, 2 scored, 1 errors, 21 not run');await expect(page.getByText('50.0%',{exact:true}).first()).toBeVisible();expect(calls).toBe(3);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export results and failure evidence'}).click();expect((await download).suggestedFilename()).toBe('qualitylab-reviewer-results.json');
 await page.reload();await nav(page,'Reviewer checks');await expect(page.getByRole('status').last()).toContainText('3 attempted, 2 scored, 1 errors');
});
test('dataset import rejects invalid records without replacing cases; full report exports real snapshot',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await page.goto('/');await nav(page,'Datasets');const dialog=page.waitForEvent('dialog');await page.locator('input[type=file]').last().setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('[{"id":"broken"}]')});const alert=await dialog;expect(alert.message()).toContain('Invalid dataset');await alert.dismiss();await expect(page.getByText('8 Total Test Cases')).toBeVisible();
 await nav(page,'Dashboard');await page.getByRole('button',{name:'Replay sample (not live AI)'}).click();await nav(page,'Reports & Export');const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Download Full JSON Audit'}).click();const file=await (await dl).path();const fs=await import('node:fs');const report=JSON.parse(fs.readFileSync(file!,'utf8'));expect(report.datasetSnapshot.length).toBe(8);expect(report.provenance.runOrigin).toBe('synthetic_sample_replay');
});
test('published reviewer snapshot loads with no model call and recomputed metrics',async({page})=>{
 let calls=0;await page.route('**/api/claim-review',async route=>{calls++;return route.abort();});await page.setViewportSize({width:1280,height:900});await page.goto('/');await nav(page,'Reviewer checks');await page.getByRole('button',{name:'View recorded 24-case result (no AI call)'}).click();await expect(page.getByRole('status').last()).toContainText('24 attempted, 24 scored, 0 errors, 0 not run');await expect(page.getByText('79.2%',{exact:true}).first()).toBeVisible();await expect(page.getByText('Published live snapshot from 2026-11-03',{exact:false})).toBeVisible();expect(calls).toBe(0);
});
