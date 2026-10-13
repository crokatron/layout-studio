from pathlib import Path

import base64

from shared_build import shared

root=Path(__file__).resolve().parent

source=measurement=None

def inline(p):return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

icon_script='/*\n'+(root/'icon-license.txt').read_text(encoding='utf-8').replace('*/','* /')+'\n*/\n'+(root/'device-icons.js').read_text(encoding='utf-8').replace('__ICON_CATALOG__',(root/'icon-catalog.json').read_text(encoding='utf-8'))

html=(root/'template.html').read_text(encoding='utf-8')

html=html.replace('__DISPLAY_STYLE__',(root/'display-mode.css').read_text(encoding='utf-8')).replace('__DISPLAY_SCRIPT__',(root/'display-mode.js').read_text(encoding='utf-8'))

html=html.replace('__EXTRA_STYLE__','\n'.join((root/f).read_text(encoding='utf-8') for f in ('mobile.css','map-controls.css','automations.css','device-placement.css','device-icons.css','device-sheet.css','buttons.css'))).replace('__AUTOMATIONS_HTML__',(root/'automations.html').read_text(encoding='utf-8')).replace('__PLACEMENT_HTML__',(root/'device-placement.html').read_text(encoding='utf-8')).replace('__ICON_HTML__',(root/'device-icons.html').read_text(encoding='utf-8')).replace('__DEVICE_SHEET_HTML__',(root/'device-sheet.html').read_text(encoding='utf-8')).replace('__BUTTONS_HTML__',(root/'buttons.html').read_text(encoding='utf-8')).replace('__BUTTONS_HTML__',(root/'buttons.html').read_text(encoding='utf-8'))

for key,value in [('__SOURCE_IMAGE__',inline(source)),('__MEASUREMENT_IMAGE__',inline(measurement)),('__MODEL_SCRIPT__',shared()+'\n'+(root/'room-environment.js').read_text(encoding='utf-8')+'\n'+(root/'furniture-symbols.js').read_text(encoding='utf-8')+'\n'+icon_script+'\n'+(root/'model.js').read_text(encoding='utf-8')+'\n'+(root/'constraints.js').read_text(encoding='utf-8')+'\n'+(root/'placement-geometry.js').read_text(encoding='utf-8')),('__APP_SCRIPT__',(root/'app.js').read_text(encoding='utf-8').replace('/*EDITOR_FUNCTIONS*/',(root/'editor-functions.js').read_text(encoding='utf-8')+'\n'+(root/'group-functions.js').read_text(encoding='utf-8')+'\n'+(root/'structure-functions.js').read_text(encoding='utf-8')).replace('/*EXTRA_FUNCTIONS*/','\n'.join((root/f).read_text(encoding='utf-8') for f in ('automation-model.js','action-library.js','direct-dimensions.js','wall-pairs.js','automations.js','mobile.js','device-placement.js','device-icon-picker.js','device-sheet.js','buttons.js','map-controls.js','room-tiles.js'))).replace('/*HA_FUNCTIONS*/',(root/'device-room-moves.js').read_text(encoding='utf-8')+'\n'+(root/'ha-devices.js').read_text(encoding='utf-8')))]:

    html=html.replace(key,value)

out=root/'index.html'

out.write_text(html,encoding='utf-8')

print(out)

print('Self-contained HTML bytes:',out.stat().st_size)

