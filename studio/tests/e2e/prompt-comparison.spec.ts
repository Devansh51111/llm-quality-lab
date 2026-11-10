import {test,expect} from '@playwright/test';
test('recorded prompt pair reuses regression without calling AI',async({page})=>{
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto('/');
 await page.getByText('Real prompt comparison: 8 fictional cases',{exact:true}).click();
 await expect(page.getByLabel('Suite prompt version')).toHaveValue('default');
 await page.getByRole('button',{name:'Load recorded A/B into Regression Tracker (no AI calls)',exact:true}).click();
 await expect(page.getByText('Regression & Differential Analysis',{exact:true})).toBeVisible();
 await expect(page.getByText('37.5% → 50%',{exact:true})).toBeVisible();
 await expect(page.getByText('Consistently Passing: 3',{exact:true})).toBeVisible();
 await expect(page.getByText('Persistent Failures: 4',{exact:true})).toBeVisible();
 expect(posts).toEqual([]);
 await page.screenshot({path:'/downloads/qualitylab-recorded-comparison.png',fullPage:true});
 await page.getByRole('button',{name:'Reports & Export',exact:true}).click();
 await expect(page.getByText('B: Revised prompt | recorded 10 Nov 2026',{exact:false}).first()).toBeVisible();
});
test('fresh suite captures selected system instruction and retains default',async({page})=>{
 const instructions:string[]=[];
 await page.route('**/api/generate',async route=>{instructions.push(route.request().postDataJSON().systemInstruction);await route.fulfill({json:{text:'recorded mock, not live AI',model:'gemini-3.5-flash-lite',latencyMs:1,actualModelVersion:'mock-test-only'}});});
 await page.goto('/');await page.getByText('Real prompt comparison: 8 fictional cases',{exact:true}).click();
 await page.getByLabel('Suite prompt version').selectOption('weak');
 await page.getByRole('button',{name:'Run live suite',exact:true}).click();
 await expect.poll(()=>instructions.length).toBe(8);
 expect(instructions.every(s=>s==='You are a helpful support assistant. Answer the user clearly and briefly.')).toBeTruthy();
 const runs=await page.evaluate(()=>JSON.parse(localStorage.getItem('llm_qualitylab_runs_v1')||'[]'));
 expect(runs[0].runName).toContain('A: Weak');expect(runs[0].notes).toContain(instructions[0]);
});
