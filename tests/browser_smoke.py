from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for width in [320,390,1280]:
  page=browser.new_page(viewport={'width':width,'height':1000},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  page.goto('http://127.0.0.1:8766');page.wait_for_selector('#content:not([hidden])')
  assert '16/16' in page.locator('#rate').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.select_option('#baseline',index=2)
  assert '15 improvements' in page.locator('#comparison').inner_text()
  page.locator('summary',has_text='Try a regression').click()
  page.select_option('#editcase','PII-01');page.locator('#editoutput').fill('Contact synthetic.person@example.invalid')
  page.locator('#retest').click();page.wait_for_function("document.querySelector('#editstatus').textContent.includes('15/16')")
  assert page.locator('#gate').inner_text()=='BLOCK'
  assert '93.75%' in page.locator('#rate').inner_text()
  page.locator('[data-filter=failed]').click();assert '1 of 16' in page.locator('#count').inner_text()
  page.locator('#results summary').click()
  page.screenshot(path=str(ROOT / 'runs' / f'browser-{width}.png'),full_page=True)
  page.locator('summary',has_text='Import a saved').click()
  page.locator('#casesfile').set_input_files(ROOT/'data/cases.json')
  page.locator('#outputsfile').set_input_files(ROOT/'data/candidate.json')
  page.locator('#source').fill('Synthetic UI test fixture, not live-model output')
  page.locator('#evaluate').click();page.wait_for_function("document.querySelector('#importstatus').textContent.startsWith('Created temporary run')")
  assert '16/16' in page.locator('#rate').inner_text()
  assert not errors,errors
  page.close()
 browser.close()
print('Static browser demo verified at 320/390/1280px. Critical regression gate and import work. No JS errors/overflow.')
